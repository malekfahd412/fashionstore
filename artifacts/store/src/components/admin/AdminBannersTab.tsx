import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";

type Banner = {
  id: number;
  titleEn: string | null;
  titleAr: string | null;
  subtitleEn: string | null;
  subtitleAr: string | null;
  imageUrl: string;
  ctaText: string | null;
  ctaLink: string | null;
  active: boolean;
  sortOrder: number;
};

type BannerForm = {
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_FORM: BannerForm = {
  titleEn: "", titleAr: "", subtitleEn: "", subtitleAr: "",
  imageUrl: "", ctaText: "", ctaLink: "", active: true, sortOrder: "0",
};

function bannerToForm(b: Banner): BannerForm {
  return {
    titleEn: b.titleEn ?? "", titleAr: b.titleAr ?? "",
    subtitleEn: b.subtitleEn ?? "", subtitleAr: b.subtitleAr ?? "",
    imageUrl: b.imageUrl, ctaText: b.ctaText ?? "", ctaLink: b.ctaLink ?? "",
    active: b.active, sortOrder: String(b.sortOrder),
  };
}

function formToBody(f: BannerForm) {
  return {
    titleEn: f.titleEn || null,
    titleAr: f.titleAr || null,
    subtitleEn: f.subtitleEn || null,
    subtitleAr: f.subtitleAr || null,
    imageUrl: f.imageUrl,
    ctaText: f.ctaText || null,
    ctaLink: f.ctaLink || null,
    active: f.active,
    sortOrder: Number(f.sortOrder) || 0,
  };
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-48 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function BannerModal({
  initial, onSave, onClose, saving, error,
}: {
  initial: BannerForm; onSave: (f: BannerForm) => void;
  onClose: () => void; saving: boolean; error: string;
}) {
  const [form, setForm] = useState<BannerForm>(initial);
  const set = (k: keyof BannerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-serif font-bold text-xl">{initial.imageUrl ? "Edit Banner" : "New Banner"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Image URL *</label>
            <input value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://..."
              className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="preview" className="mt-2 h-32 w-full object-cover border border-border" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title (EN)</label>
              <input value={form.titleEn} onChange={set("titleEn")}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title (AR)</label>
              <input value={form.titleAr} onChange={set("titleAr")} dir="rtl"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subtitle (EN)</label>
              <input value={form.subtitleEn} onChange={set("subtitleEn")}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subtitle (AR)</label>
              <input value={form.subtitleAr} onChange={set("subtitleAr")} dir="rtl"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CTA Button Text</label>
              <input value={form.ctaText} onChange={set("ctaText")} placeholder="Shop Now"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CTA Link</label>
              <input value={form.ctaLink} onChange={set("ctaLink")} placeholder="/shop"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sort Order</label>
              <input value={form.sortOrder} onChange={set("sortOrder")} type="number" min="0"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={set("active")} className="w-4 h-4" />
            <span className="text-sm font-medium">Active (show on homepage)</span>
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.imageUrl}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBannersTab() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Banner | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [formError, setFormError] = useState("");

  const { data: banners, isLoading, isError } = useQuery<Banner[]>({
    queryKey: ["admin-banners-all"],
    queryFn: () => adminFetch("/api/banners/all"),
    staleTime: 30_000,
  });

  const createBanner = useMutation({
    mutationFn: (body: ReturnType<typeof formToBody>) =>
      adminFetch("/api/banners", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners-all"] }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateBanner = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<ReturnType<typeof formToBody>> }) =>
      adminFetch(`/api/banners/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners-all"] }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteBanner = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/banners/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners-all"] }); setDeleteTarget(null); },
  });

  const toggleActive = (b: Banner) => updateBanner.mutate({ id: b.id, body: { active: !b.active } });

  function handleSave(form: BannerForm) {
    setFormError("");
    const body = formToBody(form);
    if (editTarget === "new") {
      createBanner.mutate(body);
    } else if (editTarget) {
      updateBanner.mutate({ id: editTarget.id, body });
    }
  }

  const isSaving = createBanner.isPending || updateBanner.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Banner / Homepage CMS</h1>
        <button
          onClick={() => { setEditTarget("new"); setFormError(""); }}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + New Banner
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Banners appear on the homepage in order of their sort number. Only active banners are shown to customers.
      </p>

      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <div className="p-12 text-center text-red-600 text-sm border border-border">Failed to load banners.</div>
      ) : banners?.length === 0 ? (
        <div className="p-16 text-center border border-border bg-muted/10">
          <p className="text-muted-foreground">No banners yet. Add one to display on the homepage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners?.sort((a, b) => a.sortOrder - b.sortOrder).map((banner) => (
            <div key={banner.id} className={`border border-border bg-card overflow-hidden ${!banner.active ? "opacity-60" : ""}`}>
              <div className="relative">
                <img
                  src={banner.imageUrl}
                  alt={banner.titleEn ?? "banner"}
                  className="w-full h-40 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-black/60 text-white">#{banner.sortOrder}</span>
                  <span className={`px-1.5 py-0.5 text-xs font-medium ${banner.active ? "bg-green-600 text-white" : "bg-gray-600 text-white"}`}>
                    {banner.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {banner.titleEn && <p className="font-semibold text-sm truncate">{banner.titleEn}</p>}
                {banner.subtitleEn && <p className="text-xs text-muted-foreground truncate">{banner.subtitleEn}</p>}
                {banner.ctaLink && (
                  <p className="text-xs text-muted-foreground font-mono truncate">→ {banner.ctaLink}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => toggleActive(banner)}
                    className="flex-1 px-2 py-1.5 text-xs border border-border hover:bg-muted transition-colors"
                  >
                    {banner.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => { setEditTarget(banner); setFormError(""); }}
                    className="flex-1 px-2 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(banner)}
                    className="px-2 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget !== null && (
        <BannerModal
          initial={editTarget === "new" ? EMPTY_FORM : bannerToForm(editTarget)}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
          saving={isSaving}
          error={formError}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="font-bold text-lg mb-2">Delete Banner</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Delete this banner{deleteTarget.titleEn ? ` "${deleteTarget.titleEn}"` : ""}? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => deleteBanner.mutate(deleteTarget.id)}
                disabled={deleteBanner.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteBanner.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
