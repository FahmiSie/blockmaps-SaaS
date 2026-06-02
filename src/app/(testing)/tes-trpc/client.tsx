"use client";

import { useState, type ReactNode } from "react";
import { api } from "@/trpc/react";
import {
  updateProfileAction,
  updateUserRoleAction,
  inviteUserAction,
  removeUserFromCompanyAction,
} from "@/server/actions/users.action";
import {
  createCompanyAction,
  updateCompanyAction,
} from "@/server/actions/company.action";
import {
  createZoneAction,
  updateZoneAction,
  deactivateZoneAction,
  deleteZoneAction,
  bulkUpdateZonePositionsAction,
} from "@/server/actions/zone.action";
import {
  createItemAction,
  updateItemAction,
  deleteItemAction,
  bulkImportItemsAction,
  upsertInventoryAction,
} from "@/server/actions/item.action";
import {
  createDeliveryRequestAction,
  approveDeliveryAction,
  rejectDeliveryAction,
  startDeliveryAction,
  completeDeliveryAction,
  cancelDeliveryAction,
} from "@/server/actions/delivery.action";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "user" | "company" | "zone" | "item" | "inventory" | "delivery";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Helpers ───────────────────────────────────────────────────────────────────


function Badge({
  label,
  color,
}: {
  label: string;
  color: "green" | "yellow" | "red" | "gray" | "blue";
}) {
  const map = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
    gray: "bg-zinc-100 text-zinc-600 border-zinc-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[color]}`}
    >
      {label}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-zinc-800">{title}</h3>
      {children}
    </div>
  );
}

function ResultBox({ result }: { result: Record<string, unknown> | null }) {
  if (!result) return null;
  return (
    <pre className="mt-3 overflow-auto rounded-lg bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-700">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-medium text-zinc-800">
        {value == null
          ? "—"
          : typeof value === "boolean"
            ? String(value)
            : value}
      </span>
    </div>
  );
}

