import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/adminFetch";
import { format } from "date-fns";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "vendor" | "admin";
  avatar: string | null;
  createdAt: string;
};
type UserListResponse = { users: UserRow[]; total: number; page: number; limit: number };

const ROLES = ["all", "customer", "vendor", "admin"] as const;
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  vendor: "bg-blue-100 text-blue-700",
  customer: "bg-green-100 text-green-700",
};

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

function ConfirmDialog({
  open, title, message, onConfirm, onCancel, danger,
}: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border p-6 max-w-sm w-full mx-4 shadow-lg">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium transition-colors ${danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersTab({ defaultRole = "all" }: { defaultRole?: string }) {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>(defaultRole);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [confirmRole, setConfirmRole] = useState<{ user: UserRow; newRole: string } | null>(null);

  const params = new URLSearchParams();
  if (roleFilter !== "all") params.set("role", roleFilter);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, isLoading, isError } = useQuery<UserListResponse>({
    queryKey: ["admin-users", roleFilter, search, page],
    queryFn: () => adminFetch(`/api/users?${params}`),
    staleTime: 30_000,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      adminFetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setConfirmRole(null); },
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => adminFetch(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setConfirmDelete(null); },
  });

  const total = data?.total ?? 0;
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">User Management</h1>
        <span className="text-sm text-muted-foreground">{total} total users</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 border border-border bg-muted/20 p-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${roleFilter === r ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleSearch} className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6"><Skeleton /></div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600 text-sm">Failed to load users. Please retry.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  {["ID", "Name", "Email", "Role", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.users?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground">{user.id}</td>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium capitalize rounded-sm ${ROLE_COLORS[user.role] ?? "bg-muted"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => setConfirmRole({ user, newRole: e.target.value })}
                          className="text-xs border border-border px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="customer">Customer</option>
                          <option value="vendor">Vendor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          className="px-2 py-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.users?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No users found</td>
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

      {/* Role change confirm */}
      <ConfirmDialog
        open={!!confirmRole}
        title="Change User Role"
        message={`Change ${confirmRole?.user.name}'s role from "${confirmRole?.user.role}" to "${confirmRole?.newRole}"?`}
        onConfirm={() => confirmRole && updateRole.mutate({ id: confirmRole.user.id, role: confirmRole.newRole })}
        onCancel={() => setConfirmRole(null)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete User"
        message={`Permanently delete "${confirmDelete?.name}" (${confirmDelete?.email})? This cannot be undone.`}
        onConfirm={() => confirmDelete && deleteUser.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  );
}
