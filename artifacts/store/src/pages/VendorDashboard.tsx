import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useGetVendorSummary, useListProducts, useListOrders, useGetSalesTimeline, useGetTopProducts,
  useCreateProduct, useUpdateProduct, useListCategories,
  getGetVendorSummaryQueryKey, getListProductsQueryKey, getListOrdersQueryKey, getGetSalesTimelineQueryKey, getGetTopProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function VendorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");

  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "",
    price: "", salePrice: "", categoryId: "", active: true,
    images: [""], variants: [{ color: "", size: "", stockQuantity: "0" }],
  });
  const [productFormError, setProductFormError] = useState("");

  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "",
    price: "", salePrice: "", categoryId: "", active: true, images: [""],
    variants: [{ color: "", size: "", stockQuantity: "0" }],
  });
  const [editFormError, setEditFormError] = useState("");

  const { data: categories } = useListCategories();
  const { data: summary } = useGetVendorSummary({ query: { enabled: !!user, queryKey: getGetVendorSummaryQueryKey() } });
  const { data: productsData } = useListProducts({ vendorId: user?.id }, { query: { enabled: !!user, queryKey: getListProductsQueryKey({ vendorId: user?.id }) } });
  const { data: ordersData } = useListOrders({ vendorId: user?.id }, { query: { enabled: !!user, queryKey: getListOrdersQueryKey({ vendorId: user?.id }) } });
  const { data: salesTimeline } = useGetSalesTimeline({ period: 'month' }, { query: { enabled: !!user, queryKey: getGetSalesTimelineQueryKey({ period: 'month' }) } });
  const { data: topProducts } = useGetTopProducts({ query: { enabled: !!user, queryKey: getGetTopProductsQueryKey() } });

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  useEffect(() => {
    if (!user) setLocation("/login?from=/dashboard/vendor");
  }, [user, setLocation]);

  if (!user) return null;
  if (user.role !== "vendor") return <AccessDenied reason="vendor_required" redirectTo="/dashboard/vendor" />;

  const orders = (ordersData as { orders?: unknown[] } | undefined)?.orders ?? [];

  const statusColors: Record<string, string> = {
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  function openEditDialog(product: NonNullable<typeof productsData>["products"][number]) {
    setEditingProductId(product.id);
    setEditForm({
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      descriptionEn: product.descriptionEn ?? "",
      descriptionAr: product.descriptionAr ?? "",
      price: String(product.price),
      salePrice: product.salePrice ? String(product.salePrice) : "",
      categoryId: String(product.categoryId),
      active: product.active ?? true,
      images: product.images?.length ? product.images.map((img: { imageUrl: string }) => img.imageUrl) : [""],
      variants: product.variants?.length
        ? product.variants.map((v: { color?: string | null; size?: string | null; stockQuantity?: number | null }) => ({
            color: v.color ?? "",
            size: v.size ?? "",
            stockQuantity: String(v.stockQuantity ?? 0),
          }))
        : [{ color: "", size: "", stockQuantity: "0" }],
    });
    setEditFormError("");
    setIsEditProductOpen(true);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold mb-1">Vendor Portal</h1>
          <p className="text-muted-foreground">{user.name}</p>
        </div>

        {/* ── Create Product Dialog ── */}
        <Dialog open={isCreateProductOpen} onOpenChange={(open) => {
          setIsCreateProductOpen(open);
          if (!open) {
            setProductForm({ nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", price: "", salePrice: "", categoryId: "", active: true, images: [""], variants: [{ color: "", size: "", stockQuantity: "0" }] });
            setProductFormError("");
          }
        }}>
          <DialogTrigger asChild>
            <Button>Add New Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Name (English) *</label>
                  <input value={productForm.nameEn} onChange={e => setProductForm(f => ({ ...f, nameEn: e.target.value }))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Name (Arabic) *</label>
                  <input value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl"
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Description (EN)</label>
                  <textarea value={productForm.descriptionEn} onChange={e => setProductForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={2}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Description (AR)</label>
                  <textarea value={productForm.descriptionAr} onChange={e => setProductForm(f => ({ ...f, descriptionAr: e.target.value }))} rows={2} dir="rtl"
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Price (EGP) *</label>
                  <input type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Sale Price (EGP)</label>
                  <input type="number" min="0" step="0.01" value={productForm.salePrice} onChange={e => setProductForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="Leave blank if no sale"
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Category *</label>
                  <select value={productForm.categoryId} onChange={e => setProductForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select category…</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={productForm.active} onChange={e => setProductForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
                <span className="font-medium">Active (visible in store)</span>
              </label>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Images (URLs)</label>
                  <button type="button" onClick={() => setProductForm(f => ({ ...f, images: [...f.images, ""] }))} className="text-xs text-primary hover:underline">+ Add Image</button>
                </div>
                {productForm.images.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-1.5">
                    <input value={url} onChange={e => setProductForm(f => { const imgs = [...f.images]; imgs[idx] = e.target.value; return { ...f, images: imgs }; })} placeholder="https://…"
                      className="flex-1 border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    {productForm.images.length > 1 && (
                      <button type="button" onClick={() => setProductForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold px-1 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variants (Color / Size / Stock)</label>
                  <button type="button" onClick={() => setProductForm(f => ({ ...f, variants: [...f.variants, { color: "", size: "", stockQuantity: "0" }] }))} className="text-xs text-primary hover:underline">+ Add Variant</button>
                </div>
                {productForm.variants.map((v, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-1.5">
                    <input value={v.color} onChange={e => setProductForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, color: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Color"
                      className="flex-1 border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input value={v.size} onChange={e => setProductForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, size: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Size"
                      className="flex-1 border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input type="number" min="0" value={v.stockQuantity} onChange={e => setProductForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, stockQuantity: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Stock"
                      className="w-20 border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    {productForm.variants.length > 1 && (
                      <button type="button" onClick={() => setProductForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold px-1 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {productFormError && <p className="text-sm text-destructive">{productFormError}</p>}
              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setIsCreateProductOpen(false)}>Cancel</Button>
                <Button
                  disabled={createProductMutation.isPending || !productForm.nameEn || !productForm.nameAr || !productForm.price || !productForm.categoryId}
                  onClick={() => {
                    setProductFormError("");
                    createProductMutation.mutate({
                      data: {
                          nameEn: productForm.nameEn,
                          nameAr: productForm.nameAr,
                          descriptionEn: productForm.descriptionEn || null,
                          descriptionAr: productForm.descriptionAr || null,
                          price: Number(productForm.price),
                          salePrice: productForm.salePrice ? Number(productForm.salePrice) : null,
                          categoryId: Number(productForm.categoryId),
                          active: productForm.active,
                          images: productForm.images.filter(Boolean),
                          variants: productForm.variants.filter(v => v.color || v.size).map(v => ({ color: v.color, size: v.size, stockQuantity: Number(v.stockQuantity) })),
                      } as unknown as Parameters<typeof createProductMutation.mutate>[0]["data"],
                    }, {
                      onSuccess: () => {
                        toast({ title: "Product created!" });
                        setIsCreateProductOpen(false);
                        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ vendorId: user?.id }) });
                        queryClient.invalidateQueries({ queryKey: getGetVendorSummaryQueryKey() });
                      },
                      onError: (err: Error) => setProductFormError(err.message),
                    });
                  }}
                >
                  {createProductMutation.isPending ? "Creating…" : "Create Product"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Edit Product Dialog ── */}
        <Dialog open={isEditProductOpen} onOpenChange={(open) => {
          setIsEditProductOpen(open);
          if (!open) { setEditingProductId(null); setEditFormError(""); }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Name (English) *</label>
                  <input value={editForm.nameEn} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Name (Arabic) *</label>
                  <input value={editForm.nameAr} onChange={e => setEditForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl"
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Description (EN)</label>
                  <textarea value={editForm.descriptionEn} onChange={e => setEditForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={2}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Description (AR)</label>
                  <textarea value={editForm.descriptionAr} onChange={e => setEditForm(f => ({ ...f, descriptionAr: e.target.value }))} rows={2} dir="rtl"
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Price (EGP) *</label>
                  <input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Sale Price (EGP)</label>
                  <input type="number" min="0" step="0.01" value={editForm.salePrice} onChange={e => setEditForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="Leave blank if no sale"
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Category *</label>
                  <select value={editForm.categoryId} onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select category…</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
                <span className="font-medium">Active (visible in store)</span>
              </label>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Images (URLs)</label>
                  <button type="button" onClick={() => setEditForm(f => ({ ...f, images: [...f.images, ""] }))} className="text-xs text-primary hover:underline">+ Add Image</button>
                </div>
                {editForm.images.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-1.5">
                    <input value={url} onChange={e => setEditForm(f => { const imgs = [...f.images]; imgs[idx] = e.target.value; return { ...f, images: imgs }; })} placeholder="https://…"
                      className="flex-1 border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    {editForm.images.length > 1 && (
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold px-1 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Variants (Color / Size / Stock)</label>
                  <button type="button" onClick={() => setEditForm(f => ({ ...f, variants: [...f.variants, { color: "", size: "", stockQuantity: "0" }] }))} className="text-xs text-primary hover:underline">+ Add Variant</button>
                </div>
                {editForm.variants.map((v, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-1.5">
                    <input value={v.color} onChange={e => setEditForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, color: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Color"
                      className="flex-1 border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input value={v.size} onChange={e => setEditForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, size: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Size"
                      className="flex-1 border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <input type="number" min="0" value={v.stockQuantity} onChange={e => setEditForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, stockQuantity: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Stock"
                      className="w-20 border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    {editForm.variants.length > 1 && (
                      <button type="button" onClick={() => setEditForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold px-1 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {editFormError && <p className="text-sm text-destructive">{editFormError}</p>}
              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
                <Button
                  disabled={updateProductMutation.isPending || !editForm.nameEn || !editForm.nameAr || !editForm.price || !editForm.categoryId || !editingProductId}
                  onClick={() => {
                    if (!editingProductId) return;
                    setEditFormError("");
                    updateProductMutation.mutate({
                      id: editingProductId,
                      data: {
                        nameEn: editForm.nameEn,
                        nameAr: editForm.nameAr,
                        descriptionEn: editForm.descriptionEn || null,
                        descriptionAr: editForm.descriptionAr || null,
                        price: Number(editForm.price),
                        salePrice: editForm.salePrice ? Number(editForm.salePrice) : null,
                        categoryId: Number(editForm.categoryId),
                        active: editForm.active,
                        images: editForm.images.filter(Boolean),
                        variants: editForm.variants.filter(v => v.color || v.size).map(v => ({ color: v.color, size: v.size, stockQuantity: Number(v.stockQuantity) })),
                      } as unknown as Parameters<typeof updateProductMutation.mutate>[0]["data"],
                    }, {
                      onSuccess: () => {
                        toast({ title: "Product updated!" });
                        setIsEditProductOpen(false);
                        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({ vendorId: user?.id }) });
                        queryClient.invalidateQueries({ queryKey: getGetVendorSummaryQueryKey() });
                      },
                      onError: (err: Error) => setEditFormError(err.message),
                    });
                  }}
                >
                  {updateProductMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 w-full justify-start overflow-x-auto rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-6 py-3">Overview</TabsTrigger>
          <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-6 py-3">Products</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-6 py-3">Orders</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent px-6 py-3">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-border p-6 bg-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold">{Number(summary?.totalRevenue || 0).toFixed(2)} EGP</p>
            </div>
            <div className="border border-border p-6 bg-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Orders</h3>
              <p className="text-3xl font-bold">{summary?.totalOrders || 0}</p>
            </div>
            <div className="border border-border p-6 bg-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Products</h3>
              <p className="text-3xl font-bold">{summary?.totalProducts || 0}</p>
            </div>
            <div className="border border-border p-6 bg-card">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Pending Orders</h3>
              <p className="text-3xl font-bold">{summary?.pendingOrders || 0}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-border p-6">
              <h3 className="font-serif text-xl font-bold mb-6">Recent Sales</h3>
              <div className="h-72">
                {salesTimeline ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTimeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MMM dd")} />
                      <YAxis tickFormatter={(val) => `${val} EGP`} />
                      <Tooltip
                        labelFormatter={(val) => format(new Date(val), "MMM dd, yyyy")}
                        formatter={(val: number) => [`${Number(val).toFixed(2)} EGP`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
                )}
              </div>
            </div>

            <div className="border border-border p-6">
              <h3 className="font-serif text-xl font-bold mb-6">Top Products</h3>
              <div className="space-y-4">
                {topProducts?.slice(0, 5).map(product => (
                  <div key={product.productId} className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="w-12 h-12 bg-muted shrink-0 overflow-hidden">
                      {product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{language === 'en' ? product.nameEn : product.nameAr}</p>
                      <p className="text-sm text-muted-foreground">{product.totalSold} units sold</p>
                    </div>
                    <div className="text-right font-bold shrink-0">
                      {product.revenue.toFixed(2)} EGP
                    </div>
                  </div>
                ))}
                {!topProducts?.length && <p className="text-muted-foreground text-center py-8">No sales data yet</p>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products" className="m-0">
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productsData?.products.map(product => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted shrink-0 overflow-hidden">
                          {product.images?.[0] && <img src={product.images[0].imageUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <span className="line-clamp-1">{language === 'en' ? product.nameEn : product.nameAr}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{Number(product.price).toFixed(2)} EGP</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${product.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {product.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(product.createdAt), "MMM dd, yyyy")}</td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>Edit</Button>
                    </td>
                  </tr>
                ))}
                {!productsData?.products.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No products yet. Click "Add New Product" to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="m-0">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border border-border">
              No orders received yet
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{order.id}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), "MMM dd, yyyy") : "—"}
                      </td>
                      <td className="px-6 py-4">{order.items?.length ?? "—"}</td>
                      <td className="px-6 py-4 font-bold">{Number(order.totalPrice ?? 0).toFixed(2)} EGP</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[order.status] ?? "bg-muted text-muted-foreground"}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="m-0 space-y-8">
          <div className="border border-border p-6">
            <h3 className="font-serif text-xl font-bold mb-2">Revenue Over Time</h3>
            <p className="text-sm text-muted-foreground mb-6">Last 30 days</p>
            <div className="h-80">
              {salesTimeline ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTimeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MMM dd")} />
                    <YAxis tickFormatter={(val) => `${val} EGP`} />
                    <Tooltip
                      labelFormatter={(val) => format(new Date(val), "MMM dd, yyyy")}
                      formatter={(val: number) => [`${Number(val).toFixed(2)} EGP`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
              )}
            </div>
          </div>

          <div className="border border-border p-6">
            <h3 className="font-serif text-xl font-bold mb-2">Top Selling Products</h3>
            <p className="text-sm text-muted-foreground mb-6">Units sold</p>
            <div className="h-64">
              {topProducts?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts.slice(0, 5)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey={language === 'en' ? 'nameEn' : 'nameAr'}
                      width={130}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(val: number) => [val, "Units Sold"]} />
                    <Bar dataKey="totalSold" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No sales data available yet</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
