import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Shield, AlertTriangle, Monitor, Clock, Trash2, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.body ? { "Content-Type": "application/json" } : {}),
      ...opts?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

type Session = {
  id: number;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string;
};

type TrustedDevice = {
  id: number;
  deviceHash: string;
  deviceName: string;
  browser: string | null;
  os: string | null;
  ip: string | null;
  lastSeenAt: string;
  createdAt: string;
};

type LoginHistoryEntry = {
  id: number;
  ip: string;
  userAgent: string | null;
  success: boolean;
  attemptedAt: string;
};

type SecurityPrefs = { loginAlertsEnabled: boolean };

type SecuritySubTab = "sessions" | "devices" | "history" | "preferences";

function OutcomeBadge({ success }: { success: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
      success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}>
      {success ? "OK" : "FAILED"}
    </span>
  );
}

export default function SecurityCenterTab({ showAlert }: { showAlert?: boolean }) {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [subTab, setSubTab] = useState<SecuritySubTab>("sessions");
  const [histPage, setHistPage] = useState(1);
  const qc = useQueryClient();

  const { data: sessions, refetch: refetchSessions, isLoading: loadingSessions } = useQuery<Session[]>({
    queryKey: ["security-sessions"],
    queryFn: () => apiFetch("/api/account/security/sessions"),
    staleTime: 30_000,
  });

  const { data: devices, refetch: refetchDevices, isLoading: loadingDevices } = useQuery<TrustedDevice[]>({
    queryKey: ["security-devices"],
    queryFn: () => apiFetch("/api/account/security/devices"),
    staleTime: 60_000,
    enabled: subTab === "devices",
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery<{ entries: LoginHistoryEntry[]; total: number }>({
    queryKey: ["security-history-customer", histPage],
    queryFn: () => apiFetch(`/api/account/security/login-history?page=${histPage}&limit=20`),
    staleTime: 60_000,
    enabled: subTab === "history",
  });

  const { data: prefs, isLoading: loadingPrefs } = useQuery<SecurityPrefs>({
    queryKey: ["security-prefs"],
    queryFn: () => apiFetch("/api/account/security/prefs"),
    enabled: subTab === "preferences",
  });

  const revokeSession = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/account/security/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-sessions"] });
      refetchSessions();
    },
  });

  const revokeAllSessions = useMutation({
    mutationFn: () => apiFetch("/api/account/security/sessions", { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-sessions"] });
      refetchSessions();
    },
  });

  const removeDevice = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/account/security/devices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-devices"] });
      refetchDevices();
    },
  });

  const updatePrefs = useMutation({
    mutationFn: (loginAlertsEnabled: boolean) =>
      apiFetch("/api/account/security/prefs", {
        method: "PATCH",
        body: JSON.stringify({ loginAlertsEnabled }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-prefs"] });
    },
  });

  const SUB_TABS: { id: SecuritySubTab; label: string; icon: typeof Shield }[] = [
    { id: "sessions", label: "Active Sessions", icon: LogOut },
    { id: "devices", label: "Trusted Devices", icon: Monitor },
    { id: "history", label: "Login History", icon: Clock },
    { id: "preferences", label: "Preferences", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold">Security Center</h2>

      {/* ── "This wasn't me" alert banner ──────────────────────────────── */}
      {showAlert && !alertDismissed && (
        <div className="border border-orange-400 bg-orange-50 p-4 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-800 mb-1">Suspicious sign-in detected</p>
            <p className="text-sm text-orange-700 mb-3">
              You clicked "This wasn't me" from a security alert email. If someone else has access to your account,
              revoke all sessions immediately and change your password.
            </p>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => revokeAllSessions.mutate()}
                disabled={revokeAllSessions.isPending}
              >
                {revokeAllSessions.isPending ? "Revoking..." : "Revoke All Sessions"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAlertDismissed(true)}
              >
                Dismiss
              </Button>
            </div>
          </div>
          <button onClick={() => setAlertDismissed(true)} className="text-orange-400 hover:text-orange-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Sub-tab nav ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              subTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Active Sessions ─────────────────────────────────────────────── */}
      {subTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              These are all devices currently signed in to your account.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revokeAllSessions.mutate()}
              disabled={revokeAllSessions.isPending || !sessions?.length}
            >
              Revoke All
            </Button>
          </div>

          {loadingSessions ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : !sessions?.length ? (
            <div className="bg-muted/30 p-8 text-center border border-border">
              <p className="text-muted-foreground text-sm">No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="border border-border p-4 flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {session.userAgent
                        ? session.userAgent.length > 80
                          ? session.userAgent.slice(0, 80) + "…"
                          : session.userAgent
                        : "Unknown device"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {session.ip && <span>IP: {session.ip}</span>}
                      {session.lastUsedAt && (
                        <span>Last active: {format(new Date(session.lastUsedAt), "MMM d, HH:mm")}</span>
                      )}
                      <span>Started: {format(new Date(session.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSession.mutate(session.id)}
                    disabled={revokeSession.isPending}
                    className="flex items-center gap-2 flex-shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Trusted Devices ─────────────────────────────────────────────── */}
      {subTab === "devices" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Devices that have previously signed in. New sign-ins from unlisted devices will trigger an alert email.
          </p>

          {loadingDevices ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : !devices?.length ? (
            <div className="bg-muted/30 p-8 text-center border border-border">
              <p className="text-muted-foreground text-sm">No trusted devices found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="border border-border p-4 flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                  <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{device.deviceName}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {device.ip && <span>Last IP: {device.ip}</span>}
                        <span>First seen: {format(new Date(device.createdAt), "MMM d, yyyy")}</span>
                        <span>Last seen: {format(new Date(device.lastSeenAt), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeDevice.mutate(device.id)}
                    disabled={removeDevice.isPending}
                    className="flex items-center gap-2 flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Login History ────────────────────────────────────────────────── */}
      {subTab === "history" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All login attempts associated with your account in the past 30 days.
          </p>

          {loadingHistory ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : !historyData?.entries.length ? (
            <div className="bg-muted/30 p-8 text-center border border-border">
              <p className="text-muted-foreground text-sm">No login history found.</p>
            </div>
          ) : (
            <>
              <div className="border border-border bg-card overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      {["Time", "IP Address", "Device", "Result"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyData.entries.map((entry) => (
                      <tr key={entry.id} className={`hover:bg-muted/20 ${!entry.success ? "bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                          {format(new Date(entry.attemptedAt), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{entry.ip}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {entry.userAgent ? entry.userAgent.slice(0, 60) + (entry.userAgent.length > 60 ? "…" : "") : "—"}
                        </td>
                        <td className="px-4 py-3"><OutcomeBadge success={entry.success} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyData.total > 20 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{historyData.total} total records</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                      disabled={histPage === 1}
                    >
                      ← Prev
                    </Button>
                    <span className="px-3 py-1 text-sm">Page {histPage}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistPage((p) => p + 1)}
                      disabled={(historyData.entries.length ?? 0) < 20}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Preferences ─────────────────────────────────────────────────── */}
      {subTab === "preferences" && (
        <div className="space-y-6 max-w-lg">
          <div>
            <h3 className="text-base font-semibold mb-1">Login Alerts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Receive an email notification when your account is signed in from an unrecognised device.
            </p>

            {loadingPrefs ? (
              <div className="text-sm text-muted-foreground">Loading preferences...</div>
            ) : (
              <div className="flex items-center justify-between border border-border p-4">
                <div>
                  <p className="text-sm font-medium">New device login notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currently {prefs?.loginAlertsEnabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <button
                  onClick={() => updatePrefs.mutate(!prefs?.loginAlertsEnabled)}
                  disabled={updatePrefs.isPending}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    prefs?.loginAlertsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  aria-label="Toggle login alerts"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      prefs?.loginAlertsEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Security tip</p>
            <p className="text-sm text-muted-foreground">
              Keep login alerts enabled. If you receive an unexpected login alert, immediately revoke all sessions
              from the Active Sessions tab and change your password.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
