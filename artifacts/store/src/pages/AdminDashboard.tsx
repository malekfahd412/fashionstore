import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import {
  useGetAnalyticsSummary, useGetOrderStatusBreakdown, useGetSalesTimeline, useListOrders,
  useAdminListReviews, useDeleteReview,
  getGetAnalyticsSummaryQueryKey, getGetOrderStatusBreakdownQueryKey, getGetSalesTimelineQueryKey, getListOrdersQueryKey, getAdminListReviewsQueryKey, getGetMyReviewsQueryKey,
} from "@workspace/api-client-react";
import { Star, Trash2, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { format } from "date-fns";
import { useSEO } from "@/hooks/useSEO";
import SettingsPanel from "@/components/SettingsPanel";
import SecurityPanel from "@/components/SecurityPanel";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminCategoriesTab from "@/components/admin/AdminCategoriesTab";
import AdminCouponsTab from "@/components/admin/AdminCouponsTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminProductsTab from "@/components/admin/AdminProductsTab";
import AdminManualPaymentsTab from "@/components/admin/AdminManualPaymentsTab";

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

type BIData = {
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  returningCustomers: number;
  totalCustomers: number;
  repeatPurchaseRate: number;
};

type TopProduct = { productId: number; nameEn: string; nameAr: string; totalSold: number; revenue: number };
type TopCategory = { categoryId: number; nameEn: string; nameAr: string; totalSold: number; revenue: number };
type VendorPerf = { vendorId: number; name: string; email: string; productCount: number; totalSold: number; revenue: number };
type AuditLogEntry = { id: number; userId: number; userEmail: string; action: string; resource: string; resourceId: string | null; ip: string | null; createdAt: string };

const COLORS = ['#065f46', '#d4af37', '#dc2626', '#2563eb', '#7c3aed', '#0891b2'];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'users', label: 'Users' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'products', label: 'Products' },
  { id: 'orders', label: 'Orders' },
  { id: 'categories', label: 'Categories' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'banners', label: 'Banners' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact-messages', label: 'Messages' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'payments', label: 'Payments' },
  { id: 'support', label: 'Support' },
  { id: 'abandoned-carts', label: 'Abandoned Carts' },
  { id: 'product-insights', label: 'Product Insights' },
  { id: 'audit-logs', label: 'Audit Logs' },
  { id: 'security', label: 'Security' },
  { id: 'settings', label: 'Settings' },
];

