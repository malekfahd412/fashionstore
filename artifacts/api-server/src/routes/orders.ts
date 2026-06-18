import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productVariantsTable, productsTable, productImagesTable, usersTable, notificationsTable, couponsTable, paymentsTable, userAddressesTable, storeSettingsTable, cartItemsTable } from "@workspace/db";
import { eq, and, SQL, desc, inArray, gt, isNull, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateOrderBody, GetOrderParams, UpdateOrderStatusParams, UpdateOrderStatusBody, ListOrdersQueryParams } from "@workspace/api-zod";
import { auditLog } from "../lib/audit";
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendVendorNewOrderEmail, sendLowStockAlertEmail } from "../lib/email";
import {
  sendOrderPlacedWhatsApp,
  sendOrderShippedWhatsApp,
  sendOrderDeliveredWhatsApp,
} from "../lib/whatsapp";
import { markCartRecovered } from "./abandoned-carts";

const router: IRouter = Router();

// ── Batch-enrichment for orders (eliminates N+1) ──────────────────────────────
async function batchEnrichOrders(orders: (typeof ordersTable.$inferSelect)[]) {
  if (orders.length === 0) return [];
  const orderIds = orders.map(o => o.id);
  const userIds = [...new Set(orders.map(o => o.userId))];

  const [allItems, allUsers] = await Promise.all([
    db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds)),
  ]);

  const variantIds = [...new Set(allItems.map(i => i.productVariantId))];
  const variants = variantIds.length
    ? await db.select().from(productVariantsTable).where(inArray(productVariantsTable.id, variantIds))
    : [];

  const productIds = [...new Set(variants.map(v => v.productId))];
  const [products, images] = productIds.length
    ? await Promise.all([
        db.select({ id: productsTable.id, nameEn: productsTable.nameEn, nameAr: productsTable.nameAr, vendorId: productsTable.vendorId }).from(productsTable).where(inArray(productsTable.id, productIds)),
        db.select().from(productImagesTable).where(and(inArray(productImagesTable.productId, productIds), eq(productImagesTable.isPrimary, true))),
      ])
    : [[], []];

  // Fetch latest payment record per order to derive paymentStatus
  const allPayments = orderIds.length
    ? await db.select({ orderId: paymentsTable.orderId, status: paymentsTable.status, createdAt: paymentsTable.createdAt })
        .from(paymentsTable)
        .where(inArray(paymentsTable.orderId, orderIds))
        .orderBy(desc(paymentsTable.createdAt))
    : [];

  // Keep only the most recent payment per order
  const latestPaymentByOrder = new Map<number, string>();
  for (const p of allPayments) {
    if (!latestPaymentByOrder.has(p.orderId)) latestPaymentByOrder.set(p.orderId, p.status);
  }

  const variantMap = new Map(variants.map(v => [v.id, v]));
  const productMap = new Map(products.map(p => [p.id, p]));
  const imageMap = new Map(images.map(img => [img.productId, img.imageUrl]));
  const userMap = new Map(allUsers.map(u => [u.id, u.name]));
  const itemsByOrder = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
    itemsByOrder.get(item.orderId)!.push(item);
  }

  return orders.map(order => {
    let paymentStatus: string;
    if (order.paymentMethod === "cash_on_delivery") {
      paymentStatus = "cod";
    } else {
      const ps = latestPaymentByOrder.get(order.id);
      paymentStatus = ps === "paid" ? "paid" : ps === "failed" ? "failed" : "pending";
    }
    return {
    ...order,
    totalPrice: Number(order.totalPrice),
    discount: order.discount ? Number(order.discount) : null,
    userName: userMap.get(order.userId) ?? "",
    paymentStatus,
    items: (itemsByOrder.get(order.id) ?? []).map(item => {
      const variant = variantMap.get(item.productVariantId);
      const product = variant ? productMap.get(variant.productId) : null;
      return {
        id: item.id,
        productId: product?.id ?? 0,
        productNameEn: product?.nameEn ?? "",
        productNameAr: product?.nameAr ?? "",
        nameEn: product?.nameEn ?? "",
        nameAr: product?.nameAr ?? "",
        vendorId: product?.vendorId ?? null,
        imageUrl: product ? (imageMap.get(product.id) ?? null) : null,
        color: variant?.color ?? null,
        size: variant?.size ?? null,
        quantity: item.quantity,
        price: Number(item.price),
      };
    }),
  };
  });
}

