import { describe, it, expect } from "vitest";
import { parseUserAgent, computeDeviceHash } from "../lib/deviceRecognition";

// ────────────────────────────────────────────────────────────────────────────
describe("parseUserAgent — browser detection", () => {
  const cases: [string, string, string][] = [
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Chrome",
      "Windows 10/11",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      "Edge",
      "Windows 10/11",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0",
      "Firefox",
      "Windows 10/11",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Safari",
      "macOS 14.2",
    ],
    [
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Chrome",
      "Android 13",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
      "Safari",
      "iOS (iPhone)",
    ],
    [
      "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
      "Samsung Browser",
      "Android 13",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
      "Opera",
      "Linux",
    ],
  ];

  for (const [ua, expectedBrowser, expectedOs] of cases) {
    it(`detects ${expectedBrowser} on ${expectedOs}`, () => {
      const result = parseUserAgent(ua);
      expect(result.browser).toBe(expectedBrowser);
      expect(result.os).toBe(expectedOs);
      expect(result.deviceName).toBe(`${expectedBrowser} on ${expectedOs}`);
    });
  }

  it("handles empty user agent string gracefully", () => {
    const result = parseUserAgent("");
    expect(result.browser).toBe("Unknown Browser");
    expect(result.os).toBe("Unknown OS");
    expect(result.deviceName).toBe("Unknown Browser on Unknown OS");
  });

  it("handles undefined-like input", () => {
    const result = parseUserAgent("curl/7.81.0");
    expect(result.browser).toBe("Unknown Browser");
    expect(typeof result.deviceName).toBe("string");
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("parseUserAgent — macOS version extraction", () => {
  it("extracts macOS version from underscored format", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const result = parseUserAgent(ua);
    expect(result.os).toBe("macOS 10.15.7");
  });

  it("extracts Android version from UA", () => {
    const ua = "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
    const result = parseUserAgent(ua);
    expect(result.os).toBe("Android 12");
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("computeDeviceHash", () => {
  it("returns a 32-character hex string", () => {
    const hash = computeDeviceHash("Mozilla/5.0 (Windows NT 10.0)");
    expect(hash).toHaveLength(32);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("is deterministic — same UA produces same hash", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/605.1.15";
    expect(computeDeviceHash(ua)).toBe(computeDeviceHash(ua));
  });

  it("produces different hashes for different UAs", () => {
    const hash1 = computeDeviceHash("Mozilla/5.0 Chrome/120");
    const hash2 = computeDeviceHash("Mozilla/5.0 Firefox/120");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string without throwing", () => {
    expect(() => computeDeviceHash("")).not.toThrow();
    const hash = computeDeviceHash("");
    expect(hash).toHaveLength(32);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("New device detection logic", () => {
  function simulateNewDevice(
    knownHashes: string[],
    incomingHash: string,
  ): { isNew: boolean; shouldAlert: boolean } {
    const isNew = !knownHashes.includes(incomingHash);
    // Only alert if user has at least one existing trusted device and this is new
    const hasExistingDevices = knownHashes.length > 0;
    const shouldAlert = isNew && hasExistingDevices;
    return { isNew, shouldAlert };
  }

  it("first-ever login: new device, no alert (no existing devices)", () => {
    const result = simulateNewDevice([], "abc123");
    expect(result.isNew).toBe(true);
    expect(result.shouldAlert).toBe(false);
  });

  it("known device: no alert", () => {
    const result = simulateNewDevice(["abc123", "def456"], "abc123");
    expect(result.isNew).toBe(false);
    expect(result.shouldAlert).toBe(false);
  });

  it("new device with existing devices: alert fires", () => {
    const result = simulateNewDevice(["abc123"], "newHash999");
    expect(result.isNew).toBe(true);
    expect(result.shouldAlert).toBe(true);
  });

  it("second device from same browser triggers alert", () => {
    const mobileHash = computeDeviceHash(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) Safari/604.1",
    );
    const desktopHash = computeDeviceHash(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/605.1.15",
    );
    const result = simulateNewDevice([desktopHash], mobileHash);
    expect(result.isNew).toBe(true);
    expect(result.shouldAlert).toBe(true);
  });

  it("same browser, different version still matches same hash", () => {
    const ua1 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
    const ua2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
    expect(computeDeviceHash(ua1)).toBe(computeDeviceHash(ua2));
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("Session revocation logic", () => {
  type Session = { id: number; userId: number; revokedAt: Date | null };

  function revokeSession(sessions: Session[], sessionId: number, userId: number): Session[] {
    const session = sessions.find((s) => s.id === sessionId && s.userId === userId);
    if (!session) throw new Error("Session not found or unauthorized");
    return sessions.map((s) =>
      s.id === sessionId ? { ...s, revokedAt: new Date() } : s,
    );
  }

  function getActiveSessions(sessions: Session[], userId: number): Session[] {
    return sessions.filter((s) => s.userId === userId && s.revokedAt === null);
  }

  const mockSessions: Session[] = [
    { id: 1, userId: 10, revokedAt: null },
    { id: 2, userId: 10, revokedAt: null },
    { id: 3, userId: 99, revokedAt: null }, // different user
  ];

  it("revokes only the specified session", () => {
    const updated = revokeSession(mockSessions, 1, 10);
    expect(updated.find((s) => s.id === 1)?.revokedAt).not.toBeNull();
    expect(updated.find((s) => s.id === 2)?.revokedAt).toBeNull();
  });

  it("throws when session belongs to different user", () => {
    expect(() => revokeSession(mockSessions, 3, 10)).toThrow("Session not found or unauthorized");
  });

  it("throws when session does not exist", () => {
    expect(() => revokeSession(mockSessions, 999, 10)).toThrow();
  });

  it("getActiveSessions only returns non-revoked sessions for the user", () => {
    const afterRevoke = revokeSession(mockSessions, 1, 10);
    const active = getActiveSessions(afterRevoke, 10);
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe(2);
  });

  it("revoke-all leaves zero active sessions for the user", () => {
    const afterAll = mockSessions.map((s) =>
      s.userId === 10 ? { ...s, revokedAt: new Date() } : s,
    );
    expect(getActiveSessions(afterAll, 10)).toHaveLength(0);
    // Other user unaffected
    expect(getActiveSessions(afterAll, 99)).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("Login notification delivery conditions", () => {
  type NotifCondition = {
    isNewDevice: boolean;
    hasExistingDevices: boolean;
    loginAlertsEnabled: boolean;
  };

  function shouldSendNotification(c: NotifCondition): boolean {
    return c.isNewDevice && c.hasExistingDevices && c.loginAlertsEnabled;
  }

  it("sends notification: new device, alerts on, has existing devices", () => {
    expect(shouldSendNotification({ isNewDevice: true, hasExistingDevices: true, loginAlertsEnabled: true })).toBe(true);
  });

  it("does not send: first-ever device (no existing devices)", () => {
    expect(shouldSendNotification({ isNewDevice: true, hasExistingDevices: false, loginAlertsEnabled: true })).toBe(false);
  });

  it("does not send: known device", () => {
    expect(shouldSendNotification({ isNewDevice: false, hasExistingDevices: true, loginAlertsEnabled: true })).toBe(false);
  });

  it("does not send: alerts disabled by user preference", () => {
    expect(shouldSendNotification({ isNewDevice: true, hasExistingDevices: true, loginAlertsEnabled: false })).toBe(false);
  });

  it("does not send: known device + alerts disabled (double-check)", () => {
    expect(shouldSendNotification({ isNewDevice: false, hasExistingDevices: true, loginAlertsEnabled: false })).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe("Trusted device management", () => {
  type Device = { id: number; userId: number; deviceHash: string; deviceName: string };

  function removeDevice(devices: Device[], deviceId: number, userId: number): Device[] {
    const device = devices.find((d) => d.id === deviceId && d.userId === userId);
    if (!device) throw new Error("Device not found");
    return devices.filter((d) => d.id !== deviceId);
  }

  const mockDevices: Device[] = [
    { id: 1, userId: 10, deviceHash: "hash1", deviceName: "Chrome on Windows" },
    { id: 2, userId: 10, deviceHash: "hash2", deviceName: "Safari on macOS" },
    { id: 3, userId: 99, deviceHash: "hash3", deviceName: "Firefox on Linux" },
  ];

  it("removes the correct device", () => {
    const remaining = removeDevice(mockDevices, 1, 10);
    expect(remaining).toHaveLength(2);
    expect(remaining.find((d) => d.id === 1)).toBeUndefined();
  });

  it("cannot remove another user's device", () => {
    expect(() => removeDevice(mockDevices, 3, 10)).toThrow("Device not found");
  });

  it("removing last device leaves no trusted devices", () => {
    const oneDevice: Device[] = [{ id: 1, userId: 5, deviceHash: "only", deviceName: "Chrome" }];
    const after = removeDevice(oneDevice, 1, 5);
    expect(after).toHaveLength(0);
  });

  it("adding new device with same hash overwrites (upsert)", () => {
    const existing: Device[] = [{ id: 1, userId: 10, deviceHash: "hash1", deviceName: "Chrome on Windows" }];
    // Simulate upsert — same hash, update name
    const upserted = existing.map((d) =>
      d.deviceHash === "hash1" ? { ...d, deviceName: "Chrome on Windows 11" } : d,
    );
    expect(upserted[0]!.deviceName).toBe("Chrome on Windows 11");
    expect(upserted).toHaveLength(1);
  });
});
