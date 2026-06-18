import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable, productVariantsTable, productImagesTable, bannersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const SEED_CATEGORIES = [
  { nameEn: "Dresses", nameAr: "فساتين", slug: "dresses", sortOrder: 1 },
  { nameEn: "Tops", nameAr: "بلوزات", slug: "tops", sortOrder: 2 },
  { nameEn: "Pants & Trousers", nameAr: "بناطيل", slug: "pants-trousers", sortOrder: 3 },
  { nameEn: "Outerwear", nameAr: "معاطف", slug: "outerwear", sortOrder: 4 },
  { nameEn: "Accessories", nameAr: "اكسسوارات", slug: "accessories", sortOrder: 5 },
];

const COLORS = ["Black", "White", "Ivory", "Navy", "Camel", "Burgundy", "Rose", "Gold"];
const SIZES  = ["XS", "S", "M", "L", "XL"];

const SEED_PRODUCTS: Array<{
  nameEn: string; nameAr: string;
  descriptionEn: string; descriptionAr: string;
  price: string; salePrice?: string;
  sku: string; featured: boolean; categorySlug: string;
  imageUrl: string;
  colors: string[]; sizes: string[];
}> = [
  {
    nameEn: "Silk Wrap Dress",
    nameAr: "فستان حرير ملفوف",
    descriptionEn: "An elegantly draped silk wrap dress that effortlessly transitions from day to evening.",
    descriptionAr: "فستان حرير مدروف بأناقة يمكن ارتداؤه في أي وقت من اليوم.",
    price: "3200", sku: "VLR-DRS-001", featured: true, categorySlug: "dresses",
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80",
    colors: ["Black", "Ivory", "Burgundy"], sizes: ["XS", "S", "M", "L"],
  },
  {
    nameEn: "Pleated Midi Dress",
    nameAr: "فستان ميدي مطوي",
    descriptionEn: "A graceful pleated midi dress in premium georgette fabric.",
    descriptionAr: "فستان ميدي راقي بتصميم مطوي من قماش الجيورجيت الفاخر.",
    price: "2800", salePrice: "1960", sku: "VLR-DRS-002", featured: true, categorySlug: "dresses",
    imageUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80",
    colors: ["Rose", "Navy", "Camel"], sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    nameEn: "Satin Slip Dress",
    nameAr: "فستان ساتان سليب",
    descriptionEn: "A luxurious satin slip dress with a subtle bias cut for a fluid silhouette.",
    descriptionAr: "فستان ساتان فاخر بقصة مائلة تمنح قوام سائل وأنيق.",
    price: "2400", sku: "VLR-DRS-003", featured: false, categorySlug: "dresses",
    imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80",
    colors: ["Gold", "Black", "Ivory"], sizes: ["S", "M", "L"],
  },
  {
    nameEn: "Linen Blazer",
    nameAr: "بليزر كتان",
    descriptionEn: "A relaxed, tailored linen blazer perfect for layering.",
    descriptionAr: "بليزر كتان مريح ومصمم بدقة، مثالي للطبقات.",
    price: "4500", sku: "VLR-OUT-001", featured: true, categorySlug: "outerwear",
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80",
    colors: ["Camel", "Black", "White"], sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    nameEn: "Wide-Leg Trousers",
    nameAr: "بنطلون أرجل واسعة",
    descriptionEn: "Flowing wide-leg trousers in crepe fabric with an elasticated waistband.",
    descriptionAr: "بنطلون واسع الأرجل من قماش الكريب بخصر مرن.",
    price: "1800", salePrice: "1260", sku: "VLR-PNT-001", featured: false, categorySlug: "pants-trousers",
    imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b1b5e?w=600&q=80",
    colors: ["Black", "Navy", "Ivory"], sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    nameEn: "Silk Camisole Top",
    nameAr: "توب حرير كاميسول",
    descriptionEn: "A delicate silk camisole with adjustable straps, perfect for styling.",
    descriptionAr: "توب حرير رفيع بأحزمة قابلة للضبط.",
    price: "1200", sku: "VLR-TOP-001", featured: false, categorySlug: "tops",
    imageUrl: "https://images.unsplash.com/photo-1604177091072-00be6a7d073b?w=600&q=80",
    colors: ["Ivory", "Black", "Rose", "Gold"], sizes: ["XS", "S", "M", "L"],
  },
  {
    nameEn: "Cashmere Turtleneck",
    nameAr: "تيشرت كشمير بياقة عالية",
    descriptionEn: "Luxuriously soft cashmere turtleneck for refined layering.",
    descriptionAr: "تيشرت كشمير ناعم فاخر مع ياقة عالية.",
    price: "3600", sku: "VLR-TOP-002", featured: true, categorySlug: "tops",
    imageUrl: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&q=80",
    colors: ["Camel", "Black", "Ivory", "Burgundy"], sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    nameEn: "Gold Chain Belt",
    nameAr: "حزام سلسلة ذهبي",
    descriptionEn: "A statement gold-tone chain belt to elevate any ensemble.",
    descriptionAr: "حزام سلسلة ذهبي للإضافة لمسة أناقة لأي إطلالة.",
    price: "850", sku: "VLR-ACC-001", featured: false, categorySlug: "accessories",
    imageUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80",
    colors: ["Gold"], sizes: ["S", "M", "L"],
  },
];

