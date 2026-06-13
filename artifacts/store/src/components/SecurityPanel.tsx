import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Shield, AlertTriangle, History, Unlock, BarChart3, TrendingDown, ShieldAlert, KeyRound, X, CheckCircle2 } from "lucide-react";

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

type LockedAccount = {
  email: string;
  failureCount: number;
  unlocksAt: string;
  latestIp: string;
  reason: "email";
};

type LoginHistoryEntry = {
  id: number;
  email: string;
  ip: string;
  success: boolean;
  userId: number | null;
  userAgent: string | null;
  attemptedAt: string;
};

type SuspiciousActivity = {
  suspiciousIps: { ip: string; failureCount: number; distinctEmails: number; latestAttempt: string }[];
  targetedEmails: string[];
};

type SecurityOverview = {
  failedLast24h: number;
  successLast24h: number;
  lockedCount: number;
  suspiciousIpCount: number;
  trend: { date: string; failures: number; successes: number }[];
};

type CompromisedAccount = {
  email: string;
  userId: number;
  ip: string;
  loginAt: string;
  ipFailuresOnOthers: number;
  distinctEmailsFromIp: number;
  riskLevel: "high" | "medium";
};

type ForceResetResult = {
  message: string;
  affectedUser: { id: number; email: string; name: string };
  sessionCount: number;
  blockApplied: boolean;
};

type SecuritySubTab = "overview" | "locked" | "history" | "suspicious" | "compromised";

const CONFIRM_PHRASE = "CONFIRM RESET";

function Badge({ success }: { success: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {success ? "OK" : "FAIL"}
    </span>
  );
}

function TimeUntil({ date }: { date: string }) {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return <span className="text-green-600 text-xs">Expired</span>;
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return <span className="text-orange-600 text-xs font-medium">{mins}m remaining</span>;
  const hrs = Math.ceil(ms / 3600000);
  return <span className="text-red-600 text-xs font-medium">{hrs}h remaining</span>;
}

