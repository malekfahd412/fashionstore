import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";
import { getListCategoriesQueryKey } from "@workspace/api-client-react";

type Category = {
  id: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  image: string | null;
  productCount: number;
};

type FormState = {
  nameEn: string;
  nameAr: string;
  slug: string;
  image: string;
};

const EMPTY_FORM: FormState = { nameEn: "", nameAr: "", slug: "", image: "" };

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function CategoryModal({
  initial, onSave, onClose, saving, error,
}: {
  initial: FormState; onSave: (f: FormState) => void;
  onClose: () => void; saving: boolean; error: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const autoSlug = () => {
    if (!form.slug) {
      setForm((f) => ({ ...f, slug: f.nameEn.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-serif font-bold text-xl">{initial.nameEn ? "Edit Category" : "New Category"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name (English) *</label>
            <input value={form.nameEn} onChange={set("nameEn")} onBlur={autoSlug}
              className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name (Arabic) *</label>
            <input value={form.nameAr} onChange={set("nameAr")} dir="rtl"
              className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug</label>
            <input value={form.slug} onChange={set("slug")} placeholder="auto-generated"
              className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Image URL</label>
            <input value={form.image} onChange={set("image")} placeholder="https://..."
              className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            {form.image && (
              <img src={form.image} alt="preview" className="mt-2 h-20 object-cover border border-border" />
            )}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.nameEn || !form.nameAr}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesTab() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Category | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formError, setFormError] = useState("");

  const { data: categories, isLoading, isError } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => adminFetch("/api/categories"),
    staleTime: 60_000,
  });

  const createCat = useMutation({
    mutationFn: (body: Omit<FormState, "image"> & { image?: string }) =>
      adminFetch("/api/categories", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateCat = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<FormState> }) =>
      adminFetch(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteCat = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: getListCategoriesQueryKey() }); setDeleteTarget(null); },
  });

  function handleSave(form: FormState) {
    setFormError("");
    const body = { ...form, image: form.image || undefined };
    if (editTarget === "new") {
      createCat.mutate(body);
    } else if (editTarget) {
      updateCat.mutate({ id: editTarget.id, body });
    }
  }

  const isSaving = createCat.isPending || updateCat.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Category Management</h1>
        <button
          onClick={() => { setEditTarget("new"); setFormError(""); }}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + New Category
        </button>
      </div>

      <div className="border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton /></div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600 text-sm">Failed to load categories.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["ID", "Image", "Name (EN)", "Name (AR)", "Slug", "Products", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories?.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">{cat.id}</td>
                    <td className="px-4 py-3">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.nameEn} className="w-10 h-10 object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{cat.nameEn}</td>
                    <td className="px-4 py-3 text-right" dir="rtl">{cat.nameAr}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cat.slug}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${cat.productCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {cat.productCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditTarget(cat); setFormError(""); }}
                          className="px-2 py-1 text-xs border border-border hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No categories yet. Create one above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {editTarget !== null && (
        <CategoryModal
          initial={
            editTarget === "new"
              ? EMPTY_FORM
              : { nameEn: editTarget.nameEn, nameAr: editTarget.nameAr, slug: editTarget.slug, image: editTarget.image ?? "" }
          }
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
          saving={isSaving}
          error={formError}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="font-bold text-lg mb-2">Delete Category</h3>
            {deleteTarget.productCount > 0 ? (
              <p className="text-sm text-amber-600 mb-4">
                ⚠️ This category has <strong>{deleteTarget.productCount} product(s)</strong>. Deleting it will affect those products. Proceed?
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                Delete "<strong>{deleteTarget.nameEn}</strong>"? This cannot be undone.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => deleteCat.mutate(deleteTarget.id)}
                disabled={deleteCat.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteCat.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
