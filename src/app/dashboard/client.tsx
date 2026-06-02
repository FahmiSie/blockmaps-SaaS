"use client";

import { api } from "@/trpc/react";
import {
  Users,
  Map,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Activity,
} from "lucide-react";

import { MetricCard } from "@/components/blockmaps/cards/metric-card";
import { StatusBadge, ZoneBadge, SystemBadge } from "@/components/blockmaps/badges/badges";
import { EmptyState } from "@/components/blockmaps/empty-states/empty-state";

/* ═══════════════════════════════════════════════════════════════
   BLOCKMAPS OPERATIONS DASHBOARD
   Main dashboard page per claude.MD Prompt 03 spec.
   ═══════════════════════════════════════════════════════════════ */

interface DashboardClientProps {
  user: {
    name: string | null;
    role: string;
  };
}

// ─── Pipeline Step ──────────────────────────────────────────────

function PipelineStep({
  label,
  value,
  color,
  isActive,
  isLast,
}: {
  label: string;
  value: number;
  color: string;
  isActive: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col items-center gap-1.5">
        {/* Circle */}
        <div
          className="flex items-center justify-center rounded-full transition-all"
          style={{
            width: "28px",
            height: "28px",
            background: isActive ? color : "transparent",
            border: `2px solid ${isActive ? color : "var(--border-strong)"}`,
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: isActive ? "var(--text-inverse)" : "var(--text-tertiary)",
            }}
          >
            {value}
          </span>
        </div>
        {/* Label */}
        <span
          className="text-label whitespace-nowrap"
          style={{
            fontSize: "10px",
            color: isActive ? color : "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
      </div>

      {/* Connecting line */}
      {!isLast && (
        <div
          className="mx-2"
          style={{
            width: "48px",
            height: "2px",
            marginBottom: "22px",
            background: isActive ? color : "var(--border-base)",
            borderStyle: isActive ? "solid" : "dashed",
          }}
        />
      )}
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────
export function DashboardClient({ user }: DashboardClientProps) {
  const { data: summary, isLoading: summaryLoading } =
    api.company.dashboardSummary.useQuery();
  const { data: deliveryStats, isLoading: deliveriesLoading } =
    api.delivery.stats.useQuery();
  const { data: zoneStats, isLoading: zonesLoading } =
    api.zone.stats.useQuery();

  const greeting =
    user.role === "ADMIN" || user.role === "MANAGER"
      ? "Operations Overview"
      : "Active Operations";

  return (
    <div className="flex-1 overflow-auto">
      {/* ── Page header ── */}
      <div
        className="px-8 pt-8 pb-6"
        style={{ borderBottom: "1px solid var(--border-base)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-h1"
              style={{ color: "var(--text-primary)" }}
            >
              {greeting}
            </h1>
            <p
              className="text-caption mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* System badge */}
          <SystemBadge status="OPERATIONAL" />
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="px-8 py-6 space-y-6">
        {/* ── Metric cards grid ── */}
        {summaryLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[160px] animate-pulse rounded-md"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-base)",
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Users"
              value={summary?.users ?? 0}
              icon={Users}
              iconColor="var(--text-secondary)"
            />
            <MetricCard
              label="Zones"
              value={summary?.activeZones ?? 0}
              icon={Map}
              iconColor="var(--accent-prod)"
            />
            <MetricCard
              label="Items"
              value={summary?.items ?? 0}
              icon={Package}
              iconColor="var(--accent-ship)"
            />
            <MetricCard
              label="Pending"
              value={summary?.deliveries.pending ?? 0}
              icon={Truck}
              iconColor="var(--accent-raw)"
              status={
                (summary?.deliveries.pending ?? 0) > 5
                  ? "warning"
                  : "normal"
              }
            />
          </div>
        )}

        {/* ── Pipeline state ── */}
        {!summaryLoading && summary && (
          <div
            className="rounded-md p-5"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-base)",
            }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <Activity
                className="h-4 w-4"
                style={{ color: "var(--text-tertiary)" }}
              />
              <span
                className="text-label"
                style={{ color: "var(--text-tertiary)" }}
              >
                Pipeline State
              </span>
            </div>

            <div className="flex items-start justify-center py-2">
              <PipelineStep
                label="Pending"
                value={summary.deliveries.pending}
                color="var(--status-warning)"
                isActive={summary.deliveries.pending > 0}
              />
              <PipelineStep
                label="In Progress"
                value={summary.deliveries.inProgress}
                color="var(--status-pending)"
                isActive={summary.deliveries.inProgress > 0}
              />
              <PipelineStep
                label="Completed"
                value={summary.deliveries.completed}
                color="var(--status-active)"
                isActive={summary.deliveries.completed > 0}
                isLast
              />
            </div>
          </div>
        )}

        {/* ── Main content grid: Deliveries + Zones ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent deliveries — 2/3 width */}
          <div className="lg:col-span-2">
            <div
              className="flex h-full flex-col rounded-md"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-base)",
              }}
            >
              {/* Section header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-base)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Truck
                    className="h-4 w-4"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <span
                    className="font-medium"
                    style={{ fontSize: "13px", color: "var(--text-primary)" }}
                  >
                    Recent Deliveries
                  </span>
                </div>
                <a
                  href="/dashboard/deliveries"
                  className="text-label transition-colors duration-150"
                  style={{
                    fontSize: "10px",
                    color: "var(--text-tertiary)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                >
                  VIEW ALL →
                </a>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {deliveriesLoading ? (
                  <div className="space-y-px p-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-[44px] animate-pulse rounded"
                        style={{ background: "var(--bg-overlay)" }}
                      />
                    ))}
                  </div>
                ) : !deliveryStats?.recentActivity?.length ? (
                  <EmptyState
                    icon={Truck}
                    title="No deliveries yet"
                    description="Create your first delivery to start tracking shipments between zones."
                    action={{
                      label: "+ New Delivery",
                      href: "/dashboard/deliveries",
                    }}
                  />
                ) : (
                  <div>
                    {deliveryStats.recentActivity.map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-4 px-5 transition-all duration-100"
                        style={{
                          height: "44px",
                          fontSize: "12px",
                          borderBottom: "1px solid var(--border-base)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {d.status === "COMPLETED" ? (
                            <CheckCircle2
                              className="h-4 w-4"
                              style={{ color: "var(--status-active)" }}
                            />
                          ) : d.status === "REJECTED" ? (
                            <AlertCircle
                              className="h-4 w-4"
                              style={{ color: "var(--status-critical)" }}
                            />
                          ) : (
                            <Clock
                              className="h-4 w-4"
                              style={{ color: "var(--status-warning)" }}
                            />
                          )}
                        </div>

                        {/* From → To */}
                        <div className="flex flex-1 items-center gap-2 font-mono" style={{ fontSize: "11px" }}>
                          <span
                            className="truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {d.fromZone.name}
                          </span>
                          <ArrowRight
                            className="h-3 w-3 shrink-0"
                            style={{ color: "var(--text-tertiary)" }}
                          />
                          <span
                            className="truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {d.toZone.name}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-4 shrink-0">
                          <span
                            className="w-16 text-right tabular-nums"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {d.items?.length ?? 0} item{(d.items?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                          <div className="w-28 text-right">
                            <StatusBadge status={d.status} />
                          </div>
                          <span
                            className="w-16 text-right tabular-nums"
                            style={{
                              color: "var(--text-tertiary)",
                              fontFamily: "var(--font-geist-mono), monospace",
                              fontSize: "11px",
                            }}
                          >
                            {new Date(d.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active zones — 1/3 width */}
          <div>
            <div
              className="flex h-full flex-col rounded-md"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-base)",
              }}
            >
              {/* Section header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-base)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Map
                    className="h-4 w-4"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <span
                    className="font-medium"
                    style={{ fontSize: "13px", color: "var(--text-primary)" }}
                  >
                    Active Zones
                  </span>
                </div>
                <a
                  href="/dashboard/zones"
                  className="text-label transition-colors duration-150"
                  style={{
                    fontSize: "10px",
                    color: "var(--text-tertiary)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                >
                  MAP →
                </a>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {zonesLoading ? (
                  <div className="space-y-px p-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-[52px] animate-pulse rounded"
                        style={{ background: "var(--bg-overlay)" }}
                      />
                    ))}
                  </div>
                ) : !zoneStats?.length ? (
                  <EmptyState
                    icon={Map}
                    title="No zones mapped"
                    description="Define facility areas to start tracking inventory."
                    action={{
                      label: "+ Create First Zone",
                      href: "/dashboard/zones",
                    }}
                  />
                ) : (
                  <div>
                    {zoneStats.map((z: any, idx: number) => (
                      <div
                        key={`${z.type}-${idx}`}
                        className="flex items-center justify-between px-5 transition-all duration-100"
                        style={{
                          height: "52px",
                          fontSize: "12px",
                          borderBottom: "1px solid var(--border-base)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div className="flex flex-col gap-1">
                          <span
                            className="font-medium"
                            style={{ color: "var(--text-primary)", fontSize: "13px" }}
                          >
                            {z.type.replace("_", " ")}
                          </span>
                          <ZoneBadge type={z.type} />
                        </div>
                        <div className="text-right">
                          <p
                            className="font-medium tabular-nums"
                            style={{
                              fontSize: "14px",
                              color: "var(--text-primary)",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {z._count ?? 0}
                          </p>
                          <p
                            className="text-label"
                            style={{
                              fontSize: "9px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            Zones
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
