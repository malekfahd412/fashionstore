import { Router, type IRouter } from "express";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type Part } from "@google/generative-ai";
import { db, productsTable, productVariantsTable, productImagesTable, categoriesTable, ordersTable, orderItemsTable, faqsTable } from "@workspace/db";
import { eq, and, or, ilike, desc, inArray, asc } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are Velora Concierge — the exclusive AI assistant for Velora, a high-end luxury fashion boutique.

Your capabilities:
1. PRODUCT SEARCH: Help customers find products using natural language (e.g. "show me red dresses under 500 EGP")
2. FASHION STYLIST: Suggest outfit combinations using Velora's catalog
3. SIZE ASSISTANT: Advise on sizing based on product variants
4. ORDER ASSISTANT: Track orders for authenticated customers (you will receive their order data)
5. FAQ ASSISTANT: Answer questions about shipping, returns, payments, coupons, and support

STRICT RULES:
- ONLY discuss Velora store topics (products, orders, shipping, returns, payments, sizing, style advice)
- Politely decline ALL unrelated questions (politics, coding help, general knowledge, etc.)
- NEVER reveal admin data, other customers' orders, or internal pricing strategies
- NEVER make up products — only reference real products from the catalog data provided
- Always respond in the same language the customer uses (Arabic or English)
- Keep responses concise and elegant — luxury brand voice
- When referencing products, include their ID so the frontend can link to them
- Prices are in EGP (Egyptian Pounds)

BRAND VOICE:
- Sophisticated, warm, never pushy
- Use refined language ("curated selection", "crafted for", "we'd be delighted")
- Brief, helpful answers — quality over quantity

When you have product search results, format them as JSON embedded in your response like:
<products>[{"id":1,"name":"...","price":...,"imageUrl":"..."}]</products>

When you want to suggest navigation, use:
<navigate>/products?search=...</navigate>`;

async function getProductContext(query: string) {
  const products = await db.select({
    id: productsTable.id,
    nameEn: productsTable.nameEn,
    nameAr: productsTable.nameAr,
    descriptionEn: productsTable.descriptionEn,
    price: productsTable.price,
    salePrice: productsTable.salePrice,
    categoryId: productsTable.categoryId,
    featured: productsTable.featured,
  })
    .from(productsTable)
    .where(and(eq(productsTable.active, true), or(ilike(productsTable.nameEn, `%${query}%`), ilike(productsTable.nameAr, `%${query}%`))))
    .limit(8);

  if (products.length === 0) {
    const allActive = await db.select({
      id: productsTable.id,
      nameEn: productsTable.nameEn,
      nameAr: productsTable.nameAr,
      price: productsTable.price,
      salePrice: productsTable.salePrice,
      categoryId: productsTable.categoryId,
    })
      .from(productsTable)
      .where(eq(productsTable.active, true))
      .orderBy(desc(productsTable.createdAt))
      .limit(12);
    return allActive;
  }
  return products;
}

async function getFaqContext() {
  return db.select({
    category: faqsTable.category,
    questionEn: faqsTable.questionEn,
    answerEn: faqsTable.answerEn,
  })
    .from(faqsTable)
    .where(eq(faqsTable.active, true))
    .orderBy(asc(faqsTable.sortOrder))
    .limit(30);
}

async function getUserOrders(userId: number) {
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  if (orders.length === 0) return [];

  const orderIds = orders.map(o => o.id);
  const items = await db.select().from(orderItemsTable)
    .where(inArray(orderItemsTable.orderId, orderIds));

  return orders.map(o => ({
    id: o.id,
    status: o.status,
    total: Number(o.totalPrice),
    createdAt: o.createdAt,
    itemCount: items.filter(i => i.orderId === o.id).length,
  }));
}

async function searchProductsByCategory(categoryHint: string) {
  const categories = await db.select({ id: categoriesTable.id, nameEn: categoriesTable.nameEn })
    .from(categoriesTable)
    .where(ilike(categoriesTable.nameEn, `%${categoryHint}%`))
    .limit(3);

  if (categories.length === 0) return [];

  const catIds = categories.map(c => c.id);
  const products = await db.select({
    id: productsTable.id,
    nameEn: productsTable.nameEn,
    nameAr: productsTable.nameAr,
    price: productsTable.price,
    salePrice: productsTable.salePrice,
    categoryId: productsTable.categoryId,
  })
    .from(productsTable)
    .where(and(eq(productsTable.active, true), inArray(productsTable.categoryId, catIds)))
    .limit(8);

  return products;
}

async function getProductImages(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, string>();
  const images = await db.select({ productId: productImagesTable.productId, imageUrl: productImagesTable.imageUrl })
    .from(productImagesTable)
    .where(and(inArray(productImagesTable.productId, productIds), eq(productImagesTable.isPrimary, true)));
  return new Map(images.map(img => [img.productId, img.imageUrl]));
}

async function getProductVariants(productIds: number[]) {
  if (productIds.length === 0) return new Map<number, { size: string | null; color: string | null }[]>();
  const variants = await db.select({
    productId: productVariantsTable.productId,
    size: productVariantsTable.size,
    color: productVariantsTable.color,
    stockQuantity: productVariantsTable.stockQuantity,
  })
    .from(productVariantsTable)
    .where(inArray(productVariantsTable.productId, productIds));

  const map = new Map<number, { size: string | null; color: string | null }[]>();
  for (const v of variants) {
    if (!map.has(v.productId)) map.set(v.productId, []);
    map.get(v.productId)!.push({ size: v.size, color: v.color });
  }
  return map;
}

// ── POST /ai/chat ─────────────────────────────────────────────────────────────
router.post("/ai/chat", optionalAuth, async (req, res): Promise<void> => {
  if (!GEMINI_API_KEY) {
    res.status(503).json({ error: "AI Concierge is not configured." });
    return;
  }

  const { message, history = [], imageBase64, imageMimeType } = req.body ?? {};
  if (!message && !imageBase64) {
    res.status(400).json({ error: "message or imageBase64 required" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    });

    const userMsg = message ?? "";
    const lowerMsg = userMsg.toLowerCase();

    // Detect intent to build context
    const isProductSearch = /show|find|search|look|want|need|dress|outfit|shirt|jacket|coat|bag|shoes|accessori|top|jean|skirt|trouser|pant|suit|knitwear|abayas?/i.test(userMsg);
    const isFaqQuery = /ship|return|refund|payment|coupon|discount|cod|deliv|track|cancel|policy|how long|when|how do/i.test(userMsg);
    const isOrderQuery = /my order|order status|where is my|track my|order #|order number/i.test(userMsg);
    const isSizeQuery = /size|fit|measure|small|medium|large|xl|xs/i.test(userMsg);
    const isVisionSearch = !!imageBase64;

    // Build rich context
    const contextParts: string[] = [];

    if (isProductSearch || isVisionSearch || isSizeQuery) {
      const searchTerms = userMsg.match(/\b(dress|shirt|jacket|coat|bag|shoes|top|jean|skirt|trouser|pant|knitwear|abaya|outerwear|accessor)/gi) ?? [];
      let products: { id: number; nameEn: string; nameAr?: string | null; price: string | number; salePrice?: string | number | null; categoryId?: number }[] = [];

      if (searchTerms.length > 0) {
        products = await getProductContext(searchTerms[0]);
        if (products.length < 3) {
          const catProducts = await searchProductsByCategory(searchTerms[0]);
          const existing = new Set(products.map(p => p.id));
          products.push(...catProducts.filter(p => !existing.has(p.id)));
        }
      } else {
        products = await getProductContext(userMsg.slice(0, 30));
      }

      if (products.length > 0) {
        const imgMap = await getProductImages(products.map(p => p.id));
        const variantMap = await getProductVariants(products.map(p => p.id));

        const enriched = products.map(p => ({
          id: p.id,
          name: p.nameEn,
          nameAr: p.nameAr,
          price: Number(p.price),
          salePrice: p.salePrice ? Number(p.salePrice) : null,
          imageUrl: imgMap.get(p.id) ?? null,
          variants: variantMap.get(p.id) ?? [],
        }));

        contextParts.push(`CATALOG (use this to answer — do not invent products):