function StatCard({ label, value, sub, subColor }: { label: string; value: string | number; sub?: string; subColor?: string }) {
  return (
    <div className="border border-border p-6 bg-card shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className={`text-xs mt-2 ${subColor ?? 'text-muted-foreground'}`}>{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  useSEO({ title: "Admin Panel", description: "Velora administration and analytics." });
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [auditSearch, setAuditSearch] = useState("");

  const enabled = !!user && user.role === "admin";

  const { data: summary } = useGetAnalyticsSummary({ query: { enabled, queryKey: getGetAnalyticsSummaryQueryKey() } });
  const { data: orderStatusBreakdown } = useGetOrderStatusBreakdown({ query: { enabled, queryKey: getGetOrderStatusBreakdownQueryKey() } });
  const { data: salesTimeline } = useGetSalesTimeline({ period: 'month' }, { query: { enabled, queryKey: getGetSalesTimelineQueryKey({ period: 'month' }) } });
  const { data: recentOrders } = useListOrders({ limit: 10 }, { query: { enabled, queryKey: getListOrdersQueryKey({ limit: 10 }) } });

  const { data: bi } = useQuery<BIData>({
    queryKey: ["bi"],
    queryFn: () => apiFetch("/api/analytics/bi"),
    enabled,
    staleTime: 60_000,
  });

  const { data: topProducts } = useQuery<TopProduct[]>({
    queryKey: ["top-products"],
    queryFn: () => apiFetch("/api/analytics/top-products"),
    enabled,
    staleTime: 60_000,
  });

  const { data: topCategories } = useQuery<TopCategory[]>({
    queryKey: ["top-categories"],
    queryFn: () => apiFetch("/api/analytics/top-categories"),
    enabled,
    staleTime: 60_000,
  });

  const { data: vendorPerf } = useQuery<VendorPerf[]>({
    queryKey: ["vendor-performance"],
    queryFn: () => apiFetch("/api/analytics/vendor-performance"),
    enabled,
    staleTime: 60_000,
  });

  const { data: auditData, refetch: refetchAudit } = useQuery<{ logs: AuditLogEntry[]; total: number }>({
    queryKey: ["audit-logs", auditSearch],
    queryFn: () => apiFetch(`/api/admin/audit-logs?limit=50${auditSearch ? `&search=${encodeURIComponent(auditSearch)}` : ""}`),
    enabled: enabled && activeTab === "audit-logs",
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) setLocation("/login?from=/admin-panel");
  }, [user, setLocation]);

  if (!user) return null;
  if (user.role !== "admin") return <AccessDenied reason="admin_required" redirectTo="/admin-panel" />;

  return (
    <div className="flex min-h-[calc(100vh-16rem)]">
      {/* Sidebar — desktop only */}
      <div className="w-56 border-r border-border bg-muted/20 hidden md:block shrink-0">
        <div className="p-4">
          <h2 className="font-serif text-lg font-bold mb-4">Admin Panel</h2>
          <nav className="space-y-0.5 flex flex-col">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 text-left text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Mobile tab picker */}
        <div className="md:hidden border-b border-border bg-muted/20 px-4 py-3">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        <div className="p-4 md:p-8">

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold font-serif">Platform Overview</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Revenue" value={`${summary?.totalRevenue?.toFixed(2) ?? "0.00"} EGP`} sub={`${(summary?.revenueGrowth ?? 0) >= 0 ? '↑' : '↓'} ${Math.abs(summary?.revenueGrowth ?? 0)}% vs last month`} subColor={(summary?.revenueGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'} />
              <StatCard label="Total Orders" value={summary?.totalOrders ?? 0} sub={`${summary?.pendingOrders ?? 0} pending`} />
              <StatCard label="Customers" value={summary?.totalCustomers ?? 0} />
              <StatCard label="Active Products" value={summary?.totalProducts ?? 0} sub={`${summary?.lowStockCount ?? 0} low stock`} subColor="text-amber-500" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 border border-border p-6 bg-card">
                <h3 className="font-serif text-xl font-bold mb-6">Revenue Over Time (30d)</h3>
                <div className="h-72">
                  {salesTimeline ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val + "T00:00"), "MMM d")} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} EGP`} />
                        <RechartsTooltip formatter={(v: number) => [`${v.toFixed(2)} EGP`, "Revenue"]} labelFormatter={(val) => format(new Date(val + "T00:00"), "MMM dd, yyyy")} />
                        <Area type="monotone" dataKey="revenue" stroke="#065f46" fill="#065f46" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
                </div>
              </div>

              <div className="border border-border p-6 bg-card">
                <h3 className="font-serif text-xl font-bold mb-4">Order Status</h3>
                <div className="h-52">
                  {orderStatusBreakdown ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={orderStatusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="count" nameKey="status">
                          {orderStatusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
                <div className="mt-2 space-y-1">
                  {orderStatusBreakdown?.filter(s => s.count > 0).map((s, i) => (
                    <div key={s.status} className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="capitalize">{s.status.replace('_', ' ')}</span>
                      </div>
                      <span className="font-bold">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border border-border p-6 bg-card">
              <h3 className="font-serif text-xl font-bold mb-4">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>{['Order', 'Customer', 'Date', 'Amount', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders?.orders?.map(o => (
                      <tr key={o.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-bold">#{o.id}</td>
                        <td className="px-4 py-3">{o.userName || `User ${o.userId}`}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(o.createdAt), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3 font-bold">{o.totalPrice.toFixed(2)} EGP</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-muted text-xs uppercase tracking-wide">{o.status}</span></td>
                      </tr>
                    ))}
                    {!recentOrders?.orders?.length && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS (BI) ───────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold font-serif">Business Intelligence</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Today's Revenue" value={`${bi?.dailyRevenue?.toFixed(2) ?? "0.00"} EGP`} />
              <StatCard label="This Week" value={`${bi?.weeklyRevenue?.toFixed(2) ?? "0.00"} EGP`} />
              <StatCard label="This Month" value={`${bi?.monthlyRevenue?.toFixed(2) ?? "0.00"} EGP`} />
              <StatCard label="Avg Order Value" value={`${bi?.averageOrderValue?.toFixed(2) ?? "0.00"} EGP`} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Customers" value={bi?.totalCustomers ?? 0} />
              <StatCard label="Returning Customers" value={bi?.returningCustomers ?? 0} sub="Placed more than 1 order" />
              <StatCard label="Repeat Purchase Rate" value={`${bi?.repeatPurchaseRate ?? 0}%`} sub="Customers who reordered" subColor={(bi?.repeatPurchaseRate ?? 0) >= 20 ? 'text-green-600' : 'text-amber-500'} />
            </div>

            <div className="border border-border p-6 bg-card">
              <h3 className="font-serif text-xl font-bold mb-6">Top Products by Units Sold</h3>
              {topProducts && topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nameEn" width={140} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v: number) => [v, "Units sold"]} />
                    <Bar dataKey="totalSold" fill="#065f46" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-muted-foreground text-sm">No sales data yet</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-border p-6 bg-card">
                <h3 className="font-serif text-lg font-bold mb-4">Top Categories</h3>
                <div className="space-y-3">
                  {topCategories?.slice(0, 6).map((c, i) => (
                    <div key={c.categoryId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: COLORS[i % COLORS.length], color: '#fff' }}>{i + 1}</span>
                        <span>{c.nameEn}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{c.revenue.toFixed(0)} EGP</div>
                        <div className="text-xs text-muted-foreground">{c.totalSold} sold</div>
                      </div>
                    </div>
                  ))}
                  {!topCategories?.length && <p className="text-muted-foreground text-sm">No data yet</p>}
                </div>
              </div>

              <div className="border border-border p-6 bg-card">
                <h3 className="font-serif text-lg font-bold mb-4">Vendor Performance</h3>
                <div className="space-y-3">
                  {vendorPerf?.map((v) => (
                    <div key={v.vendorId} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{v.name}</div>
                        <div className="text-xs text-muted-foreground">{v.productCount} products · {v.totalSold} sold</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{v.revenue.toFixed(0)} EGP</div>
                      </div>
                    </div>
                  ))}
                  {!vendorPerf?.length && <p className="text-muted-foreground text-sm">No vendors yet</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────────────────── */}
        {activeTab === 'users' && <AdminUsersTab />}

        {/* ── VENDORS ──────────────────────────────────────────────── */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            <h1 className="text-3xl font-bold font-serif">Vendor Management</h1>
            <p className="text-sm text-muted-foreground">
              Vendors are users with the "vendor" role. Use the role selector below to promote or demote users.
            </p>
            <AdminUsersTab defaultRole="vendor" />
          </div>
        )}

        {/* ── PRODUCTS ─────────────────────────────────────────────── */}
        {activeTab === 'products' && <AdminProductsTab />}

        {/* ── ORDERS ───────────────────────────────────────────────── */}
        {activeTab === 'orders' && <AdminOrdersTab />}

        {/* ── CATEGORIES ───────────────────────────────────────────── */}
        {activeTab === 'categories' && <AdminCategoriesTab />}

        {/* ── COUPONS ──────────────────────────────────────────────── */}
        {activeTab === 'coupons' && <AdminCouponsTab />}

        {/* ── BANNERS ──────────────────────────────────────────────── */}
        {activeTab === 'banners' && <AdminBannersTab />}

        {/* ── REVIEWS ──────────────────────────────────────────────── */}
        {activeTab === 'reviews' && <AdminReviewsTab />}

        {/* ── AUDIT LOGS ───────────────────────────────────────────── */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold font-serif">Admin Audit Log</h1>
              <span className="text-sm text-muted-foreground">{auditData?.total ?? 0} entries</span>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search by email..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="flex-1 border border-border px-4 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={() => refetchAudit()} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Search
              </button>
            </div>

            <div className="border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                  <tr>
                    {['#', 'Admin', 'Action', 'Resource', 'ID', 'IP', 'Time'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditData?.logs?.map(log => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{log.id}</td>
                      <td className="px-4 py-3">{log.userEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
                          log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                          log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 capitalize">{log.resource}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.resourceId ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(log.createdAt), "MMM d, HH:mm")}</td>
                    </tr>
                  ))}
                  {!auditData?.logs?.length && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No audit log entries yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        {activeTab === 'faq' && <AdminFaqTab />}

        {/* ── CONTACT MESSAGES ─────────────────────────────────────── */}
        {activeTab === 'contact-messages' && <AdminContactMessagesTab />}

        {/* ── NEWSLETTER ───────────────────────────────────────────── */}
        {activeTab === 'newsletter' && <AdminNewsletterTab />}

        {/* ── MANUAL PAYMENTS ──────────────────────────────────────── */}
        {activeTab === 'payments' && <AdminManualPaymentsTab />}

        {activeTab === 'support' && <AdminSupportTab />}

        {/* ── ABANDONED CARTS ──────────────────────────────────────── */}
        {activeTab === 'abandoned-carts' && <AdminAbandonedCartsTab />}

        {/* ── PRODUCT INSIGHTS ─────────────────────────────────────── */}
        {activeTab === 'product-insights' && <AdminProductInsightsTab />}

        {/* ── SECURITY ─────────────────────────────────────────────── */}
        {activeTab === 'security' && <SecurityPanel />}

        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        {activeTab === 'settings' && <SettingsPanel />}

        </div>
      </div>
    </div>
  );
}

type FaqEntry = { id: number; category: string; questionEn: string; questionAr: string; answerEn: string; answerAr: string; sortOrder: number; active: boolean };
type ContactMsg = { id: number; name: string; email: string; subject: string | null; message: string; status: string; createdAt: string };
type NewsletterSub = { id: number; email: string; active: boolean; subscribedAt: string };

function AdminFaqTab() {
  const qc = useQueryClient();
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<FaqEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'orders', questionEn: '', questionAr: '', answerEn: '', answerAr: '', sortOrder: 0, active: true });

  const load = async () => {
    try { const data = await apiFetch<FaqEntry[]>('/api/admin/faq'); setFaqs(data); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.questionEn || !form.answerEn) return;
    if (editTarget) {
      await apiFetch(`/api/admin/faq/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(form) } as RequestInit);
    } else {
      await apiFetch('/api/admin/faq', { method: 'POST', body: JSON.stringify(form) } as RequestInit);
    }
    setShowForm(false); setEditTarget(null); setForm({ category: 'orders', questionEn: '', questionAr: '', answerEn: '', answerAr: '', sortOrder: 0, active: true });
    void load();
    qc.invalidateQueries({ queryKey: ["faqs-public"] });
  };

  const del = async (id: number) => {
    if (!confirm('Delete this FAQ?')) return;
    await apiFetch(`/api/admin/faq/${id}`, { method: 'DELETE' } as RequestInit);
    void load();
    qc.invalidateQueries({ queryKey: ["faqs-public"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">FAQ Management</h1>
        <button onClick={() => { setShowForm(true); setEditTarget(null); }} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">+ Add FAQ</button>
      </div>
      {showForm && (
        <div className="border border-border p-6 bg-card space-y-3">
          <h3 className="font-bold">{editTarget ? 'Edit FAQ' : 'New FAQ'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="text-xs font-medium block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-input bg-background px-3 py-2 text-sm">
                {['orders','shipping','payments','returns','account'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium block mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div><label className="text-xs font-medium block mb-1">Question (EN) *</label>
              <input value={form.questionEn} onChange={e => setForm(f => ({ ...f, questionEn: e.target.value }))} className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div><label className="text-xs font-medium block mb-1">Question (AR)</label>
              <input value={form.questionAr} onChange={e => setForm(f => ({ ...f, questionAr: e.target.value }))} dir="rtl" className="w-full border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div><label className="text-xs font-medium block mb-1">Answer (EN) *</label>
              <textarea value={form.answerEn} onChange={e => setForm(f => ({ ...f, answerEn: e.target.value }))} rows={3} className="w-full border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <div><label className="text-xs font-medium block mb-1">Answer (AR)</label>
              <textarea value={form.answerAr} onChange={e => setForm(f => ({ ...f, answerAr: e.target.value }))} rows={3} dir="rtl" className="w-full border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Save</button>
            <button onClick={() => { setShowForm(false); setEditTarget(null); }} className="px-4 py-2 border border-border text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}
      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>{['Category','Question','Active','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {faqs.map(faq => (
                <tr key={faq.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 capitalize">{faq.category}</td>
                  <td className="px-4 py-3 max-w-sm truncate">{faq.questionEn}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs ${faq.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{faq.active ? 'Active' : 'Hidden'}</span></td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => { setEditTarget(faq); setForm({ category: faq.category, questionEn: faq.questionEn, questionAr: faq.questionAr, answerEn: faq.answerEn, answerAr: faq.answerAr, sortOrder: faq.sortOrder, active: faq.active }); setShowForm(true); }} className="text-xs px-2 py-1 border border-border hover:bg-muted">Edit</button>
                    <button onClick={() => del(faq.id)} className="text-xs px-2 py-1 border border-destructive text-destructive hover:bg-destructive/10">Delete</button>
                  </td>
                </tr>
              ))}
              {!faqs.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No FAQs yet. Add your first one above.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminContactMessagesTab() {
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMsg | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const load = async () => {
    try { const data = await apiFetch<{ messages: ContactMsg[]; total: number }>('/api/admin/contact-messages'); setMessages(data.messages); setTotal(data.total); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    await apiFetch(`/api/admin/contact-messages/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) } as RequestInit);
    void load();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this message?')) return;
    await apiFetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE' } as RequestInit);
    if (selected?.id === id) setSelected(null);
    void load();
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await apiFetch(`/api/admin/contact-messages/${selected.id}/reply`, { method: 'POST', body: JSON.stringify({ message: replyText.trim() }) } as RequestInit);
      setReplyText('');
      setReplySuccess(true);
      setTimeout(() => setReplySuccess(false), 3000);
      void load();
    } finally {
      setReplying(false);
    }
  };

  const selectMsg = (msg: ContactMsg) => { setSelected(msg); setReplyText(''); setReplySuccess(false); };

  const statusColor = (s: string) => s === 'new' ? 'bg-blue-100 text-blue-700' : s === 'replied' ? 'bg-green-100 text-green-700' : s === 'read' ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Contact Messages</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>
      {selected && (
        <div className="border border-border p-6 bg-card space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold">{selected.name} &lt;{selected.email}&gt;</h3>
              {selected.subject && <p className="text-sm text-muted-foreground">{selected.subject}</p>}
              <span className={`mt-1 inline-block px-2 py-0.5 text-xs capitalize ${statusColor(selected.status)}`}>{selected.status}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap border border-border bg-muted/20 p-4">{selected.message}</p>
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reply via Email</p>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply to the customer..."
              rows={4}
              className="w-full border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {replySuccess && <p className="text-xs text-green-600 font-medium">Reply sent successfully!</p>}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={sendReply}
                disabled={replying || !replyText.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {replying ? 'Sending…' : 'Send Reply'}
              </button>
              <button onClick={() => updateStatus(selected.id, 'read')} className="text-xs px-3 py-2 border border-border hover:bg-muted">Mark Read</button>
              <button onClick={() => updateStatus(selected.id, 'replied')} className="text-xs px-3 py-2 border border-green-300 text-green-700 hover:bg-green-50">Mark Replied</button>
              <button onClick={() => del(selected.id)} className="text-xs px-3 py-2 border border-destructive text-destructive hover:bg-destructive/10 ml-auto">Delete</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>{['Name','Email','Subject','Status','Date','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {messages.map(msg => (
                <tr key={msg.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => selectMsg(msg)}>
                  <td className="px-4 py-3 font-medium">{msg.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{msg.email}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">{msg.subject || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs capitalize ${statusColor(msg.status)}`}>{msg.status}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(msg.createdAt), 'MMM d, HH:mm')}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => del(msg.id)} className="text-xs px-2 py-1 border border-destructive text-destructive hover:bg-destructive/10">Delete</button>
                  </td>
                </tr>
              ))}
              {!messages.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No messages yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminNewsletterTab() {
  const [subscribers, setSubscribers] = useState<NewsletterSub[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const data = await apiFetch<{ subscribers: NewsletterSub[]; total: number }>('/api/admin/newsletter/subscribers'); setSubscribers(data.subscribers); setTotal(data.total); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const del = async (id: number) => {
    if (!confirm('Remove this subscriber?')) return;
    await apiFetch(`/api/admin/newsletter/subscribers/${id}`, { method: 'DELETE' } as RequestInit);
    void load();
  };

  const exportCsv = () => {
    const csv = ['Email,Subscribed At', ...subscribers.map(s => `${s.email},${s.subscribedAt}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'newsletter-subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif">Newsletter Subscribers</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total subscribers</p>
        </div>
        <button onClick={exportCsv} className="px-4 py-2 border border-border text-sm font-medium hover:bg-muted">Export CSV</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Subscribers" value={total} />
        <StatCard label="Active" value={subscribers.filter(s => s.active).length} />
        <StatCard label="Inactive" value={subscribers.filter(s => !s.active).length} />
      </div>
      {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
        <div className="border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>{['Email','Status','Subscribed','Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{sub.email}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs ${sub.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>{sub.active ? 'Active' : 'Unsubscribed'}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(sub.subscribedAt), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => del(sub.id)} className="text-xs px-2 py-1 border border-destructive text-destructive hover:bg-destructive/10">Remove</button>
                  </td>
                </tr>
              ))}
              {!subscribers.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No subscribers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminReviewsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const params = {
    page,
    limit: LIMIT,
    ...(search ? { search } : {}),
    ...(ratingFilter ? { rating: Number(ratingFilter) } : {}),
  };

  const { data, isLoading, refetch } = useAdminListReviews(params, {
    query: { queryKey: [...getAdminListReviewsQueryKey(params)] },
  });

  const deleteMutation = useDeleteReview();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this review?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminListReviewsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
        refetch();
      },
    });
  };

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold font-serif">Reviews</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-1 min-w-48 gap-2">
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            className="flex-1 border border-border px-4 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={() => { setSearch(searchInput); setPage(1); }}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
        <select
          value={ratingFilter}
          onChange={e => { setRatingFilter(e.target.value); setPage(1); }}
          className="border border-border px-3 py-2 text-sm bg-background focus:outline-none min-w-36"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map(r => (
            <option key={r} value={r}>{r} Star{r !== 1 ? "s" : ""}</option>
          ))}
        </select>
        {(search || ratingFilter) && (
          <button
            onClick={() => { setSearch(""); setSearchInput(""); setRatingFilter(""); setPage(1); }}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading reviews…</div>
        ) : !reviews.length ? (
          <div className="p-12 text-center">
            <Star className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {['#', 'Product', 'Customer', 'Rating', 'Title', 'Comment', 'Verified', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(reviews as Array<{
                  id: number; productId: number; userId: number; rating: number;
                  title?: string | null; comment?: string | null; verifiedPurchase: boolean;
                  createdAt: string; userName?: string; productNameEn?: string | null;
                }>).map(r => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/products/${r.productId}`} className="text-xs hover:underline text-primary max-w-[120px] block truncate">
                        {r.productNameEn ?? `#${r.productId}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.userName ?? `User #${r.userId}`}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-sm">{r.rating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[120px] truncate">{r.title ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{r.comment ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.verifiedPurchase ? (
                        <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.createdAt), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Admin Support Tab ────────────────────────────────────────────────────────
type SupportTicketAdmin = { id: number; userId: number; subject: string; category: string; status: string; priority: string; createdAt: string; updatedAt: string; userName?: string; userEmail?: string };
type TicketMsgAdmin = { id: number; senderId: number; message: string; createdAt: string; senderName?: string; senderRole?: string };

const TICKET_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_customer: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-muted text-muted-foreground",
};
const TICKET_PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground", normal: "text-foreground", high: "text-amber-600 font-semibold", urgent: "text-destructive font-bold",
};

// ── Abandoned Carts Tab ───────────────────────────────────────────────────────
type AbandonedCart = {
  userId: number; email: string; name: string;
  itemCount: number; estimatedTotal: number;
  lastActivity: string; emailSentAt: string | null; whatsappSentAt: string | null; recovered: boolean;
};

function AdminAbandonedCartsTab() {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<number | null>(null);
  const [toast_, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [thresholdHours, setThresholdHours] = useState(2);

  const adminFetch = async (path: string, opts?: RequestInit) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: { ...(opts?.headers ?? {}), Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/api/abandoned-carts/admin?thresholdHours=${thresholdHours}`);
      setCarts(data.carts ?? []);
    } catch { setCarts([]); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [thresholdHours]);

  const sendReminder = async (userId: number, type: "email" | "whatsapp") => {
    setSending(userId);
    try {
      await adminFetch("/api/abandoned-carts/admin/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type }),
      });
      setToast({ msg: `${type === "email" ? "Email" : "WhatsApp"} reminder sent`, ok: true });
      void load();
    } catch (e) {
      setToast({ msg: (e as Error).message, ok: false });
    } finally { setSending(null); }
  };

  return (
    <div className="space-y-5">
      {toast_ && (
        <div className={`px-4 py-3 text-sm border ${toast_.ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {toast_.msg}
          <button className="float-right opacity-60 hover:opacity-100" onClick={() => setToast(null)}>×</button>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Abandoned Carts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Customers who added items but haven't purchased in the last {thresholdHours}h</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Threshold:</label>
          <select value={thresholdHours} onChange={e => setThresholdHours(Number(e.target.value))} className="border border-input bg-background px-3 py-1.5 text-sm">
            {[1, 2, 4, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h}h</option>)}
          </select>
          <button onClick={load} className="px-3 py-1.5 text-sm border border-border hover:bg-muted">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading abandoned carts…</div>
      ) : carts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No abandoned carts found for this threshold.</div>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-xs">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Items</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Est. Total</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Last Activity</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Reminders Sent</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {carts.map(cart => (
                <tr key={cart.userId} className={cart.recovered ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{cart.name}</p>
                    <p className="text-xs text-muted-foreground">{cart.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3 text-xs">{Number(cart.estimatedTotal).toLocaleString()} EGP</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(cart.lastActivity), "MMM d, HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-xs space-y-0.5">
                    {cart.emailSentAt ? (
                      <span className="block text-muted-foreground">📧 {format(new Date(cart.emailSentAt), "MMM d HH:mm")}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                    {cart.whatsappSentAt && (
                      <span className="block text-muted-foreground">💬 {format(new Date(cart.whatsappSentAt), "MMM d HH:mm")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {cart.recovered ? (
                      <span className="text-xs text-green-600 font-medium">✓ Recovered</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => sendReminder(cart.userId, "email")}
                          disabled={sending === cart.userId}
                          className="text-xs px-2 py-1 border border-border hover:bg-muted disabled:opacity-50"
                        >
                          📧 Email
                        </button>
                        <button
                          onClick={() => sendReminder(cart.userId, "whatsapp")}
                          disabled={sending === cart.userId}
                          className="text-xs px-2 py-1 border border-border hover:bg-muted disabled:opacity-50"
                        >
                          💬 WhatsApp
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminSupportTab() {
  const [tickets, setTickets] = useState<SupportTicketAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<SupportTicketAdmin | null>(null);
  const [messages, setMessages] = useState<TicketMsgAdmin[]>([]);
  const [reply, setReply] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT), ...(statusFilter ? { status: statusFilter } : {}) });
      const data = await apiFetch<{ tickets: SupportTicketAdmin[]; total: number }>(`/api/admin/support/tickets?${qs}`);
      setTickets(data.tickets); setTotal(data.total);
    } finally { setLoading(false); }
  };

  const loadTicket = async (t: SupportTicketAdmin) => {
    setSelected(t);
    const data = await apiFetch<{ ticket: SupportTicketAdmin; messages: TicketMsgAdmin[] }>(`/api/support/tickets/${t.id}`);
    setMessages(data.messages);
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setReplyPending(true);
    try {
      await apiFetch(`/api/support/tickets/${selected.id}/messages`, { method: 'POST', body: JSON.stringify({ message: reply.trim() }) } as RequestInit);
      setReply("");
      await loadTicket(selected);
    } finally { setReplyPending(false); }
  };

  const updateTicket = async (id: number, update: { status?: string; priority?: string }) => {
    await apiFetch(`/api/admin/support/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(update) } as RequestInit);
    if (selected?.id === id) setSelected(s => s ? { ...s, ...update } : s);
    void load();
  };

  useEffect(() => { void load(); }, [page, statusFilter]);

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setSelected(null); setMessages([]); }} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
          <span className="font-bold">#{selected.id}: {selected.subject}</span>
          <span className="text-xs text-muted-foreground">{selected.userName} &lt;{selected.userEmail}&gt;</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={selected.status} onChange={e => updateTicket(selected.id, { status: e.target.value })} className="border border-input bg-background px-3 py-1.5 text-xs">
            {["open","in_progress","waiting_customer","resolved","closed"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
          <select value={selected.priority} onChange={e => updateTicket(selected.id, { priority: e.target.value })} className="border border-input bg-background px-3 py-1.5 text-xs">
            {["low","normal","high","urgent"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto border border-border p-4 bg-muted/20">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.senderRole === "admin" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.senderRole === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.senderRole === "admin" ? "Me" : "C"}
              </div>
              <div className={`max-w-[80%] p-3 text-sm ${msg.senderRole === "admin" ? "bg-primary/10" : "bg-background border border-border"}`}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{msg.senderName}</p>
                <p className="leading-relaxed">{msg.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.createdAt), "MMM d, HH:mm")}</p>
              </div>
            </div>
          ))}
        </div>
        {selected.status !== "closed" && (
          <div className="flex gap-2">
            <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply to the customer..." rows={3}
              className="flex-1 border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none" />
            <button onClick={sendReply} disabled={replyPending || !reply.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              Send
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold font-serif">Support Center</h1>
        <span className="text-sm text-muted-foreground">{total} total tickets</span>
      </div>
      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-border px-3 py-2 text-sm bg-background focus:outline-none">
          <option value="">All Statuses</option>
          {["open","in_progress","waiting_customer","resolved","closed"].map(s =>
            <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        {statusFilter && <button onClick={() => { setStatusFilter(""); setPage(1); }} className="text-sm text-muted-foreground hover:text-foreground border border-border px-3 py-2">Clear</button>}
      </div>
      <div className="border border-border bg-card overflow-hidden">
        {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : !tickets.length ? (
          <div className="p-8 text-center text-muted-foreground">No tickets found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>{['#','Customer','Subject','Category','Status','Priority','Updated',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => loadTicket(t)}>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.id}</td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-medium">{t.userName ?? `User #${t.userId}`}</p>
                    <p className="text-muted-foreground">{t.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate font-medium text-xs">{t.subject}</td>
                  <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{t.category}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs capitalize rounded ${TICKET_STATUS_COLORS[t.status] ?? ""}`}>{t.status.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3 text-xs capitalize"><span className={TICKET_PRIORITY_COLORS[t.priority] ?? ""}>{t.priority}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(t.updatedAt), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); loadTicket(t); }} className="text-xs px-2 py-1 border border-border hover:bg-muted">Reply</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {Math.ceil(total / LIMIT) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-border hover:bg-muted disabled:opacity-40">← Prev</button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / LIMIT)}</span>
          <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-border hover:bg-muted disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

type InsightRow = { id: number; nameEn: string; viewCount: number; wishlistCount: number; unitsSold: number; revenue: number; totalStock: number };
type InsightSortCol = 'revenue' | 'unitsSold' | 'viewCount' | 'wishlistCount' | 'totalStock';

function ViewSparkline({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-foreground/80 tabular-nums">{value}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AdminProductInsightsTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<InsightSortCol>('viewCount');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/admin/analytics/products?limit=20")
      .then((d: unknown) => setData(d as InsightRow[]))
      .catch(() => setError("Failed to load product performance data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (col: InsightSortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sorted = [...data].sort((a, b) => {
    const av = sortCol === 'revenue' ? Number(a.revenue) : a[sortCol];
    const bv = sortCol === 'revenue' ? Number(b.revenue) : b[sortCol];
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const maxViews = Math.max(...data.map(r => r.viewCount), 1);

  const SortTh = ({ col, label, className = "" }: { col: InsightSortCol; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`py-3 px-4 font-semibold text-foreground/60 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-[10px]">{sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </span>
    </th>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Product Performance</h2>
        <p className="text-sm text-muted-foreground">Click any column header to sort. Seed demo data from the Settings tab.</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && data.length === 0 && (
        <div className="py-20 text-center text-muted-foreground text-sm">No product data yet. Add products or seed demo data from Settings.</div>
      )}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-semibold text-foreground/60 text-xs uppercase tracking-wider">Product</th>
                <SortTh col="revenue" label="Revenue (EGP)" className="text-right" />
                <SortTh col="unitsSold" label="Units Sold" className="text-right" />
                <SortTh col="viewCount" label="Views" className="text-right" />
                <SortTh col="wishlistCount" label="Wishlisted" className="text-right" />
                <SortTh col="totalStock" label="In Stock" className="text-right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const isTopBySort = i === 0;
                return (
                  <tr key={row.id} className={`border-b border-border hover:bg-muted/40 transition-colors ${isTopBySort ? "bg-amber-50/30" : ""}`}>
                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">{row.nameEn}</span>
                      {isTopBySort && <span className="ms-2 text-[9px] font-bold tracking-widest uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5">#{1}</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{Number(row.revenue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-foreground/80">{row.unitsSold}</td>
                    <td className="py-3 px-4 text-right">
                      <ViewSparkline value={row.viewCount} max={maxViews} />
                    </td>
                    <td className="py-3 px-4 text-right text-foreground/80">{row.wishlistCount}</td>
                    <td className="py-3 px-4 text-right text-foreground/80">{row.totalStock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
