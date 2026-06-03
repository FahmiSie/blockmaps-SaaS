"use client";

import { api } from "@/trpc/react";
import {
  RefreshCw, TrendingUp, TrendingDown, Minus,
  Truck, Map, Package, Users, CheckCircle2, Clock, Activity,
} from "lucide-react";
import { StatusBadge, ZoneBadge } from "@/components/blockmaps/badges/badges";

/* ─── Helpers ──────────────────────────────────────────────── */
function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString();
}

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/* ─── Sub-components ───────────────────────────────────────── */

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="h-3 w-0.5 rounded-full" style={{ background: "var(--logistics-cyan)" }} />
      <div>
        <h2 className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{sub}</p>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, iconColor, trend, trendLabel,
}: {
  label: string; value: string | number; icon: React.ElementType;
  iconColor: string; trend?: "up" | "down" | "flat"; trendLabel?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "var(--status-active)" : trend === "down" ? "var(--status-critical)" : "var(--text-tertiary)";
  return (
    <div
      className="flex flex-col justify-between rounded-md p-4 transition-all duration-150 hover:-translate-y-px"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{label}</span>
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </div>
      <div className="mb-2">
        <span className="tabular-nums" style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1" style={{ fontSize: "11px" }}>
          <TrendIcon className="h-3 w-3" style={{ color: trendColor }} />
          <span style={{ color: trendColor }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, colors }: { data: { label: string; value: number; color: string }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>No data yet</p>
    </div>
  );

  let offset = 0;
  const r = 56, cx = 70, cy = 70, strokeWidth = 14;
  const circumference = 2 * Math.PI * r;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const seg = { color: colors[i] ?? d.color, pct, dash: pct * circumference, offset: offset * circumference };
    offset += pct;
    return { ...d, ...seg };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-base)" strokeWidth={strokeWidth} />
        {segments.map((seg, i) => (
          <circle
            key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dash} ${circumference}`}
            strokeDashoffset={-seg.offset + circumference / 4}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">{fmt(total)}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-tertiary)" fontSize="9" letterSpacing="1">TOTAL</text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: seg.color }} />
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{seg.label}</span>
            <span className="ml-auto pl-4 tabular-nums text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex h-36 gap-1 sm:gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 min-w-0 flex-col items-center">
          <div className="flex w-full flex-1 flex-col items-center justify-end pb-2">
            <span className="mb-1 text-center text-[10px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
              {d.value}
            </span>
            <div
              className="w-full max-w-[28px] rounded-sm transition-all duration-500"
              style={{
                height: `${(d.value / max) * 100}%`,
                background: d.color,
                minHeight: d.value > 0 ? "4px" : "1px",
              }}
            />
          </div>
          <span
            className="w-full truncate text-center text-[9px] uppercase tracking-wide"
            style={{ color: "var(--text-tertiary)" }}
            title={d.label}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export function AnalyticsClient() {
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = api.company.dashboardSummary.useQuery();
  const { data: deliveryStats, isLoading: deliveryLoading, refetch: refetchDelivery } = api.delivery.stats.useQuery();
  const { data: zoneStats, isLoading: zoneLoading, refetch: refetchZone } = api.zone.stats.useQuery();
  const { data: userStats, isLoading: userLoading, refetch: refetchUser } = api.user.stats.useQuery();

  const isLoading = summaryLoading || deliveryLoading || zoneLoading || userLoading;

  const totalDeliveries = Object.values(summary?.deliveries ?? {}).reduce((s, v) => s + v, 0);
  const zoneByType = zoneStats ?? [];
  const activeZones = zoneByType.filter((z: any) => z.isActive).reduce((s: number, z: any) => s + z._count, 0);

  const deliveryDonut = [
    { label: "Pending", value: summary?.deliveries.pending ?? 0, color: "#f59e0b" },
    { label: "Approved", value: summary?.deliveries.approved ?? 0, color: "#0891b2" },
    { label: "In Progress", value: summary?.deliveries.inProgress ?? 0, color: "#3b82f6" },
    { label: "Completed", value: summary?.deliveries.completed ?? 0, color: "#22c55e" },
    { label: "Rejected", value: summary?.deliveries.rejected ?? 0, color: "#ef4444" },
  ];

  const zoneDonut = [
    ...zoneByType.map((z: any) => ({
      label: z.type.replace(/_/g, " "),
      value: z._count,
      color: z.type === "RAW_MATERIAL" ? "#d97706" : z.type === "PRODUCTION" ? "#0891b2" : z.type === "FINISHED_GOODS" ? "#059669" : "#6b7280",
    })),
  ];

  const userByRole = userStats?.byRole ?? [];
  const userDonut = [
    { label: "Admin", value: (userByRole.find((r: any) => r.role === "ADMIN")?._count ?? 0), color: "#0891b2" },
    { label: "Manager", value: (userByRole.find((r: any) => r.role === "MANAGER")?._count ?? 0), color: "#f59e0b" },
    { label: "Operator", value: (userByRole.find((r: any) => r.role === "OPERATOR")?._count ?? 0), color: "#6b7280" },
  ];

  const deliveryBar = [
    { label: "PENDING", value: summary?.deliveries.pending ?? 0, color: "#f59e0b" },
    { label: "APPROVED", value: summary?.deliveries.approved ?? 0, color: "#0891b2" },
    { label: "PROG", value: summary?.deliveries.inProgress ?? 0, color: "#3b82f6" },
    { label: "DONE", value: summary?.deliveries.completed ?? 0, color: "#22c55e" },
    { label: "REJECTED", value: summary?.deliveries.rejected ?? 0, color: "#ef4444" },
  ];

  const LoadingSkeleton = ({ h = "160px" }) => (
    <div className="animate-pulse rounded-md" style={{ height: h, background: "var(--bg-surface)", border: "1px solid var(--border-base)" }} />
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b px-8 py-4"
        style={{ background: "var(--bg-base)", borderColor: "var(--border-base)" }}>
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Analytics</h1>
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Monitor warehouse performance and operational efficiency</p>
        </div>
        <button
          onClick={() => {
            void refetchSummary();
            void refetchDelivery();
            void refetchZone();
            void refetchUser();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-all hover:bg-accent/50 disabled:opacity-50"
          style={{ borderColor: "var(--border-base)", color: "var(--text-secondary)" }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 space-y-8 px-8 py-6">
        {/* ── KPI Row ── */}
        <section>
          <SectionHeader title="Overview" sub="Aggregated operational metrics" />
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => <LoadingSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Total Deliveries" value={totalDeliveries} icon={Truck} iconColor="var(--accent-raw)" />
              <KpiCard label="Active Zones" value={activeZones} icon={Map} iconColor="var(--accent-prod)" />
              <KpiCard label="Inventory Items" value={summary?.items ?? 0} icon={Package} iconColor="var(--accent-ship)" />
              <KpiCard label="Team Members" value={userStats?.total ?? 0} icon={Users} iconColor="var(--text-secondary)" />
              <KpiCard label="Completed" value={summary?.deliveries.completed ?? 0} icon={CheckCircle2} iconColor="var(--status-active)" />
              <KpiCard label="Pending Review" value={summary?.deliveries.pending ?? 0} icon={Clock} iconColor="var(--status-warning)" trend={(summary?.deliveries.pending ?? 0) > 5 ? "up" : "flat"} trendLabel={(summary?.deliveries.pending ?? 0) > 5 ? "High queue" : "Normal"} />
            </div>
          )}
        </section>

        {/* ── Charts Grid ── */}
        <section>
          <SectionHeader title="Distribution Charts" sub="Breakdown by status, type, and role" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {/* Delivery Status */}
            <div className="rounded-md p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Delivery Status</p>
              {deliveryLoading ? <LoadingSkeleton h="160px" /> : <DonutChart data={deliveryDonut} colors={deliveryDonut.map(d => d.color)} />}
            </div>

            {/* Delivery Bar */}
            <div className="rounded-md p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Delivery Pipeline</p>
              {deliveryLoading ? <LoadingSkeleton h="160px" /> : <BarChart data={deliveryBar} />}
            </div>

            {/* Zone Distribution */}
            <div className="rounded-md p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Zone Types</p>
              {zoneLoading ? <LoadingSkeleton h="160px" /> : (
                zoneDonut.length > 0 ? <DonutChart data={zoneDonut} colors={zoneDonut.map(d => d.color)} /> :
                  <div className="flex h-40 items-center justify-center"><p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>No zones yet</p></div>
              )}
            </div>

            {/* User Role Distribution */}
            <div className="rounded-md p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Team by Role</p>
              {userLoading ? <LoadingSkeleton h="160px" /> : <DonutChart data={userDonut} colors={userDonut.map(d => d.color)} />}
            </div>
          </div>
        </section>

        {/* ── Zone Status Summary ── */}
        <section>
          <SectionHeader title="Zone Status" sub="Active vs inactive facility areas" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {zoneLoading ? (
              [...Array(4)].map((_, i) => <LoadingSkeleton key={i} h="80px" />)
            ) : zoneByType.map((z: any) => (
              <div key={`${z.type}-${z.isActive}`} className="rounded-md p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
                <div className="mb-2 flex items-center justify-between">
                  <ZoneBadge type={z.type} />
                  <span className={`h-1.5 w-1.5 rounded-full ${z.isActive ? "bg-green-500" : "bg-gray-600"}`} />
                </div>
                <p className="text-[22px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{z._count}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>{z.isActive ? "Active" : "Inactive"}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Activity ── */}
        <section>
          <SectionHeader title="Recent Activity" sub="Latest delivery events" />
          <div className="rounded-md overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}>
            {deliveryLoading ? (
              <div className="p-6"><LoadingSkeleton h="200px" /></div>
            ) : !deliveryStats?.recentActivity?.length ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Activity className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>No operational data available yet</p>
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Create your first delivery to see activity here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-5 border-b px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)", borderColor: "var(--border-base)" }}>
                    <span>Delivery</span><span>From</span><span>To</span><span>Status</span><span className="text-right">Time</span>
                  </div>
                  {deliveryStats.recentActivity.map((d: any) => (
                    <div key={d.id} className="grid grid-cols-5 items-center border-b px-5 transition-colors"
                      style={{ height: "48px", borderColor: "var(--border-base)", fontSize: "12px" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-overlay)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <span className="font-mono text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>#{d.id.slice(-6).toUpperCase()}</span>
                      <span className="truncate" style={{ color: "var(--text-primary)" }}>{d.fromZone?.name ?? "—"}</span>
                      <span className="truncate" style={{ color: "var(--text-primary)" }}>{d.toZone?.name ?? "—"}</span>
                      <StatusBadge status={d.status} />
                      <span className="text-right tabular-nums" style={{ color: "var(--text-tertiary)" }}>{timeAgo(d.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