// ── Input component ──────────────────────────────────────────────────────────
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
      />
    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  label,
  variant = "default",
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  variant?: "default" | "danger" | "success";
}) {
  const map = {
    default: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${map[variant]}`}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "user", label: "User", emoji: "👤" },
  { id: "company", label: "Company", emoji: "🏭" },
  { id: "zone", label: "Zone", emoji: "📐" },
  { id: "item", label: "Item", emoji: "📦" },
  { id: "inventory", label: "Inventory", emoji: "🗃️" },
  { id: "delivery", label: "Delivery", emoji: "🚚" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export default function FlowGridTestClient({
  sessionUser,
}: {
  sessionUser: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("user");
  const utils = api.useUtils();

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* Header */}
      <div className="mb-6 rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">
              FlowGrid · API Testing
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">
              tRPC queries + server actions — semua dalam satu halaman
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-zinc-700">
              {sessionUser?.name ?? "Not logged in"}
            </p>
            <p className="text-[11px] text-zinc-400">
              {sessionUser?.email ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1.5 rounded-xl border bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === t.id
                ? "bg-zinc-900 text-white shadow"
                : "text-zinc-500 hover:bg-zinc-100"
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid gap-4">
        {activeTab === "user" && <UserTab utils={utils} />}
        {activeTab === "company" && <CompanyTab utils={utils} />}
        {activeTab === "zone" && <ZoneTab utils={utils} />}
        {activeTab === "item" && <ItemTab utils={utils} />}
        {activeTab === "inventory" && <InventoryTab utils={utils} />}
        {activeTab === "delivery" && <DeliveryTab utils={utils} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER TAB
// ─────────────────────────────────────────────────────────────────────────────

function UserTab({ utils }: { utils: ReturnType<typeof api.useUtils> }) {
  // ── tRPC queries ──
  const { data: me, isLoading: meLoading } = api.user.me.useQuery();
  const { data: stats, isLoading: statsLoading } = api.user.stats.useQuery();
  const { data: userList, isLoading: listLoading } = api.user.list.useQuery({
    page: 1,
    limit: 10,
  });

  // ── server action state ──
  const [profileName, setProfileName] = useState(me?.name ?? "");
  const [roleUserId, setRoleUserId] = useState("");
  const [roleValue, setRoleValue] = useState<"ADMIN" | "MANAGER" | "OPERATOR">(
    "OPERATOR",
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "OPERATOR">(
    "OPERATOR",
  );
  const [removeId, setRemoveId] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(null);

  async function run<T>(fn: () => Promise<ActionResult<T>>) {
  setActionLoading(true);
  setActionResult(null);
  try {
    const res = await fn();
    setActionResult(res as Record<string, unknown>);
    if (res.success) {
      void utils.user.me.invalidate();
      void utils.user.list.invalidate();
      void utils.user.stats.invalidate();
    }
  } finally {
    setActionLoading(false);
  }
}

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* ── QUERIES ── */}
      <Section title="tRPC · user.me">
        {meLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <>
            <StatusRow label="id" value={me?.id} />
            <StatusRow label="name" value={me?.name} />
            <StatusRow label="email" value={me?.email} />
            <StatusRow label="role" value={me?.role} />
            <StatusRow label="companyId" value={me?.companyId} />
          </>
        )}
      </Section>

      <Section title="tRPC · user.stats">
        {statsLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <>
            <StatusRow label="total users" value={stats?.total} />
            {stats?.byRole.map((r) => (
              <StatusRow key={r.role} label={r.role} value={r._count} />
            ))}
          </>
        )}
      </Section>

      <Section title="tRPC · user.list (page 1, limit 10)">
        {listLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <>
            <StatusRow label="total" value={userList?.total} />
            <StatusRow label="totalPages" value={userList?.totalPages} />
            <div className="mt-2 space-y-1">
              {userList?.users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5"
                >
                  <span className="text-xs text-zinc-700">
                    {u.name ?? u.email}
                  </span>
                  <Badge
                    label={u.role}
                    color={
                      u.role === "ADMIN"
                        ? "red"
                        : u.role === "MANAGER"
                          ? "blue"
                          : "gray"
                    }
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <div className="space-y-4">
        <Section title="Action · updateProfile">
          <Input
            label="New name"
            value={profileName}
            onChange={setProfileName}
            placeholder="e.g. John Doe"
          />
          <div className="mt-3">
            <ActionButton
              onClick={() =>
                run(() => updateProfileAction({ name: profileName }))
              }
              loading={actionLoading}
              label="Update Profile"
            />
          </div>
        </Section>

        <Section title="Action · updateUserRole">
          <Input
            label="User ID (cuid)"
            value={roleUserId}
            onChange={setRoleUserId}
            placeholder="clxxxxxxx..."
          />
          <div className="mt-2 space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Role
            </label>
            <select
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value as typeof roleValue)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              {["ADMIN", "MANAGER", "OPERATOR"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <ActionButton
              onClick={() =>
                run(() =>
                  updateUserRoleAction({ userId: roleUserId, role: roleValue }),
                )
              }
              loading={actionLoading}
              label="Update Role"
            />
          </div>
        </Section>

        <Section title="Action · inviteUser">
          <Input
            label="Email"
            value={inviteEmail}
            onChange={setInviteEmail}
            placeholder="user@example.com"
            type="email"
          />
          <div className="mt-2 space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as typeof inviteRole)
              }
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              {["MANAGER", "OPERATOR"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <ActionButton
              onClick={() =>
                run(() =>
                  inviteUserAction({ email: inviteEmail, role: inviteRole }),
                )
              }
              loading={actionLoading}
              label="Invite User"
              variant="success"
            />
          </div>
        </Section>

        <Section title="Action · removeUserFromCompany">
          <Input
            label="User ID"
            value={removeId}
            onChange={setRemoveId}
            placeholder="clxxxxxxx..."
          />
          <div className="mt-3">
            <ActionButton
              onClick={() => run(() => removeUserFromCompanyAction(removeId))}
              loading={actionLoading}
              label="Remove from Company"
              variant="danger"
            />
          </div>
        </Section>
      </div>

      {/* Result box spans full width */}
      {actionResult && (
        <div className="col-span-2">
          <Section title="Last Action Result">
            <ResultBox result={actionResult} />
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY TAB
// ─────────────────────────────────────────────────────────────────────────────

function CompanyTab({ utils }: { utils: ReturnType<typeof api.useUtils> }) {
  const { data: company, isLoading: compLoading } =
    api.company.getCurrent.useQuery();
  const { data: summary, isLoading: sumLoading } =
    api.company.dashboardSummary.useQuery();

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [updateName, setUpdateName] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(null);

  async function run<T>(fn: () => Promise<ActionResult<T>>) {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fn();
      setActionResult(res);
      if (res.success) {
        void utils.company.getCurrent.invalidate();
        void utils.company.dashboardSummary.invalidate();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Section title="tRPC · company.getCurrent">
        {compLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : !company ? (
          <p className="text-xs text-zinc-400">No company found</p>
        ) : (
          <>
            <StatusRow label="id" value={company.id} />
            <StatusRow label="name" value={company.name} />
            <StatusRow label="slug" value={company.slug} />
          </>
        )}
      </Section>

      <Section title="tRPC · company.dashboardSummary">
        {sumLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : !summary ? (
          <p className="text-xs text-zinc-400">—</p>
        ) : (
          <>
            <StatusRow label="users" value={summary.users} />
            <StatusRow label="active zones" value={summary.activeZones} />
            <StatusRow label="items" value={summary.items} />
            <StatusRow
              label="pending deliveries"
              value={summary.deliveries.pending}
            />
            <StatusRow
              label="in progress"
              value={summary.deliveries.inProgress}
            />
            <StatusRow label="completed" value={summary.deliveries.completed} />
          </>
        )}
      </Section>

      <Section title="Action · createCompany (new user only)">
        <Input
          label="Company Name"
          value={createName}
          onChange={setCreateName}
          placeholder="PT Maju Jaya"
        />
        <div className="mt-2">
          <Input
            label="Slug (lowercase, no spaces)"
            value={createSlug}
            onChange={setCreateSlug}
            placeholder="pt-maju-jaya"
          />
        </div>
        <p className="mt-2 text-[11px] text-amber-600">
          ⚠ Hanya bisa dijalankan jika user belum punya company. Jika sukses
          akan redirect ke /dashboard.
        </p>
        <div className="mt-3">
          <ActionButton
            onClick={() =>
              run(() =>
                createCompanyAction({ name: createName, slug: createSlug }),
              )
            }
            loading={actionLoading}
            label="Create Company"
            variant="success"
          />
        </div>
      </Section>

      <Section title="Action · updateCompany">
        <Input
          label="New Company Name"
          value={updateName}
          onChange={setUpdateName}
          placeholder="PT Baru Banget"
        />
        <div className="mt-3">
          <ActionButton
            onClick={() => run(() => updateCompanyAction({ name: updateName }))}
            loading={actionLoading}
            label="Update Company"
          />
        </div>
      </Section>

      {actionResult && (
        <div className="col-span-2">
          <Section title="Last Action Result">
            <ResultBox result={actionResult} />
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE TAB
// ─────────────────────────────────────────────────────────────────────────────

function ZoneTab({ utils }: { utils: ReturnType<typeof api.useUtils> }) {
  const { data: zones, isLoading: zonesLoading } = api.zone.list.useQuery({
    includeInactive: true,
  });
  const { data: floorPlan } = api.zone.floorPlan.useQuery();
  const { data: stats } = api.zone.stats.useQuery();

  const [zoneName, setZoneName] = useState("");
  const [zoneType, setZoneType] = useState<
    "RAW_MATERIAL" | "PRODUCTION" | "FINISHED_GOODS" | "STORAGE"
  >("STORAGE");
  const [targetZoneId, setTargetZoneId] = useState("");
  const [updateName, setUpdateName] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(null);

  async function run<T>(fn: () => Promise<ActionResult<T>>) {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fn();
      setActionResult(res);
      if (res.success) {
        void utils.zone.list.invalidate();
        void utils.zone.floorPlan.invalidate();
        void utils.zone.stats.invalidate();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Section title="tRPC · zone.list (incl. inactive)">
        {zonesLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <div className="space-y-1.5">
            {zones?.map((z) => (
              <div
                key={z.id}
                className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5 text-xs"
              >
                <div>
                  <span className="font-medium">{z.name}</span>
                  <span className="ml-1.5 text-zinc-400">· {z.type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400">
                    {z._count.inventory} items
                  </span>
                  <Badge
                    label={z.isActive ? "Active" : "Inactive"}
                    color={z.isActive ? "green" : "gray"}
                  />
                </div>
              </div>
            ))}
            {!zones?.length && (
              <p className="text-xs text-zinc-400">No zones yet</p>
            )}
          </div>
        )}
      </Section>

      <Section title="tRPC · zone.stats (by type)">
        <div className="space-y-1.5">
          {stats?.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5 text-xs"
            >
              <span>{s.type}</span>
              <div className="flex items-center gap-1.5">
                <span>{s._count}</span>
                <Badge
                  label={s.isActive ? "Active" : "Inactive"}
                  color={s.isActive ? "green" : "gray"}
                />
              </div>
            </div>
          ))}
          {!stats?.length && <p className="text-xs text-zinc-400">No data</p>}
        </div>
      </Section>

      <Section title="tRPC · zone.floorPlan (with inventory)">
        <p className="mb-2 text-[11px] text-zinc-400">
          {floorPlan?.length ?? 0} active zones with inventory snapshot
        </p>
        <div className="space-y-1">
          {floorPlan?.map((z) => (
            <div key={z.id} className="rounded-md border px-2 py-1.5 text-xs">
              <span className="font-medium">{z.name}</span>
              <span className="ml-1 text-zinc-400">
                ({z.positionX.toFixed(0)}, {z.positionY.toFixed(0)}) ·{" "}
                {z.width.toFixed(0)}×{z.height.toFixed(0)}
              </span>
              {z.inventory.length > 0 && (
                <div className="mt-1 space-y-0.5 pl-2">
                  {z.inventory.map((inv) => (
                    <div
                      key={inv.itemId}
                      className="flex justify-between text-[10px] text-zinc-500"
                    >
                      <span>{inv.item.name}</span>
                      <span>
                        {inv.quantity} {inv.item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div className="space-y-4">
        <Section title="Action · createZone">
          <Input
            label="Zone Name"
            value={zoneName}
            onChange={setZoneName}
            placeholder="Gudang A"
          />
          <div className="mt-2 space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Type
            </label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as typeof zoneType)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              {["RAW_MATERIAL", "PRODUCTION", "FINISHED_GOODS", "STORAGE"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ),
              )}
            </select>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Position default: (0, 0) · 200×150
          </p>
          <div className="mt-3">
            <ActionButton
              onClick={() =>
                run(() =>
                  createZoneAction({
                    name: zoneName,
                    type: zoneType,
                    positionX: 0,
                    positionY: 0,
                    width: 200,
                    height: 150,
                  }),
                )
              }
              loading={actionLoading}
              label="Create Zone"
              variant="success"
            />
          </div>
        </Section>

        <Section title="Action · updateZone / deactivateZone / deleteZone">
          <Input
            label="Zone ID"
            value={targetZoneId}
            onChange={setTargetZoneId}
            placeholder="clxxxxxxx..."
          />
          <div className="mt-2">
            <Input
              label="New Name (optional)"
              value={updateName}
              onChange={setUpdateName}
              placeholder="Gudang B"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton
              onClick={() =>
                run(() =>
                  updateZoneAction({
                    id: targetZoneId,
                    name: updateName || undefined,
                  }),
                )
              }
              loading={actionLoading}
              label="Update"
            />
            <ActionButton
              onClick={() => run(() => deactivateZoneAction(targetZoneId))}
              loading={actionLoading}
              label="Deactivate"
              variant="danger"
            />
            <ActionButton
              onClick={() => run(() => deleteZoneAction(targetZoneId))}
              loading={actionLoading}
              label="Delete"
              variant="danger"
            />
          </div>
        </Section>

        <Section title="Action · bulkUpdateZonePositions">
          <p className="mb-2 text-[11px] text-zinc-400">
            Simulasi save setelah drag-drop. Menggunakan zones yang sudah ada
            dari query.
          </p>
          <ActionButton
            onClick={() => {
              const positions =
                zones?.slice(0, 3).map((z, i) => ({
                  id: z.id,
                  positionX: i * 250,
                  positionY: i * 50,
                  width: z.width,
                  height: z.height,
                })) ?? [];
              void run(() => bulkUpdateZonePositionsAction(positions));
            }}
            loading={actionLoading}
            label="Bulk Update Positions (first 3 zones)"
          />
        </Section>
      </div>

      {actionResult && (
        <div className="col-span-2">
          <Section title="Last Action Result">
            <ResultBox result={actionResult} />
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM TAB
// ─────────────────────────────────────────────────────────────────────────────

function ItemTab({ utils }: { utils: ReturnType<typeof api.useUtils> }) {
  const { data: items, isLoading: itemsLoading } = api.item.list.useQuery({
    page: 1,
    limit: 10,
  });

  const [itemName, setItemName] = useState("");
  const [itemSku, setItemSku] = useState("");
  const [itemUnit, setItemUnit] = useState("pcs");
  const [targetItemId, setTargetItemId] = useState("");
  const [updateItemName, setUpdateItemName] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(null);

  async function run<T>(fn: () => Promise<ActionResult<T>>) {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fn();
      setActionResult(res);
      if (res.success) {
        void utils.item.list.invalidate();
        void utils.inventory.overview.invalidate();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Section title="tRPC · item.list (page 1)">
        {itemsLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <>
            <StatusRow label="total" value={items?.total} />
            <div className="mt-2 space-y-1">
              {items?.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5 text-xs"
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-1.5 font-mono text-zinc-400">
                      {item.sku}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">{item.unit}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-zinc-500">
                      {item._count.inventory} zones
                    </span>
                  </div>
                </div>
              ))}
              {!items?.items.length && (
                <p className="text-xs text-zinc-400">No items yet</p>
              )}
            </div>
          </>
        )}
      </Section>

      <div className="space-y-4">
        <Section title="Action · createItem">
          <Input
            label="Name"
            value={itemName}
            onChange={setItemName}
            placeholder="Besi Plat 2mm"
          />
          <div className="mt-2">
            <Input
              label="SKU"
              value={itemSku}
              onChange={setItemSku}
              placeholder="BP-2MM-001"
            />
          </div>
          <div className="mt-2">
            <Input
              label="Unit"
              value={itemUnit}
              onChange={setItemUnit}
              placeholder="pcs / kg / lbr"
            />
          </div>
          <div className="mt-3">
            <ActionButton
              onClick={() =>
                run(() =>
                  createItemAction({
                    name: itemName,
                    sku: itemSku,
                    unit: itemUnit,
                  }),
                )
              }
              loading={actionLoading}
              label="Create Item"
              variant="success"
            />
          </div>
        </Section>

        <Section title="Action · updateItem / deleteItem">
          <Input
            label="Item ID"
            value={targetItemId}
            onChange={setTargetItemId}
            placeholder="clxxxxxxx..."
          />
          <div className="mt-2">
            <Input
              label="New Name (optional)"
              value={updateItemName}
              onChange={setUpdateItemName}
              placeholder="Nama baru..."
            />
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton
              onClick={() =>
                run(() =>
                  updateItemAction({
                    id: targetItemId,
                    name: updateItemName || undefined,
                  }),
                )
              }
              loading={actionLoading}
              label="Update"
            />
            <ActionButton
              onClick={() => run(() => deleteItemAction(targetItemId))}
              loading={actionLoading}
              label="Delete"
              variant="danger"
            />
          </div>
        </Section>

        <Section title="Action · bulkImportItems">
          <p className="mb-2 text-[11px] text-zinc-400">
            Import 3 dummy items sekaligus. SKU yang sudah ada akan di-skip.
          </p>
          <ActionButton
            onClick={() =>
              run(() =>
                bulkImportItemsAction([
                  {
                    name: "Baut M8",
                    sku: `BAUT-M8-${Date.now()}`,
                    unit: "pcs",
                  },
                  { name: "Mur M8", sku: `MUR-M8-${Date.now()}`, unit: "pcs" },
                  {
                    name: "Plat Besi 3mm",
                    sku: `PLAT-3MM-${Date.now()}`,
                    unit: "lbr",
                  },
                ]),
              )
            }
            loading={actionLoading}
            label="Bulk Import 3 Items"
          />
        </Section>
      </div>

      {actionResult && (
        <div className="col-span-2">
          <Section title="Last Action Result">
            <ResultBox result={actionResult} />
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY TAB
// ─────────────────────────────────────────────────────────────────────────────

function InventoryTab({ utils }: { utils: ReturnType<typeof api.useUtils> }) {
  const { data: overview, isLoading: overviewLoading } =
    api.inventory.overview.useQuery();
  const { data: zones } = api.zone.list.useQuery({ includeInactive: false });
  const { data: items } = api.item.list.useQuery({ page: 1, limit: 50 });

  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("0");

  // byZone query — hanya jalan jika ada selectedZoneId
  const { data: byZone, isLoading: byZoneLoading } =
    api.inventory.byZone.useQuery(
      { zoneId: selectedZoneId },
      { enabled: !!selectedZoneId },
    );

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(null);

  async function run<T>(fn: () => Promise<ActionResult<T>>) {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fn();
      setActionResult(res);
      if (res.success) {
        void utils.inventory.overview.invalidate();
        void utils.inventory.byZone.invalidate({ zoneId: selectedZoneId });
        void utils.zone.floorPlan.invalidate();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Section title="tRPC · inventory.overview (company-wide stock)">
        {overviewLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <div className="space-y-2">
            {overview?.items?.map((row) => (
              <div key={row.item.id} className="rounded-md border p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{row.item.name}</span>
                  <span className="font-mono text-zinc-500">
                    {row.totalQuantity} {row.item.unit}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5 pl-2">
                  {row.zones.map((z) => (
                    <div
                      key={z.zone.id}
                      className="flex justify-between text-[10px] text-zinc-400"
                    >
                      <span>{z.zone.name}</span>
                      <span>{z.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!overview?.items?.length && (
              <p className="text-xs text-zinc-400">No inventory data</p>
            )}
          </div>
        )}
      </Section>

      <div className="space-y-4">
        <Section title="tRPC · inventory.byZone (pilih zone)">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Zone
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              <option value="">— pilih zone —</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.type})
                </option>
              ))}
            </select>
          </div>
          {selectedZoneId && (
            <div className="mt-3 space-y-1">
              {byZoneLoading ? (
                <p className="text-xs text-zinc-400">Loading...</p>
              ) : (
                byZone?.map((inv) => (
                  <div
                    key={inv.itemId}
                    className="flex justify-between text-xs"
                  >
                    <span>{inv.item.name}</span>
                    <span className="font-mono text-zinc-500">
                      {inv.quantity} {inv.item.unit}
                    </span>
                  </div>
                ))
              )}
              {!byZoneLoading && !byZone?.length && (
                <p className="text-xs text-zinc-400">Empty zone</p>
              )}
            </div>
          )}
        </Section>

        <Section title="Action · upsertInventory">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Zone
            </label>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              <option value="">— pilih zone —</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Item
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              <option value="">— pilih item —</option>
              {items?.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2">
            <Input
              label="Quantity"
              value={quantity}
              onChange={setQuantity}
              type="number"
            />
          </div>
          <div className="mt-3">
            <ActionButton
              onClick={() =>
                run(() =>
                  upsertInventoryAction({
                    zoneId: selectedZoneId,
                    itemId: selectedItemId,
                    quantity: parseFloat(quantity),
                  }),
                )
              }
              loading={actionLoading}
              label="Set Inventory"
              variant="success"
            />
          </div>
        </Section>
      </div>

      {actionResult && (
        <div className="col-span-2">
          <Section title="Last Action Result">
            <ResultBox result={actionResult} />
          </Section>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY TAB
// ─────────────────────────────────────────────────────────────────────────────

const DELIVERY_STATUS_COLOR: Record<
  string,
  "green" | "yellow" | "red" | "gray" | "blue"
> = {
  PENDING: "yellow",
  APPROVED: "blue",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  REJECTED: "red",
};

function DeliveryTab({ utils }: { utils: ReturnType<typeof api.useUtils> }) {
  const { data: deliveries, isLoading: delLoading } =
    api.delivery.list.useQuery({
      page: 1,
      limit: 10,
    });
  const { data: stats } = api.delivery.stats.useQuery();
  const { data: zones } = api.zone.list.useQuery({ includeInactive: false });
  const { data: items } = api.item.list.useQuery({ page: 1, limit: 50 });

  // Form state
  const [fromZoneId, setFromZoneId] = useState("");
  const [toZoneId, setToZoneId] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [delivItemId, setDelivItemId] = useState("");
  const [delivQty, setDelivQty] = useState("1");

  // Target ID for approve/reject/start/complete/cancel
  const [targetId, setTargetId] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, unknown> | null>(null);

  async function run<T>(fn: () => Promise<ActionResult<T>>) {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fn();
      setActionResult(res);
      if (res.success) {
        void utils.delivery.list.invalidate();
        void utils.delivery.stats.invalidate();
        void utils.inventory.overview.invalidate();
        void utils.zone.floorPlan.invalidate();
        void utils.company.dashboardSummary.invalidate();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Stats */}
      <Section title="tRPC · delivery.stats">
        {stats ? (
          <>
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <StatusRow
                key={status}
                label={status}
                value={
                  <Badge
                    label={String(count)}
                    color={DELIVERY_STATUS_COLOR[status] ?? "gray"}
                  />
                }
              />
            ))}
          </>
        ) : (
          <p className="text-xs text-zinc-400">Loading...</p>
        )}
      </Section>

      {/* List */}
      <Section title="tRPC · delivery.list (page 1, limit 10)">
        {delLoading ? (
          <p className="text-xs text-zinc-400">Loading...</p>
        ) : (
          <>
            <StatusRow label="total" value={deliveries?.total} />
            <div className="mt-2 space-y-1.5">
              {deliveries?.requests.map((d) => (
                <div key={d.id} className="rounded-md border px-2 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-400">
                      {d.id.slice(0, 12)}...
                    </span>
                    <Badge
                      label={d.status}
                      color={DELIVERY_STATUS_COLOR[d.status] ?? "gray"}
                    />
                  </div>
                  <div className="mt-1 text-zinc-600">
                    {d.fromZone.name} → {d.toZone.name}
                  </div>
                  <div className="text-zinc-400">
                    {d.items.length} item(s) · by{" "}
                    {d.requestedBy.name ?? d.requestedBy.email}
                  </div>
                </div>
              ))}
              {!deliveries?.requests.length && (
                <p className="text-xs text-zinc-400">No deliveries yet</p>
              )}
            </div>
          </>
        )}
      </Section>

      {/* Create */}
      <Section title="Action · createDeliveryRequest">
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              From Zone
            </label>
            <select
              value={fromZoneId}
              onChange={(e) => setFromZoneId(e.target.value)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              <option value="">— source —</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              To Zone
            </label>
            <select
              value={toZoneId}
              onChange={(e) => setToZoneId(e.target.value)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              <option value="">— destination —</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500">
              Item
            </label>
            <select
              value={delivItemId}
              onChange={(e) => setDelivItemId(e.target.value)}
              className="w-full rounded-md border px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            >
              <option value="">— item —</option>
              {items?.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.sku})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Quantity"
            value={delivQty}
            onChange={setDelivQty}
            type="number"
          />
          <Input
            label="Notes (optional)"
            value={deliveryNote}
            onChange={setDeliveryNote}
            placeholder="Catatan..."
          />
        </div>
        <div className="mt-3">
          <ActionButton
            onClick={() =>
              run(() =>
                createDeliveryRequestAction({
                  fromZoneId,
                  toZoneId,
                  notes: deliveryNote || undefined,
                  items: [
                    { itemId: delivItemId, quantity: parseFloat(delivQty) },
                  ],
                }),
              )
            }
            loading={actionLoading}
            label="Create Delivery Request"
            variant="success"
          />
        </div>
      </Section>

      {/* Lifecycle actions */}
      <Section title="Action · lifecycle (approve / reject / start / complete / cancel)">
        <Input
          label="Delivery Request ID"
          value={targetId}
          onChange={setTargetId}
          placeholder="clxxxxxxx..."
        />
        <p className="mt-2 mb-3 text-[11px] text-zinc-400">
          Flow normal: PENDING → approve → APPROVED → start → IN_PROGRESS →
          complete → COMPLETED
        </p>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => run(() => approveDeliveryAction(targetId))}
            loading={actionLoading}
            label="✓ Approve"
            variant="success"
          />
          <ActionButton
            onClick={() => run(() => startDeliveryAction(targetId))}
            loading={actionLoading}
            label="▶ Start"
          />
          <ActionButton
            onClick={() => run(() => completeDeliveryAction(targetId))}
            loading={actionLoading}
            label="✔ Complete"
            variant="success"
          />
          <ActionButton
            onClick={() => run(() => rejectDeliveryAction(targetId))}
            loading={actionLoading}
            label="✗ Reject"
            variant="danger"
          />
          <ActionButton
            onClick={() => run(() => cancelDeliveryAction(targetId))}
            loading={actionLoading}
            label="⊘ Cancel"
            variant="danger"
          />
        </div>

        <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-[11px] text-zinc-500">
          <p className="mb-1 font-medium text-zinc-700">
            Quick fill dari list di atas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {deliveries?.requests.slice(0, 5).map((d) => (
              <button
                key={d.id}
                onClick={() => setTargetId(d.id)}
                className={`rounded border px-1.5 py-0.5 text-[10px] transition hover:bg-zinc-100 ${
                  targetId === d.id
                    ? "border-zinc-400 bg-zinc-100 font-medium"
                    : "border-zinc-200"
                }`}
              >
                {d.id.slice(0, 8)}…{" "}
                <span className="text-zinc-400">({d.status})</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {actionResult && (
        <div className="col-span-2">
          <Section title="Last Action Result">
            <ResultBox result={actionResult} />
          </Section>
        </div>
      )}
    </div>
  );
}
