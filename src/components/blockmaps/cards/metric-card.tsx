import React from "react";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";



interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  change?: {
    value: number;
    percent: number;
    direction: "up" | "down" | "neutral";
    period: string;
  };
  sparkline?: number[];
  status?: "normal" | "warning" | "critical";
  onClick?: () => void;
  className?: string;
}

// ─── Sparkline SVG ────────────────────────────────────────────

function Sparkline({
  data,
  color = "var(--accent-prod)",
}: {
  data: number[];
  color?: string;
}) {
  if (!data.length) return null;

  const width = 120;
  const height = 32;
  const padding = 2;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Fill path: line path + close to bottom-right → bottom-left
  const fillPath = `${linePath} L ${(width - padding).toFixed(1)} ${height} L ${padding} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`spark-fill-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={fillPath}
        fill={`url(#spark-fill-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Flat Sparkline (no data) ─────────────────────────────────

function FlatSparkline() {
  return (
    <svg width="120" height="32" viewBox="0 0 120 32" className="w-full" style={{ display: "block" }}>
      <line
        x1="2" y1="16" x2="118" y2="16"
        stroke="var(--text-tertiary)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.4"
      />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = "var(--text-tertiary)",
  change,
  sparkline,
  status = "normal",
  onClick,
  className = "",
}: MetricCardProps) {
  const statusBorder = {
    normal: "transparent",
    warning: "var(--status-warning)",
    critical: "var(--status-critical)",
  };

  const statusBg = {
    normal: "transparent",
    warning: "rgba(245, 158, 11, 0.04)",
    critical: "rgba(239, 68, 68, 0.04)",
  };

  const trendColor = {
    up: "var(--status-active)",
    down: "var(--status-critical)",
    neutral: "var(--text-secondary)",
  };

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  };

  return (
    <div
      className={`group flex flex-col justify-between rounded-md p-4 transition-all duration-150 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background: status !== "normal" ? statusBg[status] : "var(--bg-surface)",
        border: `1px solid var(--border-base)`,
        borderLeft: status !== "normal" ? `3px solid ${statusBorder[status]}` : undefined,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-base)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Header: label + icon */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-label" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
        <Icon
          className="h-5 w-5 transition-colors"
          style={{ color: iconColor }}
        />
      </div>

      {/* Value */}
      <div className="mb-1">
        <span
          className="tabular-nums"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      </div>

      {/* Change indicator */}
      {change && (
        <div
          className="mb-3 flex items-center gap-1"
          style={{ fontSize: "12px" }}
        >
          {(() => {
            const TIcon = TrendIcon[change.direction];
            return (
              <>
                <TIcon
                  className="h-3 w-3"
                  style={{ color: trendColor[change.direction] }}
                />
                <span style={{ color: trendColor[change.direction] }}>
                  {change.direction === "down" ? "" : "+"}
                  {change.value}
                </span>
                <span style={{ color: trendColor[change.direction] }}>
                  {change.percent > 0 ? "+" : ""}
                  {change.percent}%
                </span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: "4px" }}>
                  {change.period}
                </span>
              </>
            );
          })()}
        </div>
      )}

      {/* Sparkline */}
      <div className="mt-auto">
        {sparkline && sparkline.length > 1 ? (
          <Sparkline data={sparkline} color={iconColor} />
        ) : (
          <FlatSparkline />
        )}
      </div>
    </div>
  );
}

export default MetricCard;
