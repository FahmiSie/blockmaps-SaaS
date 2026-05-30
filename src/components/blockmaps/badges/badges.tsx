import React from "react";

/* ═══════════════════════════════════════════════════════════════
   BLOCKMAPS BADGE SYSTEM
   Standardized badge components per claude.MD design system.
   
   Usage:
     <ZoneBadge type="RAW_MATERIAL" />
     <StatusBadge status="IN_PROGRESS" />
     <SystemBadge status="OPERATIONAL" />
   ═══════════════════════════════════════════════════════════════ */

// ─── Zone Type Badge ──────────────────────────────────────────

const ZONE_CONFIG = {
  RAW_MATERIAL:   { bg: "rgba(217,119,6,0.12)",  text: "#d97706",  label: "RAW MAT" },
  PRODUCTION:     { bg: "rgba(8,145,178,0.12)",   text: "#0891b2",  label: "PROD" },
  COLD_STORAGE:   { bg: "rgba(124,58,237,0.12)",  text: "#7c3aed",  label: "COLD" },
  SHIPPING:       { bg: "rgba(5,150,105,0.12)",   text: "#059669",  label: "SHIP" },
  QA:             { bg: "rgba(220,38,38,0.12)",   text: "#dc2626",  label: "QA" },
  FINISHED_GOODS: { bg: "rgba(5,150,105,0.12)",   text: "#059669",  label: "FINISH" },
  STORAGE:        { bg: "rgba(107,114,128,0.12)", text: "#6b7280",  label: "STOR" },
} as const;

export type ZoneType = keyof typeof ZONE_CONFIG;

interface ZoneBadgeProps {
  type: string;
  className?: string;
}

export function ZoneBadge({ type, className = "" }: ZoneBadgeProps) {
  const config = ZONE_CONFIG[type as ZoneType] ?? ZONE_CONFIG.STORAGE;

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-label ${className}`}
      style={{
        background: config.bg,
        color: config.text,
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: "20px",
        height: "20px",
      }}
    >
      {config.label}
    </span>
  );
}

// ─── Delivery Status Badge ────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:     { bg: "rgba(245,158,11,0.10)",  text: "#f59e0b",  label: "PENDING",     dot: false },
  APPROVED:    { bg: "rgba(8,145,178,0.10)",   text: "#0891b2",  label: "APPROVED",    dot: false },
  IN_PROGRESS: { bg: "rgba(59,130,246,0.10)",  text: "#3b82f6",  label: "IN PROGRESS", dot: true },
  COMPLETED:   { bg: "rgba(34,197,94,0.10)",   text: "#22c55e",  label: "COMPLETED",   dot: false },
  REJECTED:    { bg: "rgba(239,68,68,0.10)",   text: "#ef4444",  label: "REJECTED",    dot: false },
  CANCELLED:   { bg: "rgba(107,114,128,0.10)", text: "#6b7280",  label: "CANCELLED",   dot: false },
  FAILED:      { bg: "rgba(239,68,68,0.10)",   text: "#ef4444",  label: "FAILED",      dot: false },
} as const;

export type DeliveryStatus = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as DeliveryStatus] ?? STATUS_CONFIG.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 ${className}`}
      style={{
        background: config.bg,
        color: config.text,
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: "20px",
        height: "20px",
      }}
    >
      {/* Status dot */}
      <span
        className={config.dot ? "status-pulse" : ""}
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: config.text,
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}

// ─── System Status Badge ──────────────────────────────────────

const SYSTEM_CONFIG = {
  OPERATIONAL: { bg: "rgba(34,197,94,0.10)",   text: "#22c55e",  label: "OPERATIONAL" },
  DEGRADED:    { bg: "rgba(245,158,11,0.10)",  text: "#f59e0b",  label: "DEGRADED" },
  OUTAGE:      { bg: "rgba(239,68,68,0.10)",   text: "#ef4444",  label: "OUTAGE" },
} as const;

export type SystemStatus = keyof typeof SYSTEM_CONFIG;

interface SystemBadgeProps {
  status?: string;
  className?: string;
}

export function SystemBadge({ status = "OPERATIONAL", className = "" }: SystemBadgeProps) {
  const config = SYSTEM_CONFIG[status as SystemStatus] ?? SYSTEM_CONFIG.OPERATIONAL;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 ${className}`}
      style={{
        background: config.bg,
        color: config.text,
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: "20px",
        height: "20px",
      }}
    >
      {/* Pulsing dot */}
      <span className="relative flex" style={{ width: "6px", height: "6px" }}>
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full"
          style={{ backgroundColor: config.text, opacity: 0.4 }}
        />
        <span
          className="relative inline-flex rounded-full"
          style={{ width: "6px", height: "6px", backgroundColor: config.text }}
        />
      </span>
      {config.label}
    </span>
  );
}