async function enrichOrder(order: typeof ordersTable.$inferSelect) {
  const [enriched] = await batchEnrichOrders([order]);
  return enriched;
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  const { status, userId, vendorId, page = 1, limit = 20 } = query.success ? query.data : {};
  const conditions: SQL[] = [];
  if (req.user!.role === "customer") conditions.push(eq(ordersTable.userId, req.user!.id));
  else if (userId) conditions.push(eq(ordersTable.userId, Number(userId)));
  if (status) conditions.push(eq(ordersTable.status, status));

  // Vendor filter: only return orders that contain at least one item from that vendor's products
  const isVendor = req.user!.role === "vendor";
  const effectiveVendorId = isVendor ? req.user!.id : (vendorId ? Number(vendorId) : undefined);
  
  if (effectiveVendorId) {
    const vendorOrderIds = await db
      .selectDistinct({ orderId: orderItemsTable.orderId })
      .from(orderItemsTable)
      .innerJoin(productVariantsTable, eq(orderItemsTable.productVariantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(eq(productsTable.vendorId, effectiveVendorId));
    const ids = vendorOrderIds.map(r => r.orderId);
    if (ids.length === 0) {
      res.json({ orders: [], total: 0, page: Number(page), limit: Number(limit) });
      return;
    }
    conditions.push(inArray(ordersTable.id, ids));
  }

  const [orders, total] = await Promise.all([
    db.select().from(ordersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(Math.min(Number(limit), 100))
      .offset((Number(page) - 1) * Math.min(Number(limit), 100)),
    db.$count(ordersTable, conditions.length > 0 ? and(...conditions) : undefined),
  ]);
  res.json({ orders: await batchEnrichOrders(orders), total, page: Number(page), limit: Number(limit) });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  
  if (req.user!.role === "customer" && order.userId !== req.user!.id) { 
    res.status(403).json({ error: "Forbidden" }); return; 
  }
  
  if (req.user!.role === "vendor") {
    const vendorItems = await db.select({ id: orderItemsTable.id })
      .from(orderItemsTable)
      .innerJoin(productVariantsTable, eq(orderItemsTable.productVariantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(and(eq(orderItemsTable.orderId, order.id), eq(productsTable.vendorId, req.user!.id)))
      .limit(1);
    
    if (vendorItems.length === 0) {
      res.status(403).json({ error: "Forbidden: You don't have products in this order" });
      return;
    }
  }

  res.json(await enrichOrder(order));
});

// ── Create order with full ACID transaction ───────────────────────────────────
router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { paymentMethod, couponCode, items, shippingName, shippingAddress, shippingCity, shippingPhone } = parsed.data;
  if (!items || items.length === 0) { res.status(400).json({ error: "Order must contain at least one item" }); return; }
  if (items.length > 20) { res.status(400).json({ error: "Order cannot exceed 20 distinct items" }); return; }

  let order!: typeof ordersTable.$inferSelect;

  try {
    order = await db.transaction(async (tx) => {
      // ── Step 1: Server-side price + stock lookup (prevents price tampering) ──
      const lineItems: { productVariantId: number; quantity: number; unitPrice: number }[] = [];
      for (const item of items) {
        // Join variant → product to get authoritative price in one query
        const [row] = await tx.select({
          stockQuantity: productVariantsTable.stockQuantity,
          price: productsTable.price,
          salePrice: productsTable.salePrice,
          active: productsTable.active,
        })
          .from(productVariantsTable)
          .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
          .where(eq(productVariantsTable.id, item.productVariantId));

        if (!row) throw Object.assign(new Error(`Product variant ${item.productVariantId} not found`), { status: 400 });
        if (!row.active) throw Object.assign(new Error(`Product variant ${item.productVariantId} is not available`), { status: 400 });
        if (row.stockQuantity < item.quantity) throw Object.assign(new Error(`Insufficient stock for variant ${item.productVariantId} (available: ${row.stockQuantity})`), { status: 409 });

        // Use server-authoritative price (sale price if set, otherwise list price)
        const unitPrice = Number(row.salePrice ?? row.price);
        lineItems.push({ productVariantId: item.productVariantId, quantity: item.quantity, unitPrice });
      }

      // ── Step 2: Deduct stock ──────────────────────────────────────────────────
      for (const li of lineItems) {
        const [v] = await tx.select({ stockQuantity: productVariantsTable.stockQuantity })
          .from(productVariantsTable).where(eq(productVariantsTable.id, li.productVariantId));
        await tx.update(productVariantsTable)
          .set({ stockQuantity: v!.stockQuantity - li.quantity })
          .where(eq(productVariantsTable.id, li.productVariantId));
      }

      // ── Step 3: Validate and apply coupon ─────────────────────────────────────
      const subtotal = lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0);
      let discount = 0;
      if (couponCode) {
        const [coupon] = await tx.select().from(couponsTable).where(
          and(eq(couponsTable.code, couponCode), eq(couponsTable.active, true))
        );
        if (!coupon) throw Object.assign(new Error("Invalid coupon code"), { status: 400 });
        const now = new Date();
        if (coupon.startDate && coupon.startDate > now) throw Object.assign(new Error("Coupon not yet active"), { status: 400 });
        if (coupon.endDate && coupon.endDate < now) throw Object.assign(new Error("Coupon has expired"), { status: 400 });
        if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) throw Object.assign(new Error("Coupon usage limit reached"), { status: 400 });

        // Minimum order amount check
        const minOrderAmount = coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : null;
        if (minOrderAmount !== null && subtotal < minOrderAmount) {
          throw Object.assign(new Error(`Minimum order amount of ${minOrderAmount.toFixed(2)} EGP required for this coupon`), { status: 400 });
        }

        // One-use-per-user check
        if (coupon.oneUsePerUser) {
          const [prevUse] = await tx.select({ id: ordersTable.id })
            .from(ordersTable)
            .where(and(eq(ordersTable.userId, req.user!.id), eq(ordersTable.couponCode, couponCode)))
            .limit(1);
          if (prevUse) throw Object.assign(new Error("You have already used this coupon"), { status: 400 });
        }

        // Calculate discount, then cap at maxDiscountAmount if set
        let rawDiscount = coupon.discountType === "percentage"
          ? (subtotal * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);
        const maxDiscountAmount = coupon.maxDiscountAmount != null ? Number(coupon.maxDiscountAmount) : null;
        if (maxDiscountAmount !== null) rawDiscount = Math.min(rawDiscount, maxDiscountAmount);
        discount = Math.min(rawDiscount, subtotal);

        await tx.update(couponsTable).set({ usageCount: coupon.usageCount + 1 }).where(eq(couponsTable.id, coupon.id));
      }

      // ── Step 4: Insert order + line items ────────────────────────────────────
      const totalPrice = Math.max(0, subtotal - discount);
      const [newOrder] = await tx.insert(ordersTable).values({
        userId: req.user!.id,
        totalPrice: String(totalPrice),
        paymentMethod,
        couponCode: couponCode ?? null,
        discount: String(discount),
        shippingName: shippingName ?? null,
        shippingAddress: shippingAddress ?? null,
        shippingCity: shippingCity ?? null,
        shippingPhone: shippingPhone ?? null,
        status: "new",
      }).returning();

      await tx.insert(orderItemsTable).values(lineItems.map(li => ({
        orderId: newOrder.id,
        productVariantId: li.productVariantId,
        quantity: li.quantity,
        price: String(li.unitPrice),          // server-authoritative price stored
      })));

      // ── Step 5: Notification ──────────────────────────────────────────────────
      await tx.insert(notificationsTable).values({
        userId: req.user!.id,
        title: "Order Placed",
        message: `Your order #${newOrder.id} has been placed successfully. Total: ${totalPrice.toFixed(2)} EGP`,
      });

      // ── Step 6: Clear cart after order ───────────────────────────────────────
      await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user!.id));

      return newOrder;
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = (err as Error).message ?? "Order creation failed";
    res.status(status).json({ error: message }); return;
  }

  const enriched = await enrichOrder(order);
  res.status(201).json(enriched);

  // Send order confirmation + vendor notifications (non-blocking, after response sent)
  const [customer] = await db.select({ email: usersTable.email, name: usersTable.name, emailPreferences: usersTable.emailPreferences })
    .from(usersTable).where(eq(usersTable.id, order.userId));
  if (customer) {
    type EnrichedItem = { nameEn: string; vendorId: number | null; quantity: number; price: number };
    const emailItems = (enriched.items as EnrichedItem[]).map(i => ({
      nameEn: i.nameEn, quantity: i.quantity, price: i.price,
    }));
    // Respect customer email preferences — orderUpdates defaults to true
    const wantsOrderUpdates = customer.emailPreferences?.orderUpdates !== false;
    if (wantsOrderUpdates) {
      sendOrderConfirmationEmail(customer.email, customer.name, order.id, Number(order.totalPrice), emailItems).catch(() => {});
    }

    // WhatsApp order placed notification (non-blocking)
    void db.select({ phone: userAddressesTable.phone }).from(userAddressesTable)
      .where(eq(userAddressesTable.userId, order.userId)).limit(1)
      .then(([addr]) => sendOrderPlacedWhatsApp(addr?.phone, order.id, Number(order.totalPrice)));

    // Mark any abandoned cart as recovered
    void markCartRecovered(order.userId);

    // Notify each vendor whose products are in this order (vendor preference not applicable here)
    const vendorIds = [...new Set((enriched.items as EnrichedItem[]).map(i => i.vendorId).filter((v): v is number => v !== null))];
    for (const vid of vendorIds) {
      const [vendor] = await db.select({ email: usersTable.email, name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, vid));
      if (vendor) {
        const vendorItems = (enriched.items as EnrichedItem[]).filter(i => i.vendorId === vid);
        sendVendorNewOrderEmail(vendor.email, vendor.name, order.id, vendorItems.length, Number(order.totalPrice)).catch(() => {});
      }
    }
  }

  // Low-stock alert to vendors (non-blocking, after response sent)
  void (async () => {
    const variantIds = parsed.data.items.map(i => i.productVariantId);
    const [thresholdSetting] = await db
      .select({ value: storeSettingsTable.value })
      .from(storeSettingsTable)
      .where(eq(storeSettingsTable.key, "low_stock_threshold"))
      .limit(1);
    const threshold = Number(thresholdSetting?.value ?? "5");

    const lowVariants = await db
      .select({
        stock: productVariantsTable.stockQuantity,
        color: productVariantsTable.color,
        size: productVariantsTable.size,
        productName: productsTable.nameEn,
        vendorId: productsTable.vendorId,
      })
      .from(productVariantsTable)
      .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
      .where(and(inArray(productVariantsTable.id, variantIds), lte(productVariantsTable.stockQuantity, threshold)));

    if (lowVariants.length === 0) return;

    const byVendor = new Map<number, typeof lowVariants>();
    for (const v of lowVariants) {
      if (!byVendor.has(v.vendorId)) byVendor.set(v.vendorId, []);
      byVendor.get(v.vendorId)!.push(v);
    }

    for (const [vid, items] of byVendor) {
      const [vendor] = await db
        .select({ email: usersTable.email, name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, vid)).limit(1);
      if (vendor) {
        await sendLowStockAlertEmail(vendor.email, vendor.name, items.map(v => ({
          productName: v.productName,
          color: v.color,
          size: v.size,
          stock: Number(v.stock),
        })));
      }
    }
  })();
});

