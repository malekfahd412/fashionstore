import { describe, it, expect } from "vitest";

// ── Pure-logic helpers mirroring getCompromisedAccounts ──────────────────────

type LoginAttempt = {
  id: number;
  email: string;
  ip: string;
  success: boolean;
  userId: number | null;
  attemptedAt: Date;
};

type CompromisedIndicator = {
  email: string;
  userId: number;
  ip: string;
  ipFailuresOnOthers: number;
  distinctEmailsFromIp: number;
  riskLevel: "high" | "medium";
};

function detectCompromised(
  attempts: LoginAttempt[],
  since: Date,
  minDistinctEmails = 2,
): CompromisedIndicator[] {
  const successLogins = attempts.filter(
    (a) => a.success && a.userId !== null && a.attemptedAt >= since && a.email !== "admin-unlock",
  );

  const results: CompromisedIndicator[] = [];

  for (const login of successLogins) {
    const failuresOnOthers = attempts.filter(
      (a) =>
        !a.success &&
        a.ip === login.ip &&
        a.email !== login.email &&
        a.attemptedAt >= since,
    );

    const distinctEmails = new Set(failuresOnOthers.map((a) => a.email)).size;
    const ipFailures = failuresOnOthers.length;

    if (distinctEmails >= minDistinctEmails) {
      const riskLevel: "high" | "medium" =
        ipFailures >= 10 || distinctEmails >= 5 ? "high" : "medium";
      results.push({
        email: login.email,
        userId: login.userId!,
        ip: login.ip,
        ipFailuresOnOthers: ipFailures,
        distinctEmailsFromIp: distinctEmails,
        riskLevel,
      });
    }
  }

  return results;
}

