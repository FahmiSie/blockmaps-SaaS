"use client";

import Link from "next/link";
import Image from "next/image";
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
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { type Role, ROLE_ALLOWED_ROUTES } from "@/lib/rbac";

/* ═══════════════════════════════════════════════════════════════
   BLOCKMAPS SIDEBAR — Role-filtered navigation
   ═══════════════════════════════════════════════════════════════ */

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
  badge?: number;
  section: "nav" | "workspace";
};

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/dashboard",            icon: LayoutDashboard, shortcut: "⌘D", section: "nav" },
  { label: "Zones",      href: "/dashboard/zones",      icon: Map,             shortcut: "⌘Z", section: "nav" },
  { label: "Inventory",  href: "/dashboard/inventory",  icon: Package,         shortcut: "⌘I", section: "nav" },
  { label: "Deliveries", href: "/dashboard/deliveries", icon: Truck,           shortcut: "⌘L", section: "nav" },
  { label: "Analytics",  href: "/dashboard/analytics",  icon: BarChart2,                       section: "nav" },
  { label: "Settings",   href: "/dashboard/settings",   icon: Settings,                        section: "nav" },
  { label: "Users",      href: "/dashboard/users",      icon: Users,                           section: "workspace" },
  { label: "Company",    href: "/dashboard/company",    icon: Building2,                       section: "workspace" },
];

const ROLE_BADGE: Record<Role, { label: string; color: string; bg: string }> = {
  ADMIN:    { label: "Admin",    color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  MANAGER:  { label: "Manager",  color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  OPERATOR: { label: "Operator", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

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
  const [collapsed, setCollapsed] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const isCollapsed = localStorage.getItem("blockmaps.sidebar.collapsed") === "true";
    setCollapsed(isCollapsed);
  }, []);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("blockmaps.sidebar.collapsed", String(newState));
  };

  const role = (user.role as Role) ?? "OPERATOR";
  const allowedRoutes = ROLE_ALLOWED_ROUTES[role] ?? [];
  const roleBadge = ROLE_BADGE[role] ?? ROLE_BADGE.OPERATOR;

  // Filter nav items by role
  const visibleItems = ALL_NAV_ITEMS.filter((item) =>
    allowedRoutes.some((r) => {
      if (r === "/dashboard" && item.href === "/dashboard") return true;
      return r === item.href || r.startsWith(item.href + "/");
    })
  );

  const navItems      = visibleItems.filter((i) => i.section === "nav");
  const workspaceItems = visibleItems.filter((i) => i.section === "workspace");

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className="group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-all duration-150"
        title={collapsed ? item.label : undefined}
        style={{
          background:  active ? "var(--bg-overlay)"  : "transparent",
          borderLeft:  active ? "2px solid var(--accent-prod)" : "2px solid transparent",
          color:       active ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight:  active ? 500 : 400,
          fontSize:    "13px",
          justifyContent: collapsed ? "center" : "flex-start",
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
          style={{ color: active ? "var(--accent-prod)" : "var(--text-tertiary)" }}
        />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>

            {/* Notification badge */}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className="flex h-[18px] min-w-[18px] items-center justify-center rounded px-1"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  color: "var(--status-warning)",
                  fontSize: "10px",
                  fontWeight: 600,
                }}
              >
                {item.badge}
              </span>
            )}

            {/* Keyboard shortcut */}
            {item.shortcut && (
              <span
                className="hidden group-hover:inline-flex"
                style={{
                  fontSize: "10px",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                {item.shortcut}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <aside
      className="flex h-full shrink-0 flex-col transition-all duration-250 ease-in-out"
      style={{
        width: collapsed ? "64px" : "260px",
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border-base)",
      }}
    >
      {/* ── Logo header — 56px ── */}
      <div
        className={`flex shrink-0 items-center px-5 ${collapsed ? "justify-center px-0" : "gap-2.5 justify-between"}`}
        style={{ height: "56px", borderBottom: "1px solid var(--border-base)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <rect x="0.5" y="0.5" width="5.5" height="5.5" stroke="var(--accent-raw)"  strokeWidth="1" fill="none" />
              <rect x="8"   y="0.5" width="5.5" height="5.5" stroke="var(--accent-prod)" strokeWidth="1" fill="none" />
              <rect x="0.5" y="8"   width="5.5" height="5.5" stroke="var(--accent-ship)" strokeWidth="1" fill="none" />
              <rect x="8"   y="8"   width="5.5" height="5.5" stroke="var(--border-strong)" strokeWidth="1" fill="none" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-medium tracking-tight" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                BlockMaps
              </span>
              <span className="text-label" style={{ fontSize: "9px", color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>
                Logistics OS
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation section ── */}
      <nav className={`flex-1 overflow-y-auto px-3 pt-5 pb-3 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <p className="text-label mb-2 px-2" style={{ color: "var(--text-tertiary)" }}>
            Navigation
          </p>
        )}

        <div className="space-y-0.5">
          {navItems.map((item) => <NavLink key={item.href} item={item} />)}
        </div>

        {/* Workspace section — only rendered if user has access to any workspace route */}
        {workspaceItems.length > 0 && (
          <>
            <div className={`my-4 ${collapsed ? "mx-1" : "mx-2"}`} style={{ height: "1px", background: "var(--border-base)" }} />
            {!collapsed && (
              <p className="text-label mb-2 px-2" style={{ color: "var(--text-tertiary)" }}>
                Workspace
              </p>
            )}
            <div className="space-y-0.5">
              {workspaceItems.map((item) => <NavLink key={item.href} item={item} />)}
            </div>
          </>
        )}
      </nav>

      {/* ── User profile footer ── */}
      <div className={`shrink-0 py-3 ${collapsed ? "px-2 flex flex-col gap-2 items-center" : "px-3"}`} style={{ borderTop: "1px solid var(--border-base)" }}>
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setUserMenuOpen((p) => !p)}
            className={`flex w-full items-center rounded-md transition-all duration-150 ${collapsed ? "justify-center p-1" : "gap-2.5 px-2 py-2"}`}
            style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            title={collapsed ? "User menu" : undefined}
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
              {user.image
                ? <Image src={user.image} alt="" width={28} height={28} unoptimized className="h-7 w-7 rounded-md object-cover" />
                : (user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()
              }
            </div>

            {!collapsed && (
              <>
                {/* Name & role badge */}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium" style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.3 }}>
                    {user.name ?? "Unknown"}
                  </p>
                  {/* Inline role badge */}
                  <span
                    className="inline-flex rounded px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider"
                    style={{ background: roleBadge.bg, color: roleBadge.color, lineHeight: "14px" }}
                  >
                    {roleBadge.label}
                  </span>
                </div>

                <ChevronDown
                  className="h-3 w-3 shrink-0 transition-transform"
                  style={{
                    color: "var(--text-tertiary)",
                    transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </>
            )}
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-md shadow-2xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
            >
              {/* User info header */}
              <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-base)" }}>
                <div className="mb-1.5 flex items-center gap-2">
                  <p className="truncate font-medium" style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                    {user.name ?? user.email}
                  </p>
                  {/* Role badge in dropdown */}
                  <span
                    className="flex-shrink-0 rounded px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider"
                    style={{ background: roleBadge.bg, color: roleBadge.color, lineHeight: "16px" }}
                  >
                    {roleBadge.label}
                  </span>
                </div>
                <p className="truncate text-label" style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                  {user.email}
                </p>
              </div>

              {/* Menu items */}
              <div className="p-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-all duration-150"
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 transition-all duration-150"
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.10)";
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
