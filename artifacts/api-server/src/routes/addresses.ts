import { Router, type IRouter } from "express";
import { db, userAddressesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const AddressBody = z.object({
  label: z.string().min(1).max(50).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  phone: z.string().min(5).max(30),
  isDefault: z.boolean().optional(),
});

const AddressParams = z.object({ id: z.coerce.number().int().positive() });

router.get("/addresses", requireAuth, async (req, res): Promise<void> => {
  const addresses = await db.select().from(userAddressesTable)
    .where(eq(userAddressesTable.userId, req.user!.id))
    .orderBy(userAddressesTable.isDefault, userAddressesTable.createdAt);
  res.json(addresses);
});

router.post("/addresses", requireAuth, async (req, res): Promise<void> => {
  const parsed = AddressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (parsed.data.isDefault) {
    await db.update(userAddressesTable)
      .set({ isDefault: false })
      .where(eq(userAddressesTable.userId, req.user!.id));
  }

  const isFirstAddress = (await db.$count(userAddressesTable, eq(userAddressesTable.userId, req.user!.id))) === 0;

  const [address] = await db.insert(userAddressesTable).values({
    userId: req.user!.id,
    label: parsed.data.label ?? "Home",
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    address: parsed.data.address,
    city: parsed.data.city,
    phone: parsed.data.phone,
    isDefault: parsed.data.isDefault ?? isFirstAddress,
  }).returning();
  res.status(201).json(address);
});

router.patch("/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = AddressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = AddressBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(userAddressesTable)
    .where(and(eq(userAddressesTable.id, params.data.id), eq(userAddressesTable.userId, req.user!.id)));
  if (!existing) { res.status(404).json({ error: "Address not found" }); return; }

  if (parsed.data.isDefault) {
    await db.update(userAddressesTable)
      .set({ isDefault: false })
      .where(eq(userAddressesTable.userId, req.user!.id));
  }

  const [address] = await db.update(userAddressesTable)
    .set(parsed.data)
    .where(and(eq(userAddressesTable.id, params.data.id), eq(userAddressesTable.userId, req.user!.id)))
    .returning();
  res.json(address);
});

router.delete("/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = AddressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(userAddressesTable)
    .where(and(eq(userAddressesTable.id, params.data.id), eq(userAddressesTable.userId, req.user!.id)));
  if (!existing) { res.status(404).json({ error: "Address not found" }); return; }
  await db.delete(userAddressesTable)
    .where(and(eq(userAddressesTable.id, params.data.id), eq(userAddressesTable.userId, req.user!.id)));
  res.json({ message: "Address deleted" });
});

export default router;