function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: "red" | "orange" | "green" }) {
  const colorMap = { red: "text-red-600", orange: "text-orange-500", green: "text-green-600" };
  const textColor = accent ? colorMap[accent] : "text-foreground";
  return (
    <div className="border border-border bg-card p-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold font-serif ${textColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ForceResetModal({
  account,
  onClose,
  onConfirm,
  isPending,
}: {
  account: CompromisedAccount;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");
  const isReady = confirmText === CONFIRM_PHRASE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-red-300 shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-red-700" />
            <span className="text-sm font-bold text-red-800 uppercase tracking-wide">Force Password Reset</span>
          </div>
          <button onClick={onClose} disabled={isPending} className="text-red-400 hover:text-red-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Risk badge + email */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-widest ${
              account.riskLevel === "high" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
            }`}>
              <ShieldAlert className="w-3 h-3" />
              {account.riskLevel} risk
            </span>
            <span className="text-sm font-semibold">{account.email}</span>
          </div>

          {/* Suspicious login details */}
          <div className="bg-muted/50 border border-border p-4 space-y-1.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Suspicious Login Details</p>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Suspicious IP</span>
              <span className="font-mono font-medium">{account.ip}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Login Time</span>
              <span>{format(new Date(account.loginAt), "MMM d yyyy, HH:mm:ss")}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Failures on Others</span>
              <span className="font-semibold text-red-600">{account.ipFailuresOnOthers}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-32 shrink-0">Distinct Targets</span>
              <span className="font-semibold">{account.distinctEmailsFromIp}</span>
            </div>
          </div>

          {/* What this action does */}
          <div className="text-sm space-y-1.5">
            <p className="font-semibold text-sm">This action will immediately:</p>
            <ul className="text-muted-foreground space-y-1 text-sm list-none">
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Revoke all active sessions and refresh tokens</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Issue a new 60-minute password reset link</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Apply a ~5-minute login block during transition</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Send an alert email to <strong>{account.email}</strong></li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> Write an audit log entry with your admin ID</li>
            </ul>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Type <span className="text-red-600 font-mono">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={CONFIRM_PHRASE}
              disabled={isPending}
              className="w-full border border-border px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:border-red-400 disabled:opacity-50"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isReady || isPending}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                Force Reset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecurityPanel() {
  const [subTab, setSubTab] = useState<SecuritySubTab>("overview");
  const [historyEmail, setHistoryEmail] = useState("");
  const [historyIp, setHistoryIp] = useState("");
  const [historySuccess, setHistorySuccess] = useState<"" | "true" | "false">("");
  const [historyPage, setHistoryPage] = useState(1);
  const [resetTarget, setResetTarget] = useState<CompromisedAccount | null>(null);
  const [resetSuccess, setResetSuccess] = useState<ForceResetResult | null>(null);
  const qc = useQueryClient();

  const { data: overview, refetch: refetchOverview } = useQuery<SecurityOverview>({
    queryKey: ["security-overview"],
    queryFn: () => apiFetch("/api/admin/security/overview"),
    enabled: subTab === "overview",
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: locked, refetch: refetchLocked } = useQuery<{ accounts: LockedAccount[] }>({
    queryKey: ["security-locked"],
    queryFn: () => apiFetch("/api/admin/security/locked-accounts"),
    enabled: subTab === "locked",
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: history, refetch: refetchHistory } = useQuery<{ entries: LoginHistoryEntry[]; total: number }>({
    queryKey: ["security-history", historyEmail, historyIp, historySuccess, historyPage],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(historyPage), limit: "50" });
      if (historyEmail) params.set("email", historyEmail);
      if (historyIp) params.set("ip", historyIp);
      if (historySuccess) params.set("success", historySuccess);
      return apiFetch(`/api/admin/security/login-history?${params}`);
    },
    enabled: subTab === "history",
    staleTime: 15_000,
  });

  const { data: suspicious, refetch: refetchSuspicious } = useQuery<SuspiciousActivity>({
    queryKey: ["security-suspicious"],
    queryFn: () => apiFetch("/api/admin/security/suspicious-activity"),
    enabled: subTab === "suspicious",
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const { data: compromised, refetch: refetchCompromised } = useQuery<{ accounts: CompromisedAccount[] }>({
    queryKey: ["security-compromised"],
    queryFn: () => apiFetch("/api/admin/security/compromised-accounts"),
    enabled: subTab === "compromised",
    staleTime: 30_000,
    refetchInterval: 120_000,
  });

  const unlock = useMutation({
    mutationFn: (email: string) =>
      apiFetch("/api/admin/security/unlock", { method: "POST", body: JSON.stringify({ email }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-locked"] });
      qc.invalidateQueries({ queryKey: ["security-overview"] });
      refetchLocked();
    },
  });

  const forceReset = useMutation<ForceResetResult, Error, CompromisedAccount>({
    mutationFn: (acc) =>
      apiFetch("/api/admin/security/force-password-reset", {
        method: "POST",
        body: JSON.stringify({
          email: acc.email,
          blockLogin: true,
          suspiciousIp: acc.ip,
          loginTime: acc.loginAt,
        }),
      }),
    onSuccess: (data) => {
      setResetTarget(null);
      setResetSuccess(data);
      qc.invalidateQueries({ queryKey: ["security-compromised"] });
      refetchCompromised();
      setTimeout(() => setResetSuccess(null), 8000);
    },
  });

  const SUB_TABS: { id: SecuritySubTab; label: string; icon: typeof Shield; badge?: number; badgeAccent?: boolean }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "locked", label: "Locked Accounts", icon: Shield, badge: overview?.lockedCount, badgeAccent: false },
    { id: "history", label: "Login History", icon: History },
    { id: "suspicious", label: "Suspicious Activity", icon: AlertTriangle, badge: overview?.suspiciousIpCount, badgeAccent: true },
    { id: "compromised", label: "Compromised Accounts", icon: ShieldAlert, badge: compromised?.accounts.length, badgeAccent: true },
  ];

  const trendMax = Math.max(1, ...(overview?.trend ?? []).flatMap((r) => [r.failures, r.successes]));

  return (
    <div className="space-y-6">
      {/* Force-reset success banner */}
      {resetSuccess && (
        <div className="border border-green-300 bg-green-50 px-5 py-3 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-green-800">Password reset forced for {resetSuccess.affectedUser.email}.</span>
            {" "}
            <span className="text-green-700">
              {resetSuccess.sessionCount} session{resetSuccess.sessionCount !== 1 ? "s" : ""} revoked.
              Reset email sent.{resetSuccess.blockApplied ? " Temporary login block applied." : ""}
            </span>
          </div>
          <button onClick={() => setResetSuccess(null)} className="ml-auto text-green-400 hover:text-green-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error banner for force reset */}
      {forceReset.isError && (
        <div className="border border-red-300 bg-red-50 px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <span className="text-sm text-red-700">{forceReset.error.message}</span>
          <button onClick={() => forceReset.reset()} className="ml-auto text-red-400 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Security</h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          Login Protection Active
        </span>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {SUB_TABS.map(({ id, label, icon: Icon, badge, badgeAccent }) => (
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
            {badge != null && badge > 0 && (
              <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded-full leading-none ${
                badgeAccent ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {subTab === "overview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Live security metrics for the last 24 hours.</p>
            <button onClick={() => refetchOverview()} className="text-xs text-primary underline">Refresh</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Failed Logins (24h)" value={overview?.failedLast24h ?? "—"} sub="login failures"
              accent={overview && overview.failedLast24h > 50 ? "red" : overview && overview.failedLast24h > 10 ? "orange" : undefined} />
            <StatCard label="Successful Logins (24h)" value={overview?.successLast24h ?? "—"} sub="successful sign-ins" accent="green" />
            <StatCard label="Locked Accounts" value={overview?.lockedCount ?? "—"} sub="currently locked"
              accent={overview && overview.lockedCount > 0 ? "orange" : undefined} />
            <StatCard label="Suspicious IPs" value={overview?.suspiciousIpCount ?? "—"} sub="flagged in last hour"
              accent={overview && overview.suspiciousIpCount > 0 ? "red" : undefined} />
          </div>

          <div className="border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">7-Day Login Trend</span>
            </div>
            {!overview?.trend.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <>
                <div className="px-5 pt-4 pb-2 flex items-end gap-1 h-28">
                  {overview.trend.map((row) => (
                    <div key={row.date} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex gap-0.5 items-end" style={{ height: "72px" }}>
                        <div className="flex-1 bg-red-400/80 rounded-sm"
                          style={{ height: `${Math.round((row.failures / trendMax) * 72)}px`, minHeight: row.failures > 0 ? 2 : 0 }}
                          title={`${row.failures} failures`} />
                        <div className="flex-1 bg-green-400/80 rounded-sm"
                          style={{ height: `${Math.round((row.successes / trendMax) * 72)}px`, minHeight: row.successes > 0 ? 2 : 0 }}
                          title={`${row.successes} successes`} />
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {format(new Date(row.date + "T12:00:00Z"), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-4 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-400/80 rounded-sm inline-block" />Failures</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-400/80 rounded-sm inline-block" />Successes</span>
                </div>
                <table className="w-full text-sm border-t border-border">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      {["Date", "Failures", "Successes", "Total", "Failure Rate"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {overview.trend.map((row) => {
                      const total = row.failures + row.successes;
                      const rate = total > 0 ? ((row.failures / total) * 100).toFixed(0) : "0";
                      return (
                        <tr key={row.date} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">{format(new Date(row.date + "T12:00:00Z"), "EEE, MMM d")}</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-medium ${row.failures > 0 ? "text-red-600" : "text-muted-foreground"}`}>{row.failures}</span>
                          </td>
                          <td className="px-4 py-2.5"><span className="font-medium text-green-600">{row.successes}</span></td>
                          <td className="px-4 py-2.5 text-muted-foreground">{total}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-semibold ${Number(rate) > 50 ? "text-red-600" : Number(rate) > 20 ? "text-orange-500" : "text-muted-foreground"}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "View Locked Accounts", tab: "locked" as SecuritySubTab, badge: overview?.lockedCount },
              { label: "Search Login History", tab: "history" as SecuritySubTab },
              { label: "Suspicious Activity", tab: "suspicious" as SecuritySubTab, badge: overview?.suspiciousIpCount, accent: true },
            ].map(({ label, tab, badge, accent }) => (
              <button key={tab} onClick={() => setSubTab(tab)}
                className={`flex items-center justify-between px-4 py-3 border text-sm font-medium transition-colors hover:bg-muted/50 ${
                  accent && badge ? "border-red-300 text-red-700" : "border-border"
                }`}>
                {label}
                {badge ? (
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${accent ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                    {badge}
                  </span>
                ) : (
                  <span className="text-muted-foreground">→</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── LOCKED ACCOUNTS ─────────────────────────────────────────────── */}
      {subTab === "locked" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Accounts currently locked due to repeated failed login attempts.</p>
            <button onClick={() => refetchLocked()} className="text-xs text-primary underline">Refresh</button>
          </div>
          <div className="border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Email", "Failures", "Unlocks In", "Latest IP", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {locked?.accounts.map((acc) => (
                  <tr key={acc.email} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{acc.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">{acc.failureCount}</span>
                    </td>
                    <td className="px-4 py-3"><TimeUntil date={acc.unlocksAt} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{acc.latestIp}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => unlock.mutate(acc.email)} disabled={unlock.isPending}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
                        <Unlock className="w-3 h-3" /> Unlock
                      </button>
                    </td>
                  </tr>
                ))}
                {!locked?.accounts.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No locked accounts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LOGIN HISTORY ────────────────────────────────────────────────── */}
      {subTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <input value={historyEmail} onChange={(e) => { setHistoryEmail(e.target.value); setHistoryPage(1); }}
                placeholder="user@example.com"
                className="border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:border-primary w-48" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">IP Address</label>
              <input value={historyIp} onChange={(e) => { setHistoryIp(e.target.value); setHistoryPage(1); }}
                placeholder="192.168.1.1"
                className="border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:border-primary w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select value={historySuccess} onChange={(e) => { setHistorySuccess(e.target.value as "" | "true" | "false"); setHistoryPage(1); }}
                className="border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:border-primary">
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>
            <button onClick={() => refetchHistory()}
              className="px-4 py-1.5 text-sm font-medium border border-border hover:bg-muted transition-colors">
              Search
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{history?.total ?? 0} results</span>
            <div className="flex gap-2">
              <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1}
                className="px-3 py-1 border border-border hover:bg-muted disabled:opacity-40">← Prev</button>
              <span className="px-3 py-1 border border-border bg-muted">Page {historyPage}</span>
              <button onClick={() => setHistoryPage((p) => p + 1)} disabled={(history?.entries.length ?? 0) < 50}
                className="px-3 py-1 border border-border hover:bg-muted disabled:opacity-40">Next →</button>
            </div>
          </div>

          <div className="border border-border bg-card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Status", "Email", "IP Address", "User Agent", "Time"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history?.entries.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-muted/20 ${!entry.success ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2.5"><Badge success={entry.success} /></td>
                    <td className="px-4 py-2.5 font-medium">{entry.email}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{entry.ip}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{entry.userAgent ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(entry.attemptedAt), "MMM d, HH:mm:ss")}
                    </td>
                  </tr>
                ))}
                {!history?.entries.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No login history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUSPICIOUS ACTIVITY ──────────────────────────────────────────── */}
      {subTab === "suspicious" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">IPs with 10+ failures or targeting 3+ accounts in the last hour.</p>
            <button onClick={() => refetchSuspicious()} className="text-xs text-primary underline">Refresh</button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Suspicious IPs
              {suspicious?.suspiciousIps.length ? (
                <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700">
                  {suspicious.suspiciousIps.length} active
                </span>
              ) : null}
            </h3>
            <div className="border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    {["IP Address", "Failures (1h)", "Distinct Emails", "Latest Attempt"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suspicious?.suspiciousIps.map((ip) => (
                    <tr key={ip.ip} className="hover:bg-muted/20 bg-orange-50/30">
                      <td className="px-4 py-3 font-mono font-medium">{ip.ip}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">{ip.failureCount}</span>
                      </td>
                      <td className="px-4 py-3">{ip.distinctEmails}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(ip.latestAttempt), "MMM d, HH:mm:ss")}</td>
                    </tr>
                  ))}
                  {!suspicious?.suspiciousIps.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No suspicious IPs in the last hour</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Targeted Accounts (3+ distinct IPs attacking in last hour)
              {suspicious?.targetedEmails.length ? (
                <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                  {suspicious.targetedEmails.length} accounts
                </span>
              ) : null}
            </h3>
            {suspicious?.targetedEmails.length ? (
              <div className="border border-border bg-card p-4 space-y-2">
                {suspicious.targetedEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm font-medium">{email}</span>
                    <button onClick={() => unlock.mutate(email)} disabled={unlock.isPending}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
                      <Unlock className="w-3 h-3" /> Force Unlock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-border bg-card px-4 py-8 text-center text-muted-foreground text-sm">
                No accounts are being targeted by distributed attacks
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COMPROMISED ACCOUNTS ─────────────────────────────────────────── */}
      {subTab === "compromised" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Accounts with successful logins from IPs that also attacked 2+ other accounts in the last 24 hours.
              This pattern indicates credential-stuffing — the attacker likely obtained this password from a data breach.
            </p>
            <button onClick={() => refetchCompromised()} className="text-xs text-primary underline shrink-0 ml-4">
              Refresh
            </button>
          </div>

          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <strong>High risk:</strong> 10+ failures or 5+ targeted emails from same IP
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
              <strong>Medium risk:</strong> 2–4 targeted emails from same IP
            </span>
          </div>

          <div className="border border-border bg-card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Risk", "Account Email", "Login IP", "Failures on Others", "Distinct Targets", "Login Time", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compromised?.accounts.map((acc, i) => (
                  <tr key={`${acc.email}-${i}`} className={`hover:bg-muted/20 ${acc.riskLevel === "high" ? "bg-red-50/40" : "bg-orange-50/20"}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                        acc.riskLevel === "high" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        <ShieldAlert className="w-3 h-3" />
                        {acc.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{acc.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{acc.ip}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
                        {acc.ipFailuresOnOthers}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{acc.distinctEmailsFromIp}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(acc.loginAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setResetTarget(acc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap"
                      >
                        <KeyRound className="w-3 h-3" />
                        Force Reset
                      </button>
                    </td>
                  </tr>
                ))}
                {!compromised?.accounts.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldAlert className="w-8 h-8 opacity-30" />
                        <p className="text-sm">No compromised account indicators in the last 24 hours</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {compromised?.accounts.length ? (
            <div className="border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Recommended Actions
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>Use <strong>Force Reset</strong> to immediately revoke sessions and issue a password reset link</li>
                <li>Block the source IPs in your firewall or WAF</li>
                <li>Notify affected users of potential credential exposure</li>
                <li>Check if accounts made any suspicious orders or profile changes</li>
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* ── FORCE RESET CONFIRMATION MODAL ──────────────────────────────── */}
      {resetTarget && (
        <ForceResetModal
          account={resetTarget}
          onClose={() => { setResetTarget(null); forceReset.reset(); }}
          onConfirm={() => forceReset.mutate(resetTarget)}
          isPending={forceReset.isPending}
        />
      )}
    </div>
  );
}
