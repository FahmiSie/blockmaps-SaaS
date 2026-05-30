"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Map,
  Package,
  Truck,
  BarChart2,
  Settings,
  Users,
  Building2,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   BLOCKMAPS SIDEBAR
   240px fixed sidebar per claude.MD Prompt 02 spec.

   Sections: NAVIGATION + WORKSPACE
   Active: full-row bg-overlay + border-l-2 accent-prod
   ═══════════════════════════════════════════════════════════════ */

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
  badge?: number;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",            icon: LayoutDashboard, shortcut: "⌘D" },
  { label: "Zones",      href: "/dashboard/zones",      icon: Map,             shortcut: "⌘Z" },
  { label: "Inventory",  href: "/dashboard/inventory",  icon: Package,         shortcut: "⌘I" },
  { label: "Deliveries", href: "/dashboard/deliveries", icon: Truck,           shortcut: "⌘L", badge: 0 },
  { label: "Analytics",  href: "/dashboard/analytics",  icon: BarChart2 },
  { label: "Settings",   href: "/dashboard/settings",   icon: Settings },
];

const WORKSPACE_ITEMS = [
  { label: "Users",   href: "/dashboard/users",   icon: Users },
  { label: "Company", href: "/dashboard/company",  icon: Building2 },
] as const;

interface SidebarProps {
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <aside
      className="flex h-full shrink-0 flex-col"
      style={{
        width: "240px",
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border-base)",
      }}
    >
      {/* ── Logo header — 56px ── */}
      <div
        className="flex shrink-0 items-center gap-2.5 px-5"
        style={{
          height: "56px",
          borderBottom: "1px solid var(--border-base)",
        }}
      >
        {/* BlockMaps 4-grid icon */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <rect x="0.5" y="0.5" width="5.5" height="5.5" stroke="var(--accent-raw)" strokeWidth="1" fill="none" />
            <rect x="8" y="0.5" width="5.5" height="5.5" stroke="var(--accent-prod)" strokeWidth="1" fill="none" />
            <rect x="0.5" y="8" width="5.5" height="5.5" stroke="var(--accent-ship)" strokeWidth="1" fill="none" />
            <rect x="8" y="8" width="5.5" height="5.5" stroke="var(--border-strong)" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="font-medium tracking-tight"
            style={{ fontSize: "14px", color: "var(--text-primary)" }}
          >
            BlockMaps
          </span>
          <span
            className="text-label"
            style={{ fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
          >
            Logistics OS
          </span>
        </div>
      </div>

      {/* ── Navigation section ── */}
      <nav className="flex-1 overflow-y-auto px-3 pt-5 pb-3">
        {/* Section label */}
        <p
          className="text-label mb-2 px-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Navigation
        </p>

        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon, shortcut, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-all duration-150"
                style={{
                  background: active ? "var(--bg-overlay)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent-prod)" : "2px solid transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: active ? 500 : 400,
                  fontSize: "13px",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "var(--bg-overlay)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon
                  className="h-4 w-4 shrink-0 transition-colors"
                  style={{
                    color: active ? "var(--accent-prod)" : "var(--text-tertiary)",
                  }}
                />
                <span className="flex-1">{label}</span>

                {/* Notification badge */}
                {badge !== undefined && badge > 0 && (
                  <span
                    className="flex h-[18px] min-w-[18px] items-center justify-center rounded px-1"
                    style={{
                      background: "rgba(245, 158, 11, 0.12)",
                      color: "var(--status-warning)",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {badge}
                  </span>
                )}

                {/* Keyboard shortcut — visible on hover */}
                {shortcut && (
                  <span
                    className="hidden group-hover:inline-flex"
                    style={{
                      fontSize: "10px",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {shortcut}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div
          className="my-4 mx-2"
          style={{ height: "1px", background: "var(--border-base)" }}
        />

        {/* Workspace section */}
        <p
          className="text-label mb-2 px-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Workspace
        </p>

        <div className="space-y-0.5">
          {WORKSPACE_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-all duration-150"
                style={{
                  background: active ? "var(--bg-overlay)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent-prod)" : "2px solid transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: active ? 500 : 400,
                  fontSize: "13px",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "var(--bg-overlay)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon
                  className="h-4 w-4 shrink-0 transition-colors"
                  style={{
                    color: active ? "var(--accent-prod)" : "var(--text-tertiary)",
                  }}
                />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── User profile footer ── */}
      <div
        className="shrink-0 px-3 py-3"
        style={{ borderTop: "1px solid var(--border-base)" }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((p) => !p)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 transition-all duration-150"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {/* Avatar */}
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-medium"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: "11px",
                border: "1px solid var(--border-base)",
              }}
            >
              {user.name?.[0] ?? user.email?.[0] ?? "U"}
            </div>

            {/* Name & role */}
            <div className="min-w-0 flex-1 text-left">
              <p
                className="truncate font-medium"
                style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.3 }}
              >
                {user.name ?? "Unknown"}
              </p>
              <p
                className="text-label truncate"
                style={{ fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.06em" }}
              >
                {user.role}
              </p>
            </div>

            <ChevronDown
              className="h-3 w-3 shrink-0 transition-transform"
              style={{
                color: "var(--text-tertiary)",
                transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-md shadow-2xl"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
              }}
            >
              {/* User info */}
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

              {/* Sign out */}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 transition-all duration-150"
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
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
    </aside>
  );
}
