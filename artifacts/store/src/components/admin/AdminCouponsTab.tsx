import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";
import { format } from "date-fns";

type Coupon = {
  id: number;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number | null;
  usageLimit: number | null;
  usageCount: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdAt: string;
};

type CouponForm = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

const EMPTY_FORM: CouponForm = {
  code: "", discountType: "percentage", discountValue: "", minOrderValue: "",
  usageLimit: "", startDate: "", endDate: "", active: true,
};

function isCouponExpired(c: Coupon) {
  if (!c.endDate) return false;
  return new Date(c.endDate) < new Date();
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function CouponModal({
  initial, onSave, onClose, saving, error,
}: {
  initial: CouponForm; onSave: (f: CouponForm) => void;
  onClose: () => void; saving: boolean; error: string;
}) {
  const [form, setForm] = useState<CouponForm>(initial);
  const set = (k: keyof CouponForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-serif font-bold text-xl">{initial.code ? "Edit Coupon" : "New Coupon"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coupon Code *</label>
              <input value={form.code} onChange={set("code")} placeholder="SUMMER20"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Discount Type *</label>
              <select value={form.discountType} onChange={set("discountType")}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Discount Value * {form.discountType === "percentage" ? "(%)" : "($)"}
              </label>
              <input value={form.discountValue} onChange={set("discountValue")} type="number" min="0" step="0.01" placeholder="0"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Min Order Value ($)</label>
              <input value={form.minOrderValue} onChange={set("minOrderValue")} type="number" min="0" step="0.01" placeholder="No minimum"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usage Limit</label>
              <input value={form.usageLimit} onChange={set("usageLimit")} type="number" min="0" placeholder="Unlimited"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date</label>
              <input value={form.startDate} onChange={set("startDate")} type="date"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Date</label>
              <input value={form.endDate} onChange={set("endDate")} type="date"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={set("active")} className="w-4 h-4" />
            <span className="text-sm font-medium">Active (customers can use this coupon)</span>
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.code || !form.discountValue}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCouponsTab() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Coupon | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [formError, setFormError] = useState("");

  const { data: coupons, isLoading, isError } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => adminFetch("/api/coupons"),
    staleTime: 30_000,
  });

  function couponToForm(c: Coupon): CouponForm {
    return {
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minOrderValue: c.minOrderValue != null ? String(c.minOrderValue) : "",
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
      active: c.active,
    };
  }

  function formToBody(f: CouponForm) {
    return {
      code: f.code.toUpperCase(),
      discountType: f.discountType,
      discountValue: Number(f.discountValue),
      minOrderValue: f.minOrderValue ? Number(f.minOrderValue) : null,
      usageLimit: f.usageLimit ? Number(f.usageLimit) : null,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      active: f.active,
    };
  }

  const createCoupon = useMutation({
    mutationFn: (body: ReturnType<typeof formToBody>) =>
      adminFetch("/api/coupons", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateCoupon = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<ReturnType<typeof formToBody>> }) =>
      adminFetch(`/api/coupons/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteCoupon = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); setDeleteTarget(null); },
  });

  const toggleActive = (c: Coupon) => updateCoupon.mutate({ id: c.id, body: { active: !c.active } });

  function handleSave(form: CouponForm) {
    setFormError("");
    const body = formToBody(form);
    if (editTarget === "new") {
      createCoupon.mutate(body);
    } else if (editTarget) {
      updateCoupon.mutate({ id: editTarget.id, body });
    }
  }

  const isSaving = createCoupon.isPending || updateCoupon.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Coupon Management</h1>
        <button
          onClick={() => { setEditTarget("new"); setFormError(""); }}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + New Coupon
        </button>
      </div>

      <div className="border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton /></div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600 text-sm">Failed to load coupons.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Code", "Type", "Value", "Min Order", "Used / Limit", "Expiry", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons?.map((c) => {
                  const expired = isCouponExpired(c);
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                      <td className="px-4 py-3 capitalize">{c.discountType}</td>
                      <td className="px-4 py-3 font-bold">
                        {c.discountType === "percentage" ? `${c.discountValue}%` : `$${c.discountValue.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.minOrderValue ? `$${c.minOrderValue}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={c.usageLimit && c.usageCount >= c.usageLimit ? "text-red-600 font-bold" : ""}>
                          {c.usageCount} / {c.usageLimit ?? "∞"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.endDate ? (
                          <span className={expired ? "text-red-600 font-medium" : ""}>
                            {expired ? "Expired " : ""}{format(new Date(c.endDate), "MMM d, yyyy")}
                          </span>
                        ) : "No expiry"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`px-2 py-0.5 text-xs font-medium rounded-sm transition-colors ${c.active && !expired ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          {c.active && !expired ? "Active" : expired ? "Expired" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditTarget(c); setFormError(""); }}
                            className="px-2 py-1 text-xs border border-border hover:bg-muted transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {coupons?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No coupons yet. Create one above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editTarget !== null && (
        <CouponModal
          initial={editTarget === "new" ? EMPTY_FORM : couponToForm(editTarget)}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
          saving={isSaving}
          error={formError}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="font-bold text-lg mb-2">Delete Coupon</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Delete coupon <strong className="font-mono">{deleteTarget.code}</strong>? It has been used {deleteTarget.usageCount} time(s). This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => deleteCoupon.mutate(deleteTarget.id)}
                disabled={deleteCoupon.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteCoupon.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