const SEED_BANNERS = [
  {
    titleEn: "New Season Arrivals",
    titleAr: "مجموعة الموسم الجديد",
    subtitleEn: "Discover our latest luxury fashion collection",
    subtitleAr: "اكتشفي أحدث مجموعاتنا من الأزياء الفاخرة",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80",
    linkUrl: "/products",
    active: true,
    sortOrder: 1,
  },
  {
    titleEn: "Timeless Elegance",
    titleAr: "أناقة خالدة",
    subtitleEn: "Curated pieces for the discerning woman",
    subtitleAr: "قطع منتقاة بعناية للمرأة الراقية",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
    linkUrl: "/products?featured=true",
    active: true,
    sortOrder: 2,
  },
];

router.post("/admin/seed", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  // Strict idempotency: skip entirely if the store already has products
  const [{ productCount }] = await db.select({ productCount: count() }).from(productsTable);
  if (Number(productCount) > 0) {
    res.json({
      ok: true,
      skipped: true,
      message: "Store already has products — seed skipped",
      summary: [],
      created: { categories: 0, products: 0, banners: 0 },
    });
    return;
  }

  const summary: string[]= [];

  // ── Categories ────────────────────────────────────────────────────────────
  const existingCats = await db.select({ id: categoriesTable.id, slug: categoriesTable.slug }).from(categoriesTable);
  const existingSlugs = new Set(existingCats.map(c => c.slug));
  const newCats = SEED_CATEGORIES.filter(c => !existingSlugs.has(c.slug));
  let insertedCats: typeof existingCats = [];
  if (newCats.length > 0) {
    insertedCats = await db.insert(categoriesTable).values(
      newCats.map(c => ({ nameEn: c.nameEn, nameAr: c.nameAr, slug: c.slug, active: true, sortOrder: c.sortOrder }))
    ).returning({ id: categoriesTable.id, slug: categoriesTable.slug });
    summary.push(`Created ${newCats.length} categories`);
  }
  const allCats = [...existingCats, ...insertedCats];
  const catMap = new Map(allCats.map(c => [c.slug, c.id]));

  // ── Products ──────────────────────────────────────────────────────────────
  const existingSkus = new Set(
    (await db.select({ sku: productsTable.sku }).from(productsTable)).map(p => p.sku).filter(Boolean)
  );

  let createdProducts = 0;
  for (const p of SEED_PRODUCTS) {
    if (existingSkus.has(p.sku)) continue;

    const catId = catMap.get(p.categorySlug);
    if (!catId) continue;

    // Use vendorId=1 as the default admin vendor; if not found, skip
    const vendorRows = await db.execute(
      `SELECT id FROM users WHERE role IN ('admin','vendor') ORDER BY id LIMIT 1`
    );
    const vendorId = ((vendorRows.rows[0] as Record<string, unknown> | undefined)?.id as number | undefined) ?? 1;

    const [product] = await db.insert(productsTable).values({
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      descriptionEn: p.descriptionEn,
      descriptionAr: p.descriptionAr,
      categoryId: catId,
      vendorId,
      price: p.price,
      salePrice: p.salePrice ?? null,
      sku: p.sku,
      featured: p.featured,
      active: true,
    }).returning({ id: productsTable.id });

    // Variants
    const variantRows = [];
    for (const color of p.colors) {
      for (const size of p.sizes) {
        variantRows.push({ productId: product.id, color, size, stockQuantity: Math.floor(Math.random() * 15) + 3 });
      }
    }
    if (variantRows.length > 0) {
      await db.insert(productVariantsTable).values(variantRows);
    }

    // Image
    await db.insert(productImagesTable).values({
      productId: product.id,
      imageUrl: p.imageUrl,
      isPrimary: true,
      sortOrder: 0,
    });

    createdProducts++;
    existingSkus.add(p.sku);
  }
  if (createdProducts > 0) summary.push(`Created ${createdProducts} products`);

  // ── Banners ───────────────────────────────────────────────────────────────
  const [{ bannerCount }] = await db.select({ bannerCount: count() }).from(bannersTable);
  if (Number(bannerCount) === 0) {
    await db.insert(bannersTable).values(SEED_BANNERS.map(b => ({
      titleEn: b.titleEn,
      titleAr: b.titleAr,
      subtitleEn: b.subtitleEn,
      subtitleAr: b.subtitleAr,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      active: b.active,
      sortOrder: b.sortOrder,
    })));
    summary.push(`Created ${SEED_BANNERS.length} banners`);
  }

  res.json({
    ok: true,
    skipped: false,
    message: summary.length > 0 ? summary.join("; ") : "Nothing new to seed",
    summary,
    created: {
      categories: newCats.length,
      products: createdProducts,
      banners: Number(bannerCount) === 0 ? SEED_BANNERS.length : 0,
    },
  });
});

export default router;
