import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import {
  useGetAnalyticsSummary, useGetOrderStatusBreakdown, useGetSalesTimeline, useListOrders,
  getGetAnalyticsSummaryQueryKey, getGetOrderStatusBreakdownQueryKey, getGetSalesTimelineQueryKey, getListOrdersQueryKey,
} from "@workspace/api-client-react";
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
import AdminReviewsTab from "@/components/admin/AdminReviewsTab";

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

const COLORS = ['#0F172A', '#C8A96B', '#5B1E2D', '#2563eb', '#7c3aed', '#0891b2'];

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
    <div className="bg-card border border-border p-10 relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent"></div>
      <h3 className="velora-label mb-6 opacity-60">{label}</h3>
      <div className="velora-heading text-3xl mb-2">{value}</div>
      {sub && <p className={`velora-label text-[10px] ${subColor ?? 'opacity-60'}`}>{sub}</p>}
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
    <div className="flex min-h-[calc(100vh-16rem)] bg-background">
      {/* Sidebar — desktop only */}
      <div className="w-64 border-r border-border bg-[#0a0a0a] hidden lg:block shrink-0">
        <div className="py-12 px-8">
          <h2 className="velora-heading text-2xl text-white mb-12">Management</h2>
          <nav className="space-y-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left velora-label text-[10px] tracking-[0.2em] transition-all py-2 border-l-2 pl-4 ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-white/40 hover:text-white hover:border-white/20'}`}
              >
                {tab.label.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Mobile tab picker */}
        <div className="lg:hidden border-b border-border bg-card px-6 py-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full border-b border-border bg-transparent py-2 velora-label text-[10px] focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-12 lg:py-20">

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-20 velora-reveal visible">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Platform Overview</h1>
                <p className="velora-label opacity-60 tracking-[0.2em]">Real-time system diagnostics</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Revenue" value={`${summary?.totalRevenue || 0} EGP`} sub={`${(summary?.revenueGrowth ?? 0) >= 0 ? '↑' : '↓'} ${Math.abs(summary?.revenueGrowth ?? 0)}% vs last month`} subColor={(summary?.revenueGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-destructive'} />
              <StatCard label="Total Orders" value={summary?.totalOrders ?? 0} sub={`${summary?.pendingOrders ?? 0} pending`} />
              <StatCard label="Customers" value={summary?.totalCustomers ?? 0} />
              <StatCard label="Active Products" value={summary?.totalProducts ?? 0} sub={`${summary?.lowStockCount ?? 0} low stock`} subColor="text-accent" />
            </div>

            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <h3 className="velora-heading text-2xl">Revenue Over Time (30d)</h3>
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
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.4)' }} tickFormatter={(v) => `${v}`} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E2DA', borderRadius: '0' }}
                          labelStyle={{ fontFamily: 'serif', fontWeight: 'bold' }}
                          formatter={(v: number) => [`${v.toFixed(2)} EGP`, "Revenue"]} 
                          labelFormatter={(val) => format(new Date(val + "T00:00"), "MMM dd, yyyy")} 
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#C8A96B" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center velora-label">Loading timeline...</div>}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="velora-heading text-2xl">Order Status</h3>
                <div className="bg-card border border-border p-8 h-full">
                  <div className="h-[200px] mb-8">
                    {orderStatusBreakdown ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={orderStatusBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="count" nameKey="status">
                            {orderStatusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {orderStatusBreakdown?.filter(s => s.count > 0).map((s, i) => (
                      <div key={s.status} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="velora-label text-[10px] opacity-60 uppercase tracking-widest">{s.status.replace('_', ' ')}</span>
                        </div>
                        <span className="font-serif text-sm font-bold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="velora-heading text-2xl">Recent Orders</h3>
              <div className="bg-card border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/5">
                      {['Order', 'Customer', 'Date', 'Amount', 'Status'].map(h => (
                        <th key={h} className="velora-label p-8 opacity-60 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders?.orders?.map(o => (
                      <tr key={o.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-8 font-serif text-sm font-bold">#{o.id}</td>
                        <td className="p-8 font-medium text-sm">{o.userName || `User ${o.userId}`}</td>
                        <td className="p-8 velora-label opacity-60">{format(new Date(o.createdAt), "MMM d, yyyy")}</td>
                        <td className="p-8 font-serif text-sm font-bold">{o.totalPrice.toFixed(2)} EGP</td>
                        <td className="p-8">
                          <span className="velora-label text-[8px] px-3 py-1 border border-border bg-muted/20 uppercase tracking-widest">{o.status}</span>
                        </td>
                      </tr>
                    ))}
                    {!recentOrders?.orders?.length && (
                      <tr><td colSpan={5} className="p-16 text-center velora-label opacity-40">No recent activity</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS (BI) ───────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-20 velora-reveal visible">
            <div>
              <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Business Intelligence</h1>
              <p className="velora-label opacity-60 tracking-[0.2em]">Growth & performance insights</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Today's Revenue" value={`${bi?.dailyRevenue || 0} EGP`} />
              <StatCard label="This Week" value={`${bi?.weeklyRevenue || 0} EGP`} />
              <StatCard label="This Month" value={`${bi?.monthlyRevenue || 0} EGP`} />
              <StatCard label="Avg Order Value" value={`${bi?.averageOrderValue || 0} EGP`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StatCard label="Total Customers" value={bi?.totalCustomers ?? 0} />
              <StatCard label="Returning Customers" value={bi?.returningCustomers ?? 0} sub="Placed more than 1 order" />
              <StatCard label="Repeat Purchase Rate" value={`${bi?.repeatPurchaseRate ?? 0}%`} sub="Customers who reordered" subColor={(bi?.repeatPurchaseRate ?? 0) >= 20 ? 'text-green-600' : 'text-accent'} />
            </div>

            <div className="space-y-8">
              <h3 className="velora-heading text-2xl">Top Products by Units Sold</h3>
              <div className="bg-card border border-border p-10 h-[400px]">
                {topProducts && topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(15,23,42,0.05)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.4)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nameEn" width={160} tick={{ fontSize: 10, fill: 'rgba(15,23,42,0.8)', fontFamily: 'serif' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E2DA', borderRadius: '0' }}
                        cursor={{ fill: 'rgba(15,23,42,0.02)' }}
                      />
                      <Bar dataKey="totalSold" fill="#5B1E2D" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="velora-label opacity-40">No sales data yet</p>}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className="velora-heading text-2xl">Top Categories</h3>
                <div className="space-y-6">
                  {topCategories?.slice(0, 6).map((c, i) => (
                    <div key={c.categoryId} className="flex items-center justify-between border-b border-border pb-6 last:border-0">
                      <div className="flex items-center gap-6">
                        <span className="velora-heading text-xl opacity-20">{i + 1}</span>
                        <div className="font-serif text-sm font-medium">{c.nameEn}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-sm font-bold">{c.revenue.toFixed(0)} EGP</div>
                        <div className="velora-label text-[10px] opacity-40 uppercase tracking-widest">{c.totalSold} sold</div>
                      </div>
                    </div>
                  ))}
                  {!topCategories?.length && <p className="velora-label opacity-40">No data available</p>}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="velora-heading text-2xl">Vendor Performance</h3>
                <div className="space-y-6">
                  {vendorPerf?.map((v) => (
                    <div key={v.vendorId} className="flex items-center justify-between border-b border-border pb-6 last:border-0">
                      <div>
                        <div className="font-serif text-sm font-medium">{v.name}</div>
                        <div className="velora-label text-[10px] opacity-40 uppercase tracking-widest">{v.productCount} products · {v.totalSold} sold</div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-sm font-bold text-accent">{v.revenue.toFixed(0)} EGP</div>
                      </div>
                    </div>
                  ))}
                  {!vendorPerf?.length && <p className="velora-label opacity-40">No vendors registered</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────────────────── */}
        {activeTab === 'users' && <div className="velora-reveal visible"><AdminUsersTab /></div>}

        {/* ── VENDORS ──────────────────────────────────────────────── */}
        {activeTab === 'vendors' && (
          <div className="space-y-12 velora-reveal visible">
             <div>
                <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Vendor Management</h1>
                <p className="velora-label opacity-60 tracking-[0.2em]">Promote or demote seller accounts</p>
              </div>
            <AdminUsersTab defaultRole="vendor" />
          </div>
        )}

        {/* ── PRODUCTS ─────────────────────────────────────────────── */}
        {activeTab === 'products' && <div className="velora-reveal visible"><AdminProductsTab /></div>}

        {/* ── ORDERS ───────────────────────────────────────────────── */}
        {activeTab === 'orders' && <div className="velora-reveal visible"><AdminOrdersTab /></div>}

        {/* ── CATEGORIES ───────────────────────────────────────────── */}
        {activeTab === 'categories' && <div className="velora-reveal visible"><AdminCategoriesTab /></div>}

        {/* ── COUPONS ──────────────────────────────────────────────── */}
        {activeTab === 'coupons' && <div className="velora-reveal visible"><AdminCouponsTab /></div>}

        {/* ── BANNERS ──────────────────────────────────────────────── */}
        {activeTab === 'banners' && <div className="velora-reveal visible"><AdminBannersTab /></div>}

        {/* ── REVIEWS ──────────────────────────────────────────────── */}
        {activeTab === 'reviews' && <div className="velora-reveal visible"><AdminReviewsTab /></div>}

        {/* ── AUDIT LOGS ───────────────────────────────────────────── */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-12 velora-reveal visible">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Audit Logs</h1>
                <p className="velora-label opacity-60 tracking-[0.2em]">Security & action history</p>
              </div>
              <span className="velora-label text-[10px] opacity-40">{auditData?.total ?? 0} entries</span>
            </div>

            <div className="flex gap-6">
              <input
                type="text"
                placeholder="Search by email..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="flex-1 border-b border-border bg-transparent py-4 velora-label text-[10px] focus:outline-none focus:border-accent transition-colors"
              />
              <button onClick={() => refetchAudit()} className="velora-btn-primary py-2 px-8">
                Search
              </button>
            </div>

            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    {['Admin', 'Action', 'Resource', 'IP', 'Time'].map(h => (
                      <th key={h} className="velora-label p-8 opacity-60 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditData?.logs?.map(log => (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-8 font-medium text-sm">{log.userEmail}</td>
                      <td className="p-8">
                        <span className={`velora-label text-[8px] px-3 py-1 border uppercase tracking-widest ${
                          log.action === 'DELETE' ? 'border-destructive/20 text-destructive bg-destructive/5' :
                          log.action === 'CREATE' ? 'border-green-200 text-green-700 bg-green-50' :
                          'border-border text-accent bg-muted/20'
                        }`}>{log.action}</span>
                      </td>
                      <td className="p-8 velora-label text-[10px] opacity-60 capitalize">{log.resource} <span className="text-[8px] opacity-40">{log.resourceId}</span></td>
                      <td className="p-8 font-mono text-[10px] opacity-40">{log.ip ?? '—'}</td>
                      <td className="p-8 velora-label text-[10px] opacity-60">{format(new Date(log.createdAt), "MMM d, HH:mm")}</td>
                    </tr>
                  ))}
                  {!auditData?.logs?.length && (
                    <tr><td colSpan={5} className="p-16 text-center velora-label opacity-40">Clean history</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SECURITY ─────────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-12 velora-reveal visible">
             <div>
                <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Security Panel</h1>
                <p className="velora-label opacity-60 tracking-[0.2em]">Authentication & Access control</p>
              </div>
             <div className="bg-card border border-border p-12">
               <SecurityPanel />
             </div>
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-12 velora-reveal visible">
             <div>
                <h1 className="velora-heading text-4xl lg:text-5xl mb-3">System Settings</h1>
                <p className="velora-label opacity-60 tracking-[0.2em]">Global platform configuration</p>
              </div>
             <div className="bg-card border border-border p-12">
               <SettingsPanel />
             </div>
          </div>
        )}

        {/* ── MANUAL PAYMENTS ──────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div className="space-y-12 velora-reveal visible">
             <div>
                <h1 className="velora-heading text-4xl lg:text-5xl mb-3">Payment Verification</h1>
                <p className="velora-label opacity-60 tracking-[0.2em]">Verify bank transfers & receipts</p>
              </div>
            <AdminManualPaymentsTab />
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

function AdminFaqTab() {
  return <div className="velora-label opacity-40 p-20 text-center">FAQ Management coming soon to Velora.</div>;
}
function AdminContactMessagesTab() {
  return <div className="velora-label opacity-40 p-20 text-center">Inquiry system coming soon to Velora.</div>;
}
function AdminNewsletterTab() {
  return <div className="velora-label opacity-40 p-20 text-center">Subscriber management coming soon to Velora.</div>;
}
