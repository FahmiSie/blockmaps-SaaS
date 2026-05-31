"use client";

import { api } from "@/trpc/react";
import { useState } from "react";
import {
  Users, UserPlus, Search, Shield, X, Check,
  Loader2, MoreHorizontal, UserX, ChevronLeft, ChevronRight,
} from "lucide-react";
import { hasPermission, type Role } from "@/lib/rbac";

/* ─── Types ──────────────────────────────────────────────── */
interface CurrentUser {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  ADMIN:    { label: "Admin",    color: "#0891b2", bg: "rgba(8,145,178,0.12)" },
  MANAGER:  { label: "Manager",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  OPERATOR: { label: "Operator", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as Role] ?? ROLE_CONFIG.OPERATOR;
  return (
    <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function Avatar({ name, image, size = 32 }: { name?: string | null; image?: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return image ? (
    <img src={image} alt={name ?? ""} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0"
      style={{ width: size, height: size, background: "var(--bg-overlay)", color: "var(--text-secondary)", border: "1px solid var(--border-base)" }}>
      {initials}
    </div>
  );
}

/* ─── Invite Modal ──────────────────────────────────────── */
function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MANAGER" | "OPERATOR">("OPERATOR");
  const [error, setError] = useState("");

  const invite = api.user.invite.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-md p-6 shadow-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)" }}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>Invite Team Member</h2>
            <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>The user must already have a BlockMaps account</p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1.5 transition-colors hover:bg-accent/50">
            <X className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-sm border px-4 py-2.5 text-[12px]"
            style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>Email Address</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@company.com"
              className="w-full rounded-sm border px-3 py-2 text-[13px] outline-none transition-colors"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full rounded-sm border px-3 py-2 text-[13px] outline-none"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
            >
              <option value="OPERATOR">Operator — Can create and manage deliveries</option>
              <option value="MANAGER">Manager — Can approve/reject deliveries</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-sm border py-2.5 text-[13px] font-medium transition-colors hover:bg-accent/50"
            style={{ borderColor: "var(--border-base)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button
            onClick={() => { if (email.trim()) invite.mutate({ email: email.trim(), role }); }}
            disabled={invite.isPending || !email.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm py-2.5 text-[13px] font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--foreground)", color: "var(--bg-base)" }}
          >
            {invite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Role Modal ───────────────────────────────────── */
function EditRoleModal({ user, onClose, onSuccess }: {
  user: { id: string; name?: string | null; email?: string | null; role: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [role, setRole] = useState<Role>(user.role as Role);
  const updateRole = api.user.updateRole.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-md p-6 shadow-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)" }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Change Role</h2>
          <button onClick={onClose}><X className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} /></button>
        </div>
        <p className="mb-4 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Changing role for <span style={{ color: "var(--text-secondary)" }}>{user.name ?? user.email}</span>
        </p>
        <div className="space-y-2">
          {(["ADMIN", "MANAGER", "OPERATOR"] as Role[]).map(r => {
            const cfg = ROLE_CONFIG[r];
            return (
              <button key={r} onClick={() => setRole(r)}
                className="flex w-full items-center gap-3 rounded-sm border p-3 text-left transition-all"
                style={{ background: role === r ? `${cfg.bg}` : "transparent", borderColor: role === r ? cfg.color : "var(--border-base)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: cfg.color }} />
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{cfg.label}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {r === "ADMIN" ? "Full access — manage users, zones, and settings" : r === "MANAGER" ? "Approve and reject delivery requests" : "Create deliveries and manage inventory"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-sm border py-2 text-[13px] transition-colors hover:bg-accent/50"
            style={{ borderColor: "var(--border-base)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button
            onClick={() => updateRole.mutate({ id: user.id, role })}
            disabled={updateRole.isPending || role === user.role}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm py-2 text-[13px] font-medium disabled:opacity-50"
            style={{ background: "var(--foreground)", color: "var(--bg-base)" }}>
            {updateRole.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Save Role
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Remove Confirm Modal ──────────────────────────────── */
function RemoveConfirmModal({ user, onClose, onSuccess }: {
  user: { id: string; name?: string | null; email?: string | null };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const removeUser = api.user.remove.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm rounded-md p-6 shadow-2xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)" }}>
        <h2 className="mb-2 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Remove Member</h2>
        <p className="mb-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Remove <span className="font-medium">{user.name ?? user.email}</span> from your company? They will lose access to all resources immediately.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-sm border py-2 text-[13px] transition-colors hover:bg-accent/50"
            style={{ borderColor: "var(--border-base)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button
            onClick={() => removeUser.mutate({ id: user.id })}
            disabled={removeUser.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm py-2 text-[13px] font-medium disabled:opacity-50"
            style={{ background: "#ef4444", color: "#fff" }}>
            {removeUser.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export function UsersClient({ currentUser }: { currentUser: CurrentUser }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState<{ id: string; name?: string | null; email?: string | null; role: string } | null>(null);
  const [removeUser, setRemoveUser] = useState<{ id: string; name?: string | null; email?: string | null } | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const role = currentUser.role as Role;
  const canInvite  = hasPermission(role, "canInviteUsers");
  const canRemove  = hasPermission(role, "canRemoveUsers");
  const canEdit    = hasPermission(role, "canChangeRoles");
  const hasActions = canRemove || canEdit;

  const { data, isLoading, refetch } = api.user.list.useQuery({
    page, limit: 15,
    search: search || undefined,
    role: roleFilter !== "ALL" ? roleFilter : undefined,
  });

  const { data: stats, isLoading: statsLoading } = api.user.stats.useQuery();

  const refresh = () => { refetch(); };

  const statCards = [
    { label: "Total Members", value: stats?.total ?? 0, color: "var(--text-secondary)" },
    { label: "Admins", value: stats?.byRole?.find((r: any) => r.role === "ADMIN")?._count ?? 0, color: "#0891b2" },
    { label: "Managers", value: stats?.byRole?.find((r: any) => r.role === "MANAGER")?._count ?? 0, color: "#f59e0b" },
    { label: "Operators", value: stats?.byRole?.find((r: any) => r.role === "OPERATOR")?._count ?? 0, color: "#6b7280" },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b px-8 py-4"
        style={{ background: "var(--bg-base)", borderColor: "var(--border-base)" }}>
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Users</h1>
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Manage team members and access permissions</p>
        </div>
        {canInvite && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-sm px-4 py-2 text-[13px] font-medium transition-all hover:opacity-90"
            style={{ background: "var(--foreground)", color: "var(--bg-base)" }}>
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 px-8 py-6">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((s, i) => (
            <div key={i} className="rounded-md p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{s.label}</p>
              <p className="text-[28px] font-bold tabular-nums" style={{ color: s.color, letterSpacing: "-0.02em" }}>
                {statsLoading ? "—" : s.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full rounded-sm border py-2 pl-9 pr-3 text-[13px] outline-none transition-colors"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="flex gap-1 rounded-sm border p-1" style={{ background: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
            {(["ALL", "ADMIN", "MANAGER", "OPERATOR"] as const).map(r => (
              <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
                className="rounded-sm px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors"
                style={{
                  background: roleFilter === r ? "var(--bg-overlay)" : "transparent",
                  color: roleFilter === r ? "var(--text-primary)" : "var(--text-tertiary)",
                }}>
                {r === "ALL" ? "All" : ROLE_CONFIG[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
          {/* Header */}
          <div className="grid border-b px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", color: "var(--text-tertiary)", borderColor: "var(--border-base)" }}>
            <span>Name</span><span>Email</span><span>Role</span><span>Joined</span><span className="text-right">Actions</span>
          </div>

          {isLoading ? (
            <div className="space-y-0">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid items-center border-b px-5" style={{ height: "56px", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", borderColor: "var(--border-base)" }}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full" style={{ background: "var(--bg-overlay)" }} />
                    <div className="h-3 w-28 animate-pulse rounded" style={{ background: "var(--bg-overlay)" }} />
                  </div>
                  <div className="h-3 w-40 animate-pulse rounded" style={{ background: "var(--bg-overlay)" }} />
                  <div className="h-5 w-16 animate-pulse rounded" style={{ background: "var(--bg-overlay)" }} />
                  <div className="h-3 w-20 animate-pulse rounded" style={{ background: "var(--bg-overlay)" }} />
                  <div />
                </div>
              ))}
            </div>
          ) : !data?.users.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Users className="h-10 w-10" style={{ color: "var(--text-tertiary)" }} />
              <p className="text-[14px] font-medium" style={{ color: "var(--text-secondary)" }}>No team members yet</p>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                {canInvite ? "Invite your first team member to get started" : "Your admin can invite users to the workspace"}
              </p>
              {canInvite && (
                <button onClick={() => setShowInvite(true)}
                  className="mt-2 flex items-center gap-2 rounded-sm border px-4 py-2 text-[12px] font-medium transition-colors hover:bg-accent/50"
                  style={{ borderColor: "var(--border-base)", color: "var(--text-secondary)" }}>
                  <UserPlus className="h-3.5 w-3.5" /> Invite User
                </button>
              )}
            </div>
          ) : (
            data.users.map(u => (
              <div
                key={u.id}
                className="relative grid items-center border-b px-5 transition-colors"
                style={{ height: "56px", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", borderColor: "var(--border-base)", fontSize: "13px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-overlay)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} image={u.image} />
                  <span className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                    {u.name ?? "—"}
                    {u.id === currentUser.id && (
                      <span className="ml-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>(you)</span>
                    )}
                  </span>
                </div>
                <span className="truncate" style={{ color: "var(--text-secondary)" }}>{u.email}</span>
                <RoleBadge role={u.role} />
                <span className="tabular-nums" style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>
                  {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>

                {/* Actions — only shown if user has any action-level permission and it's not themselves */}
                {hasActions && u.id !== currentUser.id ? (
                  <div className="relative flex justify-end">
                    <button
                      onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                      className="rounded-sm p-1.5 transition-colors hover:bg-accent/50"
                    >
                      <MoreHorizontal className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
                    </button>
                    {actionMenu === u.id && (
                      <div className="absolute right-0 top-8 z-20 w-40 rounded-sm border shadow-lg"
                        style={{ background: "var(--bg-elevated)", borderColor: "var(--border-base)" }}>
                        {canEdit && (
                          <button onClick={() => { setEditUser(u); setActionMenu(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-accent/50"
                            style={{ color: "var(--text-secondary)" }}>
                            <Shield className="h-3.5 w-3.5" /> Change Role
                          </button>
                        )}
                        {canRemove && (
                          <button onClick={() => { setRemoveUser(u); setActionMenu(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-accent/50"
                            style={{ color: "#ef4444" }}>
                            <UserX className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : <div />}
              </div>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, data.total)} of {data.total} members
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-sm border transition-colors hover:bg-accent/50 disabled:opacity-40"
                style={{ borderColor: "var(--border-base)" }}>
                <ChevronLeft className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
              </button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-sm border transition-colors hover:bg-accent/50 disabled:opacity-40"
                style={{ borderColor: "var(--border-base)" }}>
                <ChevronRight className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={refresh} />}
      {editUser && <EditRoleModal user={editUser} onClose={() => setEditUser(null)} onSuccess={refresh} />}
      {removeUser && <RemoveConfirmModal user={removeUser} onClose={() => setRemoveUser(null)} onSuccess={refresh} />}

      {/* Click-away to close action menu */}
      {actionMenu && <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />}
    </div>
  );
}
