import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetAnalyticsSummary, useGetOrderStatusBreakdown, useGetSalesTimeline, useListOrders,
  getGetAnalyticsSummaryQueryKey, getGetOrderStatusBreakdownQueryKey, getGetSalesTimelineQueryKey, getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { format } from "date-fns";
import SettingsPanel from "@/components/SettingsPanel";
import SecurityPanel from "@/components/SecurityPanel";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminCategoriesTab from "@/components/admin/AdminCategoriesTab";
import AdminCouponsTab from "@/components/admin/AdminCouponsTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminProductsTab from "@/components/admin/AdminProductsTab";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
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

  if (!user || user.role !== "admin") return <div className="p-16 text-center">Unauthorized access</div>;

  return (
    <div className="flex min-h-[calc(100vh-16rem)]">
      {/* Sidebar */}
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

      <div className="flex-1 p-8 overflow-y-auto">

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold font-serif">Platform Overview</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Revenue" value={`$${summary?.totalRevenue?.toFixed(2) ?? "0.00"}`} sub={`${(summary?.revenueGrowth ?? 0) >= 0 ? '↑' : '↓'} ${Math.abs(summary?.revenueGrowth ?? 0)}% vs last month`} subColor={(summary?.revenueGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'} />
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
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <RechartsTooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} labelFormatter={(val) => format(new Date(val + "T00:00"), "MMM dd, yyyy")} />
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
                        <td className="px-4 py-3 font-bold">${o.totalPrice.toFixed(2)}</td>
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
              <StatCard label="Today's Revenue" value={`$${bi?.dailyRevenue?.toFixed(2) ?? "0.00"}`} />
              <StatCard label="This Week" value={`$${bi?.weeklyRevenue?.toFixed(2) ?? "0.00"}`} />
              <StatCard label="This Month" value={`$${bi?.monthlyRevenue?.toFixed(2) ?? "0.00"}`} />
              <StatCard label="Avg Order Value" value={`$${bi?.averageOrderValue?.toFixed(2) ?? "0.00"}`} />
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
                        <div className="font-bold">${c.revenue.toFixed(0)}</div>
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
                        <div className="font-bold">${v.revenue.toFixed(0)}</div>
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
              Vendors are users with the "vendor" role. Use the Users tab to promote/demote roles. Below are all current vendors.
            </p>
            <AdminUsersTab />
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

        {/* ── SECURITY ─────────────────────────────────────────────── */}
        {activeTab === 'security' && <SecurityPanel />}

        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        {activeTab === 'settings' && <SettingsPanel />}

      </div>
    </div>
  );
}
