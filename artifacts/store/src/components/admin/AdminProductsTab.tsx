import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";

type Variant = { id?: number; color: string; size: string; stockQuantity: number };
type ProductImage = { id?: number; imageUrl: string; isPrimary: boolean };
type Product = {
  id: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  price: number;
  salePrice: number | null;
  categoryId: number;
  categoryName: string;
  vendorId: number;
  vendorName: string;
  active: boolean;
  featured: boolean;
  images: ProductImage[];
  variants: Variant[];
  averageRating: number;
  reviewCount: number;
  createdAt: string;
};
type ProductListResponse = { products: Product[]; total: number; page: number; limit: number };
type Category = { id: number; nameEn: string };
type UserRow = { id: number; name: string; email: string; role: string };

type ProductForm = {
  nameEn: string; nameAr: string;
  descriptionEn: string; descriptionAr: string;
  price: string; salePrice: string;
  categoryId: string; vendorId: string;
  active: boolean; featured: boolean;
  images: string[];
  variants: { color: string; size: string; stockQuantity: string }[];
};

const EMPTY_FORM: ProductForm = {
  nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "",
  price: "", salePrice: "", categoryId: "", vendorId: "",
  active: true, featured: false,
  images: [""], variants: [{ color: "", size: "", stockQuantity: "0" }],
};

function productToForm(p: Product): ProductForm {
  return {
    nameEn: p.nameEn, nameAr: p.nameAr,
    descriptionEn: p.descriptionEn ?? "", descriptionAr: p.descriptionAr ?? "",
    price: String(p.price), salePrice: p.salePrice != null ? String(p.salePrice) : "",
    categoryId: String(p.categoryId), vendorId: String(p.vendorId),
    active: p.active, featured: p.featured,
    images: p.images.length ? p.images.map((i) => i.imageUrl) : [""],
    variants: p.variants.length
      ? p.variants.map((v) => ({ color: v.color, size: v.size, stockQuantity: String(v.stockQuantity) }))
      : [{ color: "", size: "", stockQuantity: "0" }],
  };
}

