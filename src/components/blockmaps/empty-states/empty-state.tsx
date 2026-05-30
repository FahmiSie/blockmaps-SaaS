import React from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   BLOCKMAPS EMPTY STATE
   Industrial, functional empty state per claude.MD Prompt 09.
   No cute illustrations. Icon + text + CTA.
   
   Usage:
     <EmptyState
       icon={Truck}
       title="No deliveries yet"
       description="Create your first delivery to start tracking shipments."
       action={{ label: "New Delivery", href: "/dashboard/deliveries/new" }}
     />
   ═══════════════════════════════════════════════════════════════ */

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${className}`}
      style={{
        maxWidth: "320px",
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      {/* Icon container */}
      <div
        className="mb-4 flex items-center justify-center rounded-md"
        style={{
          width: "48px",
          height: "48px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-base)",
        }}
      >
        <Icon
          className="h-6 w-6"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>

      {/* Title */}
      <h3
        className="mb-1.5"
        style={{
          fontSize: "16px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-tertiary)",
          lineHeight: 1.5,
          maxWidth: "280px",
        }}
      >
        {description}
      </p>

      {/* CTA */}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition-all duration-150"
              style={{
                fontSize: "13px",
                background: "var(--text-primary)",
                color: "var(--text-inverse)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition-all duration-150"
              style={{
                fontSize: "13px",
                background: "var(--text-primary)",
                color: "var(--text-inverse)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
