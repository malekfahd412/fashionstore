import { Router, type IRouter } from "express";
import { db, faqsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/faq", async (req, res): Promise<void> => {
  const category = req.query.category as string | undefined;
  const allFaqs = await db.select().from(faqsTable).where(eq(faqsTable.active, true)).orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  const filtered = category ? allFaqs.filter(f => f.category === category) : allFaqs;
  res.json(filtered);
});

router.get("/admin/faq", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const faqs = await db.select().from(faqsTable).orderBy(asc(faqsTable.category), asc(faqsTable.sortOrder));
  res.json(faqs);
});

router.post("/admin/faq", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const { category, questionEn, questionAr = "", answerEn, answerAr = "", sortOrder = 0, active = true } = req.body ?? {};
  if (!questionEn || !answerEn || !category) {
    res.status(400).json({ error: "category, questionEn and answerEn are required" }); return;
  }
  const [faq] = await db.insert(faqsTable).values({
    category: String(category),
    questionEn: String(questionEn),
    questionAr: String(questionAr),
    answerEn: String(answerEn),
    answerAr: String(answerAr),
    sortOrder: Number(sortOrder),
    active: Boolean(active),
  }).returning();
  res.status(201).json(faq);
});

router.patch("/admin/faq/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { category, questionEn, questionAr, answerEn, answerAr, sortOrder, active } = req.body ?? {};
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (category !== undefined) update.category = String(category);
  if (questionEn !== undefined) update.questionEn = String(questionEn);
  if (questionAr !== undefined) update.questionAr = String(questionAr);
  if (answerEn !== undefined) update.answerEn = String(answerEn);
  if (answerAr !== undefined) update.answerAr = String(answerAr);
  if (sortOrder !== undefined) update.sortOrder = Number(sortOrder);
  if (active !== undefined) update.active = Boolean(active);
  const [faq] = await db.update(faqsTable).set(update).where(eq(faqsTable.id, id)).returning();
  if (!faq) { res.status(404).json({ error: "FAQ not found" }); return; }
  res.json(faq);
});

router.delete("/admin/faq/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(faqsTable).where(eq(faqsTable.id, id));
  res.json({ message: "FAQ deleted" });
});

export default router;
