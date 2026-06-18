import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";
import { useAdminListReviews, useDeleteReview, getAdminListReviewsQueryKey, getGetMyReviewsQueryKey } from "@workspace/api-client-react";
import { Star, Trash2, CheckCircle2, Clock, XCircle, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

type ReviewRow = {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  verifiedPurchase: boolean;
  status: string;
  moderationNote?: string | null;
  createdAt: string;
  userName?: string;
  productNameEn?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", Icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", Icon: XCircle },
};

export default function AdminReviewsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [moderatingId, setModeratingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const LIMIT = 20;

  const params = {
    page,
    limit: LIMIT,
    ...(search ? { search } : {}),
    ...(ratingFilter ? { rating: Number(ratingFilter) } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { data, isLoading, refetch } = useAdminListReviews(params, {
    query: { queryKey: [...getAdminListReviewsQueryKey(params)] },
  });

  const deleteMutation = useDeleteReview();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminListReviewsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMyReviewsQueryKey() });
        refetch();
      },
    });
  };

  const handleModerate = async (id: number, status: "approved" | "rejected", note?: string) => {
    setModeratingId(id);
    try {
      await adminFetch(`/api/admin/reviews/${id}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({ status, moderationNote: note ?? null }),
      });
      qc.invalidateQueries({ queryKey: getAdminListReviewsQueryKey() });
      refetch();
    } catch {
    } finally {
      setModeratingId(null);
      setRejectTargetId(null);
      setRejectNote("");
    }
  };

  const reviews = (data?.reviews ?? []) as unknown as ReviewRow[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold font-serif">Review Moderation</h1>
        <span className="text-sm text-muted-foreground">{total} found</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pending", "approved", "rejected", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === s
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
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
                  {["#", "Product", "Customer", "Rating", "Title", "Comment", "Verified", "Status", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map(r => {
                  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.Icon;
                  return (
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        {r.moderationNote && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[120px] truncate" title={r.moderationNote}>
                            {r.moderationNote}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {r.status !== "approved" && (
                            <button
                              onClick={() => handleModerate(r.id, "approved")}
                              disabled={moderatingId === r.id}
                              title="Approve"
                              className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-40"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {r.status !== "rejected" && (
                            <button
                              onClick={() => setRejectTargetId(r.id)}
                              disabled={moderatingId === r.id}
                              title="Reject"
                              className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-40"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Reject with note modal */}
      {rejectTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border p-6 max-w-sm w-full mx-4 shadow-lg space-y-4">
            <h3 className="font-bold text-lg">Reject Review</h3>
            <p className="text-sm text-muted-foreground">Optionally add a note explaining the rejection.</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              rows={3}
              className="w-full border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRejectTargetId(null); setRejectNote(""); }}
                className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleModerate(rejectTargetId, "rejected", rejectNote || undefined)}
                disabled={moderatingId === rejectTargetId}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {moderatingId === rejectTargetId ? "Rejecting..." : "Reject Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
