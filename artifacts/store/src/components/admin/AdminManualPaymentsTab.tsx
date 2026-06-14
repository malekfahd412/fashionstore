import { useState, useEffect } from "react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T = void>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

type ManualPayment = {
  id: number;
  orderId: number;
  method: string;
  referenceNumber: string | null;
  status: string;
  adminNote: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  orderTotal?: number;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const METHOD_LABELS: Record<string, string> = {
  vodafone_cash: "Vodafone Cash",
  etisalat_cash: "Etisalat Cash",
  instapay: "InstaPay",
};

export default function AdminManualPaymentsTab() {
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<ManualPayment | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const data = await apiFetch<{ payments: ManualPayment[]; total: number }>(`/api/admin/payments/manual${qs}`);
      setPayments(data.payments);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [statusFilter]);

  const act = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setActing(true);
    try {
      await apiFetch(`/api/admin/payments/manual/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote: adminNote.trim() || null }),
      } as RequestInit);
      setSelected(null);
      setAdminNote("");
      await load();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold font-serif">Manual Payment Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total</p>
        </div>
        <div className="flex gap-1 border border-border bg-muted/20 p-1">
          {(["all", "pending", "approved", "rejected"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s === "all" ? "" : s)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === (s === "all" ? "" : s) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="border border-border p-6 bg-card space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg">Order #{selected.orderId}</h3>
              <p className="text-sm text-muted-foreground">{selected.userName} · {selected.userEmail}</p>
            </div>
            <button onClick={() => { setSelected(null); setAdminNote(""); }} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Method</p>
              <p className="font-medium">{METHOD_LABELS[selected.method] ?? selected.method}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Reference</p>
              <p className="font-mono font-medium">{selected.referenceNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Amount</p>
              <p className="font-bold">{selected.orderTotal != null ? `${Number(selected.orderTotal).toFixed(2)} EGP` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Submitted</p>
              <p>{format(new Date(selected.createdAt), "MMM d, HH:mm")}</p>
            </div>
          </div>
          {selected.status === "pending" && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <label className="text-xs font-medium block mb-1">Admin Note (optional)</label>
                <input
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Reason for rejection, or confirmation note…"
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => act("approved")}
                  disabled={acting}
                  className="px-5 py-2 bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {acting ? "…" : "✓ Approve"}
                </button>
                <button
                  onClick={() => act("rejected")}
                  disabled={acting}
                  className="px-5 py-2 border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {acting ? "…" : "✕ Reject"}
                </button>
              </div>
            </div>
          )}
          {selected.status !== "pending" && (
            <div className="border-t pt-4 text-sm">
              <span className={`px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[selected.status] ?? "bg-muted text-muted-foreground"}`}>{selected.status}</span>
              {selected.adminNote && <p className="mt-2 text-muted-foreground">{selected.adminNote}</p>}
            </div>
          )}
        </div>
      )}

      <div className="border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No manual payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Order", "Customer", "Method", "Reference", "Amount", "Status", "Date", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-bold">#{p.orderId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.userName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.userEmail ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.referenceNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-bold">{p.orderTotal != null ? `${Number(p.orderTotal).toFixed(2)} EGP` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(p.createdAt), "MMM d, HH:mm")}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(p); setAdminNote(""); }}
                        className="px-3 py-1 text-xs border border-border hover:bg-muted transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
