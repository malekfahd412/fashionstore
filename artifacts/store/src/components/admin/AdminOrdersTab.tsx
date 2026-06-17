import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";
import { format } from "date-fns";
import { getGetAnalyticsSummaryQueryKey, getGetOrderStatusBreakdownQueryKey, getListOrdersQueryKey } from "@workspace/api-client-react";

type OrderItem = {
  id: number;
  productNameEn: string;
  color: string | null;
  size: string | null;
  quantity: number;
  price: number;
  imageUrl: string | null;
};
type Order = {
  id: number;
  userId: number;
  userName: string;
  status: string;
  totalPrice: number;
  discount: number | null;
  paymentMethod: string;
  couponCode: string | null;
  createdAt: string;
  items: OrderItem[];
};
type OrderListResponse = { orders: Order[]; total: number; page: number; limit: number };

const ALL_STATUSES = ["all", "new", "paid", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"] as const;
type StatusFilter = (typeof ALL_STATUSES)[number];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  processing: "bg-orange-100 text-orange-700",
  packed: "bg-teal-100 text-teal-700",
  shipped: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const NEXT_STATUSES: Record<string, string[]> = {
  new: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border max-w-lg w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-serif font-bold text-xl">Order #{order.id}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg font-bold">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Customer:</span> <strong>{order.userName || `User ${order.userId}`}</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <span className={`px-2 py-0.5 text-xs font-medium capitalize rounded-sm ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>{order.status}</span></div>
            <div><span className="text-muted-foreground">Date:</span> <strong>{format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}</strong></div>
            <div><span className="text-muted-foreground">Payment:</span> <strong className="capitalize">{order.paymentMethod}</strong></div>
            {order.couponCode && <div><span className="text-muted-foreground">Coupon:</span> <strong>{order.couponCode}</strong></div>}
            {order.discount && order.discount > 0 && <div><span className="text-muted-foreground">Discount:</span> <strong className="text-green-600">-{order.discount.toFixed(2)} EGP</strong></div>}
            <div><span className="text-muted-foreground">Total:</span> <strong className="text-lg">{order.totalPrice.toFixed(2)} EGP</strong></div>
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3">Items ({order.items.length})</h4>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productNameEn} className="w-10 h-10 object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 bg-muted flex items-center justify-center text-muted-foreground text-xs">IMG</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.productNameEn}</div>
                    <div className="text-xs text-muted-foreground">
                      {[item.color, item.size].filter(Boolean).join(" / ")} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-bold">{(item.price * item.quantity).toFixed(2)} EGP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading, isError } = useQuery<OrderListResponse>({
    queryKey: ["admin-orders", statusFilter, page],
    queryFn: () => adminFetch(`/api/orders?${params}`),
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminFetch(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      qc.invalidateQueries({ queryKey: getGetOrderStatusBreakdownQueryKey() });
      qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ limit: 10 }) });
    },
  });

  const total = data?.total ?? 0;
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Order Management</h1>
        <span className="text-sm text-muted-foreground">{total} total orders</span>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border border-border bg-muted/20 p-1 flex-wrap">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton /></div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600 text-sm">Failed to load orders. Please retry.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["Order", "Customer", "Date", "Items", "Total", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.orders?.map((order) => {
                  const nextSteps = NEXT_STATUSES[order.status] ?? [];
                  return (
                    <tr key={order.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-bold">
                        <button onClick={() => setDetailOrder(order)} className="hover:underline text-primary">
                          #{order.id}
                        </button>
                      </td>
                      <td className="px-4 py-3">{order.userName || `User ${order.userId}`}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{format(new Date(order.createdAt), "MMM d, yyyy")}</td>
                      <td className="px-4 py-3 text-center">{order.items.length}</td>
                      <td className="px-4 py-3 font-bold">{order.totalPrice.toFixed(2)} EGP</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium capitalize rounded-sm ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => setDetailOrder(order)}
                            className="px-2 py-1 text-xs border border-border hover:bg-muted transition-colors"
                          >
                            View
                          </button>
                          {nextSteps.map((ns) => (
                            <button
                              key={ns}
                              disabled={updatingId === order.id}
                              onClick={() => updateStatus.mutate({ id: order.id, status: ns })}
                              className={`px-2 py-1 text-xs capitalize transition-colors disabled:opacity-50 ${
                                ns === "cancelled"
                                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            >
                              → {ns}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data?.orders?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No orders found</td>
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
            className="px-3 py-1.5 border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">
            ← Prev
          </button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors">
            Next →
          </button>
        </div>
      )}

      {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
    </div>
  );
}
