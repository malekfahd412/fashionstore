import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db, usersTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { signToken } from "../middlewares/auth";
import { OAuth2Client } from "google-auth-library";

const router: IRouter = Router();

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function sha256(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  return d;
}

async function createRefreshToken(
  userId: number,
  req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }
): Promise<string> {
  const raw = generateToken();
  const hash = sha256(raw);
  const ua = req.headers["user-agent"] as string | undefined;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash: hash,
    userAgent: ua ?? null,
    ip: ip ?? null,
    expiresAt: refreshTokenExpiry(),
  });
  return raw;
}

// ── POST /auth/google — verify Google ID token and issue Velora JWT ─────────────
router.post("/auth/google", async (req, res): Promise<void> => {
  const { credential } = req.body as { credential?: string };
  if (!credential || typeof credential !== "string") {
    res.status(400).json({ error: "Google credential is required" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Google login is not configured" });
    return;
  }

  let googlePayload: {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    email_verified?: boolean;
  };

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }
    googlePayload = {
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name ?? payload.email.split("@")[0],
      picture: payload.picture,
      email_verified: payload.email_verified ?? false,
    };
  } catch {
    res.status(401).json({ error: "Failed to verify Google token" });
    return;
  }

  // Case 1: existing user with this googleId → log in directly
  let [user] = await db.select().from(usersTable).where(eq(usersTable.googleId, googlePayload.sub));

  if (!user) {
    // Case 2: existing email/password user → link Google account
    const [existingByEmail] = await db.select().from(usersTable).where(eq(usersTable.email, googlePayload.email));
    if (existingByEmail) {
      [user] = await db.update(usersTable)
        .set({
          googleId: googlePayload.sub,
          avatar: existingByEmail.avatar ?? googlePayload.picture ?? null,
          emailVerified: true,
        })
        .where(eq(usersTable.id, existingByEmail.id))
        .returning();
    } else {
      // Case 3: brand new Google user → create account
      const [created] = await db.insert(usersTable).values({
        name: googlePayload.name,
        email: googlePayload.email,
        password: null,
        role: "customer",
        googleId: googlePayload.sub,
        avatar: googlePayload.picture ?? null,
        emailVerified: true,
      }).returning();
      user = created;
    }
  }

  if (!user.active) {
    res.status(403).json({ error: "Account is deactivated" });
    return;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = await createRefreshToken(user.id, req);

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  });
});

export default router;
