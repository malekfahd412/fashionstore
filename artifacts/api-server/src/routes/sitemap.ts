import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const BASE_URL = process.env.PUBLIC_URL ?? "https://luxe-fashion.replit.app";

  const [products, categories] = await Promise.all([
    db.select({ id: productsTable.id, updatedAt: productsTable.updatedAt })
      .from(productsTable)
      .where(eq(productsTable.active, true))
      .orderBy(desc(productsTable.updatedAt))
      .limit(500),
    db.select({ slug: categoriesTable.slug }).from(categoriesTable),
  ]);

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/products", priority: "0.9", changefreq: "daily" },
    { loc: "/categories", priority: "0.8", changefreq: "weekly" },
  ];

  const urls = [
    ...staticPages.map(p => `
  <url>
    <loc>${BASE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),
    ...categories.map(c => `
  <url>
    <loc>${BASE_URL}/products?category=${c.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`),
    ...products.map(p => `
  <url>
    <loc>${BASE_URL}/products/${p.id}</loc>
    <lastmod>${p.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`),
  ];

  res.setHeader("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`);
});

export default router;