// ── Update order status ───────────────────────────────────────────────────────
router.patch("/orders/:id", requireAuth, requireRole("admin", "vendor"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [before] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!before) { res.status(404).json({ error: "Order not found" }); return; }

  // Vendor isolation for status updates
  if (req.user!.role === "vendor") {
    const vendorItems = await db.select({ id: orderItemsTable.id })
      .from(orderItemsTable)
      .innerJoin(productVariantsTable, eq(orderItemsTable.productVariantId, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
      .where(and(eq(orderItemsTable.orderId, before.id), eq(productsTable.vendorId, req.user!.id)))
      .limit(1);
    
    if (vendorItems.length === 0) {
      res.status(403).json({ error: "Forbidden: You can only update orders containing your products" });
      return;
    }
  }

  const newStatus = parsed.data.status;
  const { trackingNote } = req.body as { trackingNote?: string };
  const statusTimestamps: Partial<typeof ordersTable.$inferInsert> = {};
  if (newStatus === "paid") statusTimestamps.paidAt = new Date();
  else if (newStatus === "processing") statusTimestamps.processingAt = new Date();
  else if (newStatus === "packed") statusTimestamps.packedAt = new Date();
  else if (newStatus === "shipped") statusTimestamps.shippedAt = new Date();
  else if (newStatus === "out_for_delivery") statusTimestamps.outForDeliveryAt = new Date();
  else if (newStatus === "delivered") statusTimestamps.deliveredAt = new Date();

  const [order] = await db.update(ordersTable)
    .set({ status: newStatus, ...statusTimestamps, ...(trackingNote !== undefined ? { trackingNote } : {}) })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  await Promise.all([
    db.insert(notificationsTable).values({
      userId: order.userId,
      title: "Order Status Updated",
      message: `Your order #${order.id} status changed to: ${parsed.data.status}`,
    }),
    auditLog(req, "UPDATE", "order", order.id, { status: before.status }, { status: parsed.data.status }),
  ]);

  res.json(await enrichOrder(order));

  // Send status update email (non-blocking, after response sent)
  const [customer] = await db.select({ email: usersTable.email, name: usersTable.name, emailPreferences: usersTable.emailPreferences })
    .from(usersTable).where(eq(usersTable.id, order.userId));
  if (customer) {
    // Respect customer email preferences — orderUpdates defaults to true
    const wantsOrderUpdates = customer.emailPreferences?.orderUpdates !== false;
    if (wantsOrderUpdates) {
      sendOrderStatusEmail(customer.email, customer.name, order.id, parsed.data.status).catch(() => {});
    }

    // WhatsApp status notifications (non-blocking)
    if (parsed.data.status === "shipped" || parsed.data.status === "delivered") {
      void db.select({ phone: userAddressesTable.phone }).from(userAddressesTable)
        .where(eq(userAddressesTable.userId, order.userId)).limit(1)
        .then(([addr]) => {
          if (parsed.data.status === "shipped") return sendOrderShippedWhatsApp(addr?.phone, order.id, order.trackingNote);
          return sendOrderDeliveredWhatsApp(addr?.phone, order.id);
        });
    }
  }
});

// ── PDF Invoice ─────────────────────────────────────────────────────────────
router.get("/orders/:id/invoice", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (req.user!.role !== "admin" && order.userId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [customer] = await db.select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, order.userId));

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
  const variantIds = items.map(i => i.productVariantId);
  const variants = variantIds.length
    ? await db.select({ id: productVariantsTable.id, color: productVariantsTable.color, size: productVariantsTable.size, productId: productVariantsTable.productId })
        .from(productVariantsTable).where(inArray(productVariantsTable.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map(v => v.productId))];
  const products = productIds.length
    ? await db.select({ id: productsTable.id, nameEn: productsTable.nameEn })
        .from(productsTable).where(inArray(productsTable.id, productIds))
    : [];

  const shippingAddr = [order.shippingName, order.shippingAddress, order.shippingCity]
    .filter(Boolean).join(", ");

  const variantMap = new Map(variants.map(v => [v.id, v]));
  const productMap = new Map(products.map(p => [p.id, p]));

  const enrichedItems = items.map(item => {
    const v = variantMap.get(item.productVariantId);
    const p = v ? productMap.get(v.productId) : null;
    return {
      name: p?.nameEn ?? `Item #${item.productVariantId}`,
      color: v?.color ?? null,
      size: v?.size ?? null,
      quantity: item.quantity,
      price: Number(item.price),
      total: Number(item.price) * item.quantity,
    };
  });

  const subtotal = enrichedItems.reduce((s, i) => s + i.total, 0);
  const shippingFee = 0;
  const discount = Number(order.discount ?? 0);
  const grandTotal = Number(order.totalPrice);

  // Build PDF with pdfkit
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(28).font("Helvetica-Bold").text("Velora", 50, 50);
  doc.fontSize(10).font("Helvetica").fillColor("#666").text("Premium Fashion", 50, 85);
  doc.fillColor("#000").fontSize(20).font("Helvetica-Bold").text("INVOICE", 400, 50, { align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor("#444");
  doc.text(`Invoice #${order.id}`, 400, 78, { align: "right" });
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-GB")}`, 400, 92, { align: "right" });
  doc.text(`Status: ${order.status.toUpperCase()}`, 400, 106, { align: "right" });

  doc.moveTo(50, 130).lineTo(545, 130).strokeColor("#d4af37").lineWidth(2).stroke();

  // Bill To
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#888").text("BILL TO", 50, 148);
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#000").text(customer?.name ?? "Customer", 50, 162);
  doc.fontSize(10).font("Helvetica").fillColor("#444").text(customer?.email ?? "", 50, 176);
  if (shippingAddr) doc.text(shippingAddr, 50, 190, { width: 240 });

  // Payment Method
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#888").text("PAYMENT", 400, 148);
  doc.fontSize(10).font("Helvetica").fillColor("#444")
    .text(order.paymentMethod === "cod" ? "Cash on Delivery" : (order.paymentMethod ?? "—"), 400, 162);

  const tableTop = shippingAddr ? 240 : 210;
  doc.moveTo(50, tableTop).lineTo(545, tableTop).strokeColor("#eee").lineWidth(1).stroke();

  // Table header
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#888");
  doc.text("ITEM", 50, tableTop + 10);
  doc.text("QTY", 350, tableTop + 10);
  doc.text("PRICE", 400, tableTop + 10);
  doc.text("TOTAL", 470, tableTop + 10, { align: "right", width: 75 });

  doc.moveTo(50, tableTop + 26).lineTo(545, tableTop + 26).strokeColor("#eee").lineWidth(1).stroke();

  let y = tableTop + 36;
  for (const item of enrichedItems) {
    const desc2 = [item.color, item.size].filter(Boolean).join(" / ");
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#000").text(item.name, 50, y, { width: 290 });
    if (desc2) doc.fontSize(9).font("Helvetica").fillColor("#888").text(desc2, 50, y + 13, { width: 290 });
    doc.fontSize(10).font("Helvetica").fillColor("#000");
    doc.text(String(item.quantity), 350, y);
    doc.text(`${item.price.toLocaleString()} EGP`, 400, y);
    doc.text(`${item.total.toLocaleString()} EGP`, 470, y, { align: "right", width: 75 });
    y += desc2 ? 35 : 24;
    doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#f5f5f5").lineWidth(1).stroke();
  }

  // Totals
  y += 10;
  const totalsX = 380;
  doc.fontSize(10).font("Helvetica").fillColor("#444");
  doc.text("Subtotal:", totalsX, y); doc.text(`${subtotal.toLocaleString()} EGP`, 470, y, { align: "right", width: 75 });
  y += 18;
  if (shippingFee > 0) {
    doc.text("Shipping:", totalsX, y); doc.text(`${shippingFee.toLocaleString()} EGP`, 470, y, { align: "right", width: 75 });
    y += 18;
  }
  if (discount > 0) {
    doc.fillColor("#16a34a").text("Discount:", totalsX, y);
    doc.text(`-${discount.toLocaleString()} EGP`, 470, y, { align: "right", width: 75 });
    y += 18;
  }
  doc.moveTo(totalsX, y).lineTo(545, y).strokeColor("#000").lineWidth(1).stroke();
  y += 8;
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#000");
  doc.text("Total:", totalsX, y); doc.text(`${grandTotal.toLocaleString()} EGP`, 470, y, { align: "right", width: 75 });

  // Footer
  doc.fontSize(9).font("Helvetica").fillColor("#aaa")
    .text("Thank you for shopping with Velora.", 50, 760, { align: "center", width: 495 });

  doc.end();
});

export default router;
