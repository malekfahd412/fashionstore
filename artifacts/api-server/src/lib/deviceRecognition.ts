import crypto from "node:crypto";
import { db, trustedDevicesTable, userSecurityPrefsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

// ── UA parser (no external deps) ─────────────────────────────────────────────

export function parseUserAgent(ua: string): { browser: string; os: string; deviceName: string } {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (!ua) return { browser, os, deviceName: `${browser} on ${os}` };

  // Browser — order matters (Edge/OPR contain Chrome substring)
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Browser";
  else if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) browser = "Chrome";
  else if (/Chromium\//.test(ua)) browser = "Chromium";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";
  else if (/MSIE |Trident\//.test(ua)) browser = "Internet Explorer";

  // OS
  if (/iPhone/.test(ua)) os = "iOS (iPhone)";
  else if (/iPad/.test(ua)) os = "iOS (iPad)";
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android ([0-9.]+)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/.test(ua)) os = "Windows 7";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) {
    const m = ua.match(/Mac OS X ([0-9_]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/CrOS/.test(ua)) os = "Chrome OS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { browser, os, deviceName: `${browser} on ${os}` };
}

// ── Device fingerprint ────────────────────────────────────────────────────────

export function computeDeviceHash(ua: string): string {
  return crypto.createHash("sha256").update(ua || "unknown").digest("hex").slice(0, 32);
}

// ── DB operations ─────────────────────────────────────────────────────────────

export async function isKnownDevice(userId: number, deviceHash: string): Promise<boolean> {
  const [row] = await db
    .select({ id: trustedDevicesTable.id })
    .from(trustedDevicesTable)
    .where(and(eq(trustedDevicesTable.userId, userId), eq(trustedDevicesTable.deviceHash, deviceHash)));
  return !!row;
}

export async function hasAnyTrustedDevice(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: trustedDevicesTable.id })
    .from(trustedDevicesTable)
    .where(eq(trustedDevicesTable.userId, userId))
    .limit(1);
  return !!row;
}

export async function trustDevice(opts: {
  userId: number;
  deviceHash: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string | null;
}): Promise<void> {
  await db
    .insert(trustedDevicesTable)
    .values({
      userId: opts.userId,
      deviceHash: opts.deviceHash,
      deviceName: opts.deviceName,
      browser: opts.browser,
      os: opts.os,
      ip: opts.ip,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [trustedDevicesTable.userId, trustedDevicesTable.deviceHash],
      set: { lastSeenAt: new Date(), ip: opts.ip },
    });
}

export async function listTrustedDevices(userId: number) {
  return db
    .select()
    .from(trustedDevicesTable)
    .where(eq(trustedDevicesTable.userId, userId))
    .orderBy(trustedDevicesTable.lastSeenAt);
}

export async function removeTrustedDevice(userId: number, deviceId: number): Promise<boolean> {
  const [existing] = await db
    .select({ id: trustedDevicesTable.id })
    .from(trustedDevicesTable)
    .where(and(eq(trustedDevicesTable.id, deviceId), eq(trustedDevicesTable.userId, userId)));
  if (!existing) return false;
  await db.delete(trustedDevicesTable).where(eq(trustedDevicesTable.id, deviceId));
  return true;
}

// ── Security preferences ──────────────────────────────────────────────────────

export async function getSecurityPrefs(userId: number): Promise<{ loginAlertsEnabled: boolean }> {
  const [row] = await db
    .select()
    .from(userSecurityPrefsTable)
    .where(eq(userSecurityPrefsTable.userId, userId));
  return { loginAlertsEnabled: row?.loginAlertsEnabled ?? true };
}

export async function upsertSecurityPrefs(userId: number, loginAlertsEnabled: boolean): Promise<void> {
  await db
    .insert(userSecurityPrefsTable)
    .values({ userId, loginAlertsEnabled })
    .onConflictDoUpdate({
      target: [userSecurityPrefsTable.userId],
      set: { loginAlertsEnabled },
    });
}
