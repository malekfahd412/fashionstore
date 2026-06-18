import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import {
  useGetVendorSummary, useListProducts, useListOrders, useGetSalesTimeline, useGetTopProducts,
  useCreateProduct, useUpdateProduct, useListCategories,
  getGetVendorSummaryQueryKey, getListProductsQueryKey, getListOrdersQueryKey, getGetSalesTimelineQueryKey, getGetTopProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function VendorDashboard() {
  const { user } = useAuth();
  useSEO({ title: "Vendor Dashboard", description: "Manage your products and orders on Velora." });
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
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
    pending: "bg-[#5B1E2D]/5 text-[#5B1E2D] dark:bg-[#C8A96B]/10 dark:text-[#C8A96B] border border-[#5B1E2D]/20 dark:border-[#C8A96B]/20",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <div className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="velora-reveal visible">
            <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Vendor Portal</h1>
            <p className="velora-label opacity-60 tracking-[0.2em]">{user.name}</p>
          </div>

          <div className="flex items-center gap-4 velora-reveal visible">
            {/* ── Create Product Dialog ── */}
            <Dialog open={isCreateProductOpen} onOpenChange={(open) => {
              setIsCreateProductOpen(open);
              if (!open) {
                setProductForm({ nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", price: "", salePrice: "", categoryId: "", active: true, images: [""], variants: [{ color: "", size: "", stockQuantity: "0" }] });
                setProductFormError("");
              }
            }}>
              <DialogTrigger asChild>
                <button className="velora-btn-primary">Add New Product</button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border-border bg-background p-8">
                <DialogHeader className="mb-8">
                  <DialogTitle className="velora-heading text-3xl">Create New Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="velora-label">Name (English) *</label>
                      <input value={productForm.nameEn} onChange={e => setProductForm(f => ({ ...f, nameEn: e.target.value }))}
                        className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="velora-label">Name (Arabic) *</label>
                      <input value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl"
                        className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="velora-label">Description (EN)</label>
                      <textarea value={productForm.descriptionEn} onChange={e => setProductForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={3}
                        className="w-full border border-border bg-transparent p-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="velora-label">Description (AR)</label>
                      <textarea value={productForm.descriptionAr} onChange={e => setProductForm(f => ({ ...f, descriptionAr: e.target.value }))} rows={3} dir="rtl"
                        className="w-full border border-border bg-transparent p-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="velora-label">Price (EGP) *</label>
                      <input type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                        className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                    <div className="space-y-2">
                      <label className="velora-label">Sale Price (EGP)</label>
                      <input type="number" min="0" step="0.01" value={productForm.salePrice} onChange={e => setProductForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="Leave blank if no sale"
                        className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="velora-label">Category *</label>
                      <select value={productForm.categoryId} onChange={e => setProductForm(f => ({ ...f, categoryId: e.target.value }))}
                        className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors appearance-none">
                        <option value="">Select category…</option>
                        {categories?.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="create-active" checked={productForm.active} onChange={e => setProductForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded-none border-border" />
                    <label htmlFor="create-active" className="velora-label cursor-pointer opacity-100">Active (visible in store)</label>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <label className="velora-label">Images (URLs)</label>
                      <button type="button" onClick={() => setProductForm(f => ({ ...f, images: [...f.images, ""] }))} className="velora-link text-[10px]">+ Add Image</button>
                    </div>
                    <div className="grid gap-3">
                      {productForm.images.map((url, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <input value={url} onChange={e => setProductForm(f => { const imgs = [...f.images]; imgs[idx] = e.target.value; return { ...f, images: imgs }; })} placeholder="https://…"
                            className="flex-1 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                          {productForm.images.length > 1 && (
                            <button type="button" onClick={() => setProductForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} className="text-destructive text-lg">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <label className="velora-label">Variants (Color / Size / Stock)</label>
                      <button type="button" onClick={() => setProductForm(f => ({ ...f, variants: [...f.variants, { color: "", size: "", stockQuantity: "0" }] }))} className="velora-link text-[10px]">+ Add Variant</button>
                    </div>
                    <div className="grid gap-4">
                      {productForm.variants.map((v, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <input value={v.color} onChange={e => setProductForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, color: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Color"
                            className="flex-1 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                          <input value={v.size} onChange={e => setProductForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, size: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Size"
                            className="flex-1 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                          <input type="number" min="0" value={v.stockQuantity} onChange={e => setProductForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, stockQuantity: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Stock"
                            className="w-24 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                          {productForm.variants.length > 1 && (
                            <button type="button" onClick={() => setProductForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))} className="text-destructive text-lg">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {productFormError && <p className="text-sm text-destructive">{productFormError}</p>}
                  <div className="flex gap-4 justify-end pt-8 border-t border-border mt-10">
                    <button className="velora-btn-outline" onClick={() => setIsCreateProductOpen(false)}>Cancel</button>
                    <button
                      className="velora-btn-primary disabled:opacity-50"
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
                            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
                            queryClient.invalidateQueries({ queryKey: getGetVendorSummaryQueryKey() });
                            queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
                            queryClient.invalidateQueries({ queryKey: getGetSalesTimelineQueryKey({ period: 'month' }) });
                          },
                          onError: (err: Error) => setProductFormError(err.message),
                        });
                      }}
                    >
                      {createProductMutation.isPending ? "Creating…" : "Create Product"}
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <button className="velora-btn-outline" onClick={() => { setLocation("/products") }}>View Shop</button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className="w-full justify-start gap-8 bg-transparent p-0 h-auto border-b border-border rounded-none mb-12">
            {[
              { id: "overview", label: "Overview" },
              { id: "products", label: "My Products" },
              { id: "orders", label: "Orders" },
              { id: "analytics", label: "Analytics" }
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-none border-b-2 border-transparent px-0 py-4 text-[11px] font-bold uppercase tracking-[0.2em] data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-all"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 velora-reveal visible">
              {[
                { label: 'Total Sales', value: `${Number(summary?.totalRevenue || 0).toFixed(2)} EGP` },
                { label: 'Total Orders', value: summary?.totalOrders ?? 0 },
                { label: 'Pending Orders', value: orders.filter((o: any) => o.status === 'pending').length },
                { label: 'Avg Order Value', value: `${(summary?.totalOrders ? (Number(summary.totalRevenue) / Number(summary.totalOrders)) : 0).toFixed(2)} EGP` },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-border p-10 relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent"></div>
                  <h3 className="velora-label mb-6 opacity-60">{stat.label}</h3>
                  <div className="velora-heading text-3xl">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-12 velora-reveal visible">
              <div className="lg:col-span-2 space-y-8">
                <h3 className="velora-heading text-2xl">Sales Performance</h3>
                <div className="h-[400px] border border-border p-8 bg-card">
                  {salesTimeline ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTimeline}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C8A96B" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#C8A96B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.05)" />
                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val + "T00:00"), "MMM d")} tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.4)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.4)' }} tickFormatter={(v) => `EGP ${v}`} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E2DA', borderRadius: '0' }}
                          labelStyle={{ fontFamily: 'serif', fontWeight: 'bold' }}
                          formatter={(v: number) => [`EGP ${v.toFixed(2)}`, "Revenue"]} 
                          labelFormatter={(val) => format(new Date(val + "T00:00"), "MMM dd, yyyy")} 
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#C8A96B" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center velora-label">Loading analytics...</div>}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="velora-heading text-2xl">Top Products</h3>
                <div className="space-y-6">
                  {topProducts?.slice(0, 5).map((product: any) => (
                    <div key={product.id} className="flex items-center gap-6 border-b border-border pb-6 last:border-0">
                      <div className="w-16 h-20 bg-muted shrink-0">
                        {product.images?.[0] && <img src={product.images[0].imageUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-medium truncate mb-1">{language === 'en' ? product.nameEn : product.nameAr}</p>
                        <p className="velora-label text-accent">{product.totalSold} sold</p>
                      </div>
                      <p className="font-serif text-sm font-bold">EGP {Number(product.revenue || 0).toFixed(0)}</p>
                    </div>
                  ))}
                  {(!topProducts || topProducts.length === 0) && <p className="velora-label opacity-40">No sales data yet</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-0 outline-none">
            <div className="bg-card border border-border velora-reveal visible">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/5">
                      {['Product', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                        <th key={h} className="velora-label p-8 opacity-60 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productsData?.products?.map(p => (
                      <tr key={p.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="p-8">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-20 bg-muted shrink-0 overflow-hidden">
                              {p.images?.[0] && <img src={p.images[0].imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />}
                            </div>
                            <div className="font-serif text-sm font-medium">{language === 'en' ? p.nameEn : p.nameAr}</div>
                          </div>
                        </td>
                        <td className="p-8 velora-label opacity-60">{categories?.find(c => c.id === p.categoryId)?.nameEn}</td>
                        <td className="p-8 font-serif text-sm">
                          {p.salePrice ? (
                            <div className="space-y-1">
                              <span className="text-accent">EGP {p.salePrice}</span>
                              <div className="text-muted-foreground line-through text-[10px]">EGP {p.price}</div>
                            </div>
                          ) : <span>EGP {p.price}</span>}
                        </td>
                        <td className="p-8">
                          <span className="text-xs font-medium text-muted-foreground">
                            {(p as any).stockQuantity != null ? `${(p as any).stockQuantity} in stock` : "—"}
                          </span>
                        </td>
                        <td className="p-8">
                          <span className={`velora-label text-[8px] px-3 py-1 border ${p.active ? 'border-green-200 text-green-700 bg-green-50' : 'border-border text-muted-foreground bg-muted/20'}`}>
                            {p.active ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td className="p-8">
                          <button onClick={() => openEditDialog(p)} className="velora-link">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-0 outline-none">
            <div className="bg-card border border-border velora-reveal visible">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/5">
                      {['Order ID', 'Date', 'Customer', 'Items', 'Total', 'Status'].map(h => (
                        <th key={h} className="velora-label p-8 opacity-60 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-8 font-serif text-sm font-bold">#{order.id}</td>
                        <td className="p-8 velora-label opacity-60">{format(new Date(order.createdAt), "MMM dd, yyyy")}</td>
                        <td className="p-8 font-medium text-sm">{order.userName || 'Guest User'}</td>
                        <td className="p-8 text-sm opacity-60">{order.itemsCount || 0} items</td>
                        <td className="p-8 font-serif text-sm font-bold">EGP {Number(order.totalPrice || 0).toFixed(2)}</td>
                        <td className="p-8">
                          <span className={`velora-label text-[8px] px-3 py-1.5 ${statusColors[order.status] || ''}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-16 text-center">
                          <p className="velora-label opacity-40">No orders found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 outline-none">
            <div className="space-y-12">
              <div className="grid md:grid-cols-2 gap-8 velora-reveal visible">
                <div className="bg-card border border-border p-10 space-y-8">
                  <h3 className="velora-heading text-2xl">Units Sold by Day</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.05)" />
                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val + "T00:00"), "MMM d")} tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.4)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.4)' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E2DA', borderRadius: '0' }}
                          labelStyle={{ fontFamily: 'serif', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="orderCount" fill="#5B1E2D" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card border border-border p-10 space-y-8">
                  <h3 className="velora-heading text-2xl">Revenue Summary</h3>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end border-b border-border pb-6">
                      <div className="space-y-1">
                        <p className="velora-label opacity-60">Monthly Revenue</p>
                        <p className="velora-heading text-4xl">EGP {Number(summary?.totalRevenue || 0).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="velora-label text-green-600 mb-1">+12.4%</p>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest font-bold">vs last month</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="velora-label opacity-40 mb-2">Total Units</p>
                        <p className="font-serif text-2xl">{(summary?.totalOrders || 0) * 1.5}</p>
                      </div>
                      <div>
                        <p className="velora-label opacity-40 mb-2">Conversion Rate</p>
                        <p className="font-serif text-2xl">3.8%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Edit Product Dialog ── */}
        <Dialog open={isEditProductOpen} onOpenChange={(open) => {
          setIsEditProductOpen(open);
          if (!open) { setEditingProductId(null); setEditFormError(""); }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border-border bg-background p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="velora-heading text-3xl">Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="velora-label">Name (English) *</label>
                  <input value={editForm.nameEn} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))}
                    className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="velora-label">Name (Arabic) *</label>
                  <input value={editForm.nameAr} onChange={e => setEditForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl"
                    className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="velora-label">Description (EN)</label>
                  <textarea value={editForm.descriptionEn} onChange={e => setEditForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={3}
                    className="w-full border border-border bg-transparent p-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="velora-label">Description (AR)</label>
                  <textarea value={editForm.descriptionAr} onChange={e => setEditForm(f => ({ ...f, descriptionAr: e.target.value }))} rows={3} dir="rtl"
                    className="w-full border border-border bg-transparent p-3 text-sm focus:outline-none focus:border-accent transition-colors resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="velora-label">Price (EGP) *</label>
                  <input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="velora-label">Sale Price (EGP)</label>
                  <input type="number" min="0" step="0.01" value={editForm.salePrice} onChange={e => setEditForm(f => ({ ...f, salePrice: e.target.value }))} placeholder="Leave blank if no sale"
                    className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="velora-label">Category *</label>
                  <select value={editForm.categoryId} onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors appearance-none">
                    <option value="">Select category…</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit-active" checked={editForm.active} onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded-none border-border" />
                <label htmlFor="edit-active" className="velora-label cursor-pointer opacity-100">Active (visible in store)</label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <label className="velora-label">Images (URLs)</label>
                  <button type="button" onClick={() => setEditForm(f => ({ ...f, images: [...f.images, ""] }))} className="velora-link text-[10px]">+ Add Image</button>
                </div>
                <div className="grid gap-3">
                  {editForm.images.map((url, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <input value={url} onChange={e => setEditForm(f => { const imgs = [...f.images]; imgs[idx] = e.target.value; return { ...f, images: imgs }; })} placeholder="https://…"
                        className="flex-1 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                      {editForm.images.length > 1 && (
                        <button type="button" onClick={() => setEditForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))} className="text-destructive text-lg">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <label className="velora-label">Variants (Color / Size / Stock)</label>
                  <button type="button" onClick={() => setEditForm(f => ({ ...f, variants: [...f.variants, { color: "", size: "", stockQuantity: "0" }] }))} className="velora-link text-[10px]">+ Add Variant</button>
                </div>
                <div className="grid gap-4">
                  {editForm.variants.map((v, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <input value={v.color} onChange={e => setEditForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, color: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Color"
                        className="flex-1 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                      <input value={v.size} onChange={e => setEditForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, size: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Size"
                        className="flex-1 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                      <input type="number" min="0" value={v.stockQuantity} onChange={e => setEditForm(f => { const vs = f.variants.map((x, i) => i === idx ? { ...x, stockQuantity: e.target.value } : x); return { ...f, variants: vs }; })} placeholder="Stock"
                        className="w-24 border-b border-border bg-transparent py-2 text-sm focus:outline-none focus:border-accent transition-colors" />
                      {editForm.variants.length > 1 && (
                        <button type="button" onClick={() => setEditForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))} className="text-destructive text-lg">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {editFormError && <p className="text-sm text-destructive">{editFormError}</p>}
              <div className="flex gap-4 justify-end pt-8 border-t border-border mt-10">
                <button className="velora-btn-outline" onClick={() => setIsEditProductOpen(false)}>Cancel</button>
                <button
                  className="velora-btn-primary disabled:opacity-50"
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
                        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
                        queryClient.invalidateQueries({ queryKey: getGetVendorSummaryQueryKey() });
                        queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
                        queryClient.invalidateQueries({ queryKey: getGetSalesTimelineQueryKey({ period: 'month' }) });
                      },
                      onError: (err: Error) => setEditFormError(err.message),
                    });
                  }}
                >
                  {updateProductMutation.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
