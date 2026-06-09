import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGetAnalyticsSummary, useGetOrderStatusBreakdown, useGetSalesTimeline, useListOrders } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from "date-fns";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: summary } = useGetAnalyticsSummary({ query: { enabled: !!user } });
  const { data: orderStatusBreakdown } = useGetOrderStatusBreakdown({ query: { enabled: !!user } });
  const { data: salesTimeline } = useGetSalesTimeline({ period: 'month' }, { query: { enabled: !!user } });
  const { data: recentOrders } = useListOrders({ limit: 10 }, { query: { enabled: !!user } });

  if (!user || user.role !== "admin") return <div className="p-16 text-center">Unauthorized access</div>;

  const COLORS = ['var(--color-primary)', 'var(--color-accent)', 'var(--color-destructive)', 'var(--color-chart-4)', 'var(--color-chart-5)'];

  return (
    <div className="flex min-h-[calc(100vh-16rem)]">
      {/* Sidebar for Admin */}
      <div className="w-64 border-r border-border bg-muted/20 hidden md:block shrink-0">
        <div className="p-6">
          <h2 className="font-serif text-xl font-bold mb-6">Admin Panel</h2>
          <nav className="space-y-1 flex flex-col">
            {['overview', 'users', 'vendors', 'products', 'categories', 'orders', 'banners'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold font-serif">Platform Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-border p-6 bg-card shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold">${summary?.totalRevenue?.toFixed(2) || "0.00"}</p>
                <p className={`text-xs mt-2 ${(summary?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(summary?.revenueGrowth || 0) >= 0 ? '↑' : '↓'} {Math.abs(summary?.revenueGrowth || 0)}% from last month
                </p>
              </div>
              <div className="border border-border p-6 bg-card shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Orders</h3>
                <p className="text-3xl font-bold">{summary?.totalOrders || 0}</p>
              </div>
              <div className="border border-border p-6 bg-card shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Customers</h3>
                <p className="text-3xl font-bold">{summary?.totalCustomers || 0}</p>
              </div>
              <div className="border border-border p-6 bg-card shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Active Products</h3>
                <p className="text-3xl font-bold">{summary?.totalProducts || 0}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 border border-border p-6 bg-card">
                <h3 className="font-serif text-xl font-bold mb-6">Revenue Over Time</h3>
                <div className="h-80">
                  {salesTimeline ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTimeline}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MMM dd")} />
                        <YAxis />
                        <RechartsTooltip labelFormatter={(val) => format(new Date(val), "MMM dd, yyyy")} />
                        <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
                  )}
                </div>
              </div>

              <div className="border border-border p-6 bg-card">
                <h3 className="font-serif text-xl font-bold mb-6">Order Status</h3>
                <div className="h-80">
                  {orderStatusBreakdown ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="status"
                        >
                          {orderStatusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {orderStatusBreakdown?.map((status, index) => (
                    <div key={status.status} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="capitalize">{status.status.replace('_', ' ')}</span>
                      </div>
                      <span className="font-bold">{status.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="border border-border p-6 bg-card">
              <h3 className="font-serif text-xl font-bold mb-6">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders?.orders?.map(order => (
                      <tr key={order.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-bold">#{order.id}</td>
                        <td className="px-6 py-4">{order.userName || `User ${order.userId}`}</td>
                        <td className="px-6 py-4">{format(new Date(order.createdAt), "MMM dd, yyyy")}</td>
                        <td className="px-6 py-4 font-bold">${order.totalPrice.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-muted text-xs uppercase tracking-wider">{order.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab !== 'overview' && (
          <div className="flex items-center justify-center h-full border border-border bg-muted/10">
            <div className="text-center">
              <h2 className="text-2xl font-serif font-bold mb-2 capitalize">{activeTab} Management</h2>
              <p className="text-muted-foreground">Module implementation in progress</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