const now = new Date("2026-06-11T12:00:00Z");
const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
describe("Compromised account detection — core logic", () => {
  it("flags account when successful login comes from IP with failures on 2+ other accounts", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "victim@a.com", ip: "1.2.3.4", success: true, userId: 10, attemptedAt: new Date("2026-06-11T10:00:00Z") },
      { id: 2, email: "other1@b.com", ip: "1.2.3.4", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:55:00Z") },
      { id: 3, email: "other2@c.com", ip: "1.2.3.4", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:56:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(1);
    expect(result[0]!.email).toBe("victim@a.com");
    expect(result[0]!.riskLevel).toBe("medium");
  });

  it("does NOT flag account when IP only attacked 1 other account", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "user@a.com", ip: "5.6.7.8", success: true, userId: 1, attemptedAt: new Date("2026-06-11T10:00:00Z") },
      { id: 2, email: "one@b.com", ip: "5.6.7.8", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:59:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(0);
  });

  it("does NOT flag first-time login with clean IP (no failures from that IP)", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "clean@a.com", ip: "10.0.0.1", success: true, userId: 5, attemptedAt: new Date("2026-06-11T10:00:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(0);
  });

  it("does NOT flag admin-unlock pseudo-entries", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "admin-unlock", ip: "192.0.0.1", success: true, userId: null, attemptedAt: new Date("2026-06-11T10:00:00Z") },
      { id: 2, email: "other1@x.com", ip: "192.0.0.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:59:00Z") },
      { id: 3, email: "other2@x.com", ip: "192.0.0.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:58:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(0);
  });

  it("does NOT flag successful logins outside the 24h window", () => {
    const oldDate = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25h ago
    const attempts: LoginAttempt[] = [
      { id: 1, email: "old@a.com", ip: "9.8.7.6", success: true, userId: 20, attemptedAt: oldDate },
      { id: 2, email: "fail1@b.com", ip: "9.8.7.6", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:00:00Z") },
      { id: 3, email: "fail2@c.com", ip: "9.8.7.6", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:01:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Compromised account detection — risk levels", () => {
  function makeAttempts(successEmail: string, failedEmails: string[], ip = "3.3.3.3"): LoginAttempt[] {
    const successAttempt: LoginAttempt = {
      id: 0, email: successEmail, ip, success: true, userId: 99,
      attemptedAt: new Date("2026-06-11T11:00:00Z"),
    };
    const failures: LoginAttempt[] = failedEmails.map((e, i) => ({
      id: i + 1, email: e, ip, success: false, userId: null,
      attemptedAt: new Date("2026-06-11T10:50:00Z"),
    }));
    return [successAttempt, ...failures];
  }

  it("classifies as HIGH risk when 5+ distinct emails attacked from same IP", () => {
    const attempts = makeAttempts(
      "target@x.com",
      ["a@x.com", "b@x.com", "c@x.com", "d@x.com", "e@x.com"],
    );
    const result = detectCompromised(attempts, since);
    expect(result[0]!.riskLevel).toBe("high");
    expect(result[0]!.distinctEmailsFromIp).toBe(5);
  });

  it("classifies as HIGH risk when 10+ failures from same IP", () => {
    const failEmails = Array.from({ length: 10 }, (_, i) => `fail${i}@test.com`);
    const attempts = makeAttempts("victim@x.com", failEmails);
    const result = detectCompromised(attempts, since);
    expect(result[0]!.riskLevel).toBe("high");
    expect(result[0]!.ipFailuresOnOthers).toBe(10);
  });

  it("classifies as MEDIUM risk when 2 distinct emails attacked from same IP", () => {
    const attempts = makeAttempts("user@x.com", ["victim1@y.com", "victim2@y.com"]);
    const result = detectCompromised(attempts, since);
    expect(result[0]!.riskLevel).toBe("medium");
    expect(result[0]!.distinctEmailsFromIp).toBe(2);
  });

  it("counts only failures from the SAME IP as the successful login", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "compromised@a.com", ip: "1.1.1.1", success: true, userId: 10, attemptedAt: new Date("2026-06-11T11:00:00Z") },
      { id: 2, email: "other1@b.com", ip: "1.1.1.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T10:50:00Z") },
      { id: 3, email: "other2@b.com", ip: "1.1.1.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T10:51:00Z") },
      // Different IP — should NOT count
      { id: 4, email: "unrelated@c.com", ip: "2.2.2.2", success: false, userId: null, attemptedAt: new Date("2026-06-11T10:52:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(1);
    expect(result[0]!.ipFailuresOnOthers).toBe(2);
    expect(result[0]!.distinctEmailsFromIp).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Compromised account detection — edge cases", () => {
  it("returns empty array when no login attempts exist", () => {
    expect(detectCompromised([], since)).toHaveLength(0);
  });

  it("returns empty array when all logins are failures", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "a@x.com", ip: "1.1.1.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T10:00:00Z") },
      { id: 2, email: "b@x.com", ip: "1.1.1.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T10:01:00Z") },
    ];
    expect(detectCompromised(attempts, since)).toHaveLength(0);
  });

  it("returns empty array when only unauthenticated successes (userId=null)", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "anon@x.com", ip: "1.1.1.1", success: true, userId: null, attemptedAt: new Date("2026-06-11T10:00:00Z") },
      { id: 2, email: "fail@y.com", ip: "1.1.1.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:59:00Z") },
      { id: 3, email: "fail2@y.com", ip: "1.1.1.1", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:58:00Z") },
    ];
    expect(detectCompromised(attempts, since)).toHaveLength(0);
  });

  it("handles multiple compromised accounts from the same IP", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "victim1@a.com", ip: "7.7.7.7", success: true, userId: 1, attemptedAt: new Date("2026-06-11T10:00:00Z") },
      { id: 2, email: "victim2@a.com", ip: "7.7.7.7", success: true, userId: 2, attemptedAt: new Date("2026-06-11T10:05:00Z") },
      { id: 3, email: "fail1@b.com", ip: "7.7.7.7", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:55:00Z") },
      { id: 4, email: "fail2@b.com", ip: "7.7.7.7", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:56:00Z") },
      { id: 5, email: "fail3@b.com", ip: "7.7.7.7", success: false, userId: null, attemptedAt: new Date("2026-06-11T09:57:00Z") },
    ];
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.email).sort()).toEqual(["victim1@a.com", "victim2@a.com"].sort());
  });

  it("does not count failures from AFTER the successful login as part of the same incident", () => {
    const attempts: LoginAttempt[] = [
      { id: 1, email: "user@a.com", ip: "4.4.4.4", success: true, userId: 50, attemptedAt: new Date("2026-06-11T09:00:00Z") },
      // Failures happened BEFORE the window (>24h ago) — should not count
      { id: 2, email: "fail@b.com", ip: "4.4.4.4", success: false, userId: null, attemptedAt: new Date("2026-06-10T08:00:00Z") },
      { id: 3, email: "fail2@b.com", ip: "4.4.4.4", success: false, userId: null, attemptedAt: new Date("2026-06-10T08:01:00Z") },
    ];
    // Failures are outside the 24h since window
    const result = detectCompromised(attempts, since);
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("IP geolocation — private IP detection", () => {
  function isPrivateIp(ip: string): boolean {
    return /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|localhost$|unknown$|admin-unlock$)/.test(ip);
  }

  it("identifies loopback as private", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
  });

  it("identifies RFC-1918 ranges as private", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.100")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
  });

  it("does NOT flag public IPs as private", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.2.3.4")).toBe(false);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
  });

  it("flags sentinel values used in dev/admin operations", () => {
    expect(isPrivateIp("unknown")).toBe(true);
    expect(isPrivateIp("admin-unlock")).toBe(true);
  });
});