${JSON.stringify(enriched, null, 2)}`);
      }
    }

    if (isFaqQuery) {
      const faqs = await getFaqContext();
      if (faqs.length > 0) {
        contextParts.push(`STORE POLICIES & FAQ:
${faqs.map(f => `Q: ${f.questionEn}\nA: ${f.answerEn}`).join("\n\n")}`);
      }
    }

    if (isOrderQuery && req.user) {
      const orders = await getUserOrders(req.user.id);
      contextParts.push(`CUSTOMER ORDERS (userId: ${req.user.id}):
${JSON.stringify(orders, null, 2)}`);
    } else if (isOrderQuery && !req.user) {
      contextParts.push(`CUSTOMER ORDERS: Customer is not logged in. Politely ask them to log in to track orders.`);
    }

    const contextBlock = contextParts.length > 0
      ? `\n\n--- STORE DATA ---\n${contextParts.join("\n\n")}\n--- END STORE DATA ---`
      : "";

    const systemWithContext = SYSTEM_PROMPT + contextBlock;

    const geminiHistory = (history as { role: "user" | "model"; text: string }[]).slice(-10).map(h => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemWithContext }] },
        { role: "model", parts: [{ text: "Understood. I am Velora Concierge, ready to assist with anything related to Velora's collections, orders, and services." }] },
        ...geminiHistory,
      ],
    });

    const messageParts: Part[] = [];

    if (imageBase64 && imageMimeType) {
      messageParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType,
        },
      });
      messageParts.push({
        text: userMsg || "Please analyze this clothing item and find similar products from our Velora catalog.",
      });
    } else {
      messageParts.push({ text: userMsg });
    }

    const result = await chat.sendMessage(messageParts);
    const text = result.response.text();

    // Parse structured product data from response
    const productMatch = text.match(/<products>([\s\S]*?)<\/products>/);
    const navigateMatch = text.match(/<navigate>(.*?)<\/navigate>/);
    const cleanText = text
      .replace(/<products>[\s\S]*?<\/products>/g, "")
      .replace(/<navigate>.*?<\/navigate>/g, "")
      .trim();

    let suggestedProducts = null;
    if (productMatch) {
      try { suggestedProducts = JSON.parse(productMatch[1]); } catch { /* ignore */ }
    }

    res.json({
      reply: cleanText,
      suggestedProducts,
      navigateTo: navigateMatch?.[1] ?? null,
    });
  } catch (err: any) {
    if (err?.status === 503 || err?.message?.includes("overloaded")) {
      res.status(503).json({ error: "AI service is temporarily busy. Please try again." });
      return;
    }
    throw err;
  }
});

export default router;
