"use client";

import { signOut } from "next-auth/react";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SystemBadge } from "@/components/blockmaps/badges/badges";

/* ═══════════════════════════════════════════════════════════════
   BLOCKMAPS TOPBAR
   Compact 44px topbar with breadcrumb, system status, and user menu.
   Uses design tokens per claude.MD spec.
   ═══════════════════════════════════════════════════════════════ */

interface TopbarProps {
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardTopbar({ user }: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      className="flex shrink-0 items-center justify-between px-5"
      style={{
        height: "44px",
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-base)",
      }}
    >
      {/* ── Left: breadcrumb ── */}
      <div className="flex items-center gap-2">
        <span
          className="text-label"
          style={{ fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
        >
          BlockMaps
        </span>
        <span style={{ color: "var(--border-strong)" }}>/</span>
        <span
          className="font-medium"
          style={{ fontSize: "12px", color: "var(--text-primary)" }}
        >
          Operations
        </span>
      </div>

      {/* ── Right: status + user ── */}
      <div className="flex items-center gap-1.5">
        {/* System status badge */}
        <SystemBadge status="OPERATIONAL" />

        <div
          className="mx-2"
          style={{ width: "1px", height: "16px", background: "var(--border-base)" }}
        />

        {/* Notification bell */}
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-overlay)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <Bell className="h-3.5 w-3.5" />
        </button>

        {/* User dropdown */}
        <div className="relative ml-0.5">
          <button
            type="button"
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-all duration-150"
            style={{ fontSize: "12px" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded-md font-medium"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: "10px",
                border: "1px solid var(--border-base)",
              }}
            >
              {user.name?.[0] ?? user.email?.[0] ?? "U"}
            </div>
            <span
              className="font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {user.name ?? user.email ?? "User"}
            </span>
            <ChevronDown
              className="h-3 w-3"
              style={{ color: "var(--text-tertiary)" }}
            />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md shadow-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <div
                className="px-3 py-2.5"
                style={{ borderBottom: "1px solid var(--border-base)" }}
              >
                <p
                  className="truncate font-medium"
                  style={{ fontSize: "12px", color: "var(--text-primary)" }}
                >
                  {user.email}
                </p>
                <p
                  className="text-label mt-0.5"
                  style={{ fontSize: "10px", color: "var(--text-tertiary)" }}
                >
                  {user.role}
                </p>
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 transition-all duration-150"
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.10)";
                    e.currentTarget.style.color = "var(--status-critical)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