function formToBody(f: ProductForm) {
  return {
    nameEn: f.nameEn, nameAr: f.nameAr,
    descriptionEn: f.descriptionEn || null, descriptionAr: f.descriptionAr || null,
    price: Number(f.price),
    salePrice: f.salePrice ? Number(f.salePrice) : null,
    categoryId: Number(f.categoryId),
    vendorId: Number(f.vendorId),
    active: f.active, featured: f.featured,
    images: f.images.filter(Boolean),
    variants: f.variants
      .filter((v) => v.color || v.size)
      .map((v) => ({ color: v.color, size: v.size, stockQuantity: Number(v.stockQuantity) })),
  };
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function ProductModal({
  initial, categories, vendors, onSave, onClose, saving, error,
}: {
  initial: ProductForm;
  categories: Category[];
  vendors: UserRow[];
  onSave: (f: ProductForm) => void;
  onClose: () => void;
  saving: boolean;
  error: string;
}) {
  const [form, setForm] = useState<ProductForm>(initial);

  const setField = (k: keyof ProductForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const setImage = (idx: number, val: string) =>
    setForm((f) => { const imgs = [...f.images]; imgs[idx] = val; return { ...f, images: imgs }; });
  const addImage = () => setForm((f) => ({ ...f, images: [...f.images, ""] }));
  const removeImage = (idx: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const setVariant = (idx: number, k: keyof Variant, val: string) =>
    setForm((f) => {
      const vs = f.variants.map((v, i) => i === idx ? { ...v, [k]: val } : v);
      return { ...f, variants: vs };
    });
  const addVariant = () =>
    setForm((f) => ({ ...f, variants: [...f.variants, { color: "", size: "", stockQuantity: "0" }] }));
  const removeVariant = (idx: number) =>
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));

  const isNew = !initial.nameEn;
  const canSave = form.nameEn && form.nameAr && form.price && form.categoryId && form.vendorId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border max-w-2xl w-full mx-4 shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="font-serif font-bold text-xl">{isNew ? "New Product" : "Edit Product"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name (English) *</label>
              <input value={form.nameEn} onChange={setField("nameEn")}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name (Arabic) *</label>
              <input value={form.nameAr} onChange={setField("nameAr")} dir="rtl"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description (EN)</label>
              <textarea value={form.descriptionEn} onChange={setField("descriptionEn")} rows={2}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description (AR)</label>
              <textarea value={form.descriptionAr} onChange={setField("descriptionAr")} rows={2} dir="rtl"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>
          </div>

          {/* Pricing & assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price ($) *</label>
              <input value={form.price} onChange={setField("price")} type="number" min="0" step="0.01"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sale Price ($)</label>
              <input value={form.salePrice} onChange={setField("salePrice")} type="number" min="0" step="0.01" placeholder="Leave blank if no sale"
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category *</label>
              <select value={form.categoryId} onChange={setField("categoryId")}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor *</label>
              <select value={form.vendorId} onChange={setField("vendorId")}
                className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Select vendor...</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.email})</option>)}
              </select>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={setField("active")} className="w-4 h-4" />
              <span className="text-sm font-medium">Active (visible in store)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={setField("featured")} className="w-4 h-4" />
              <span className="text-sm font-medium">Featured (homepage highlight)</span>
            </label>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Images (URLs)</label>
              <button onClick={addImage} className="text-xs text-primary hover:underline">+ Add Image</button>
            </div>
            {form.images.map((url, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input value={url} onChange={(e) => setImage(idx, e.target.value)} placeholder="https://..."
                  className="flex-1 border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                {url && <img src={url} alt="" className="w-8 h-8 object-cover border border-border" onError={() => {}} />}
                {form.images.length > 1 && (
                  <button onClick={() => removeImage(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-1">✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Variants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variants (Color / Size / Stock)</label>
              <button onClick={addVariant} className="text-xs text-primary hover:underline">+ Add Variant</button>
            </div>
            <div className="space-y-2">
              {form.variants.map((v, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input value={v.color} onChange={(e) => setVariant(idx, "color", e.target.value)} placeholder="Color"
                    className="flex-1 border border-border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input value={v.size} onChange={(e) => setVariant(idx, "size", e.target.value)} placeholder="Size"
                    className="flex-1 border border-border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input value={v.stockQuantity} onChange={(e) => setVariant(idx, "stockQuantity", e.target.value)} type="number" min="0" placeholder="Stock"
                    className="w-20 border border-border px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                  {form.variants.length > 1 && (
                    <button onClick={() => removeVariant(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-1">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end p-6 border-t border-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !canSave}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Create Product" : "Update Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<Product | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [formError, setFormError] = useState("");

  const params = new URLSearchParams();
  params.set("showAll", "true");
  params.set("page", String(page));
  params.set("limit", "20");
  if (search) params.set("search", search);

  const { data, isLoading, isError } = useQuery<ProductListResponse>({
    queryKey: ["admin-products", search, page],
    queryFn: () => adminFetch(`/api/products?${params}`),
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => adminFetch("/api/categories"),
    staleTime: 300_000,
  });

  const { data: vendorData } = useQuery<{ users: UserRow[] }>({
    queryKey: ["admin-vendors"],
    queryFn: () => adminFetch("/api/users?role=vendor&limit=200"),
    staleTime: 300_000,
  });
  const vendors = vendorData?.users ?? [];

  const createProduct = useMutation({
    mutationFn: (body: ReturnType<typeof formToBody>) =>
      adminFetch("/api/products", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<ReturnType<typeof formToBody>> }) =>
      adminFetch(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); setEditTarget(null); setFormError(""); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); setDeleteTarget(null); },
  });

  const toggleActive = (p: Product) => updateProduct.mutate({ id: p.id, body: { active: !p.active } });
  const toggleFeatured = (p: Product) => updateProduct.mutate({ id: p.id, body: { featured: !p.featured } });

  function handleSave(form: ProductForm) {
    setFormError("");
    const body = formToBody(form);
    if (editTarget === "new") {
      createProduct.mutate(body);
    } else if (editTarget) {
      updateProduct.mutate({ id: editTarget.id, body });
    }
  }

  const isSaving = createProduct.isPending || updateProduct.isPending;

  const allProducts = data?.products ?? [];
  const filteredProducts = allProducts.filter((p) => {
    if (activeFilter === "active") return p.active;
    if (activeFilter === "inactive") return !p.active;
    return true;
  });

  const total = data?.total ?? 0;
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Product Management</h1>
        <button
          onClick={() => { setEditTarget("new"); setFormError(""); }}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 border border-border bg-muted/20 p-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${activeFilter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <input
            type="text" placeholder="Search products..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="flex-1 border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={() => { setSearch(searchInput); setPage(1); }}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton /></div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600 text-sm">Failed to load products.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Image", "Product", "Category", "Vendor", "Price", "Variants", "Active", "Featured", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => {
                  const primaryImg = product.images.find((i) => i.isPrimary) ?? product.images[0];
                  return (
                    <tr key={product.id} className={`hover:bg-muted/20 ${!product.active ? "opacity-60" : ""}`}>
                      <td className="px-3 py-3">
                        {primaryImg ? (
                          <img src={primaryImg.imageUrl} alt={product.nameEn} className="w-10 h-10 object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 bg-muted flex items-center justify-center text-xs text-muted-foreground">IMG</div>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-[140px]">
                        <div className="font-medium truncate">{product.nameEn}</div>
                        <div className="text-xs text-muted-foreground truncate" dir="rtl">{product.nameAr}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{product.categoryName}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs max-w-[100px] truncate">{product.vendorName}</td>
                      <td className="px-3 py-3 font-bold whitespace-nowrap">
                        {product.salePrice ? (
                          <>
                            <span className="text-primary">{product.salePrice.toFixed(2)} EGP</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">{product.price.toFixed(2)} EGP</span>
                          </>
                        ) : `${product.price.toFixed(2)} EGP`}
                      </td>
                      <td className="px-3 py-3 text-center">{product.variants.length}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`px-2 py-0.5 text-xs font-medium rounded-sm transition-colors ${product.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                        >
                          {product.active ? "Yes" : "No"}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleFeatured(product)}
                          className={`px-2 py-0.5 text-xs font-medium rounded-sm transition-colors ${product.featured ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                        >
                          {product.featured ? "⭐ Yes" : "No"}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditTarget(product); setFormError(""); }}
                            className="px-2 py-1 text-xs border border-border hover:bg-muted transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="px-2 py-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      {isLoading ? "Loading..." : "No products found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">← Prev</button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">Next →</button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {editTarget !== null && (
        <ProductModal
          initial={editTarget === "new" ? EMPTY_FORM : productToForm(editTarget)}
          categories={categories as Category[]}
          vendors={vendors}
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
            <h3 className="font-bold text-lg mb-2">Delete Product</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Permanently delete "<strong>{deleteTarget.nameEn}</strong>"? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={() => deleteProduct.mutate(deleteTarget.id)}
                disabled={deleteProduct.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteProduct.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
