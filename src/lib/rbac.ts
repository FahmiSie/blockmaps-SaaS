/**
 * BlockMaps RBAC — single source of truth for role-based access control.
 *
 * All route guards and UI visibility checks must reference this file.
 */

export type Role = "ADMIN" | "MANAGER" | "OPERATOR";

/** Routes each role is allowed to access (exact or prefix match) */
export const ROLE_ALLOWED_ROUTES: Record<Role, string[]> = {
  ADMIN: [
    "/dashboard",
    "/dashboard/zones",
    "/dashboard/inventory",
    "/dashboard/deliveries",
    "/dashboard/analytics",
    "/dashboard/settings",
    "/dashboard/users",
    "/dashboard/company",
    "/dashboard/billing",
  ],
  MANAGER: [
    "/dashboard",
    "/dashboard/zones",
    "/dashboard/inventory",
    "/dashboard/deliveries",
    "/dashboard/analytics",
    "/dashboard/settings",
    "/dashboard/users",
    "/dashboard/company",
    "/dashboard/billing",
  ],
  OPERATOR: [
    "/dashboard",
    "/dashboard/zones",
    "/dashboard/inventory",
    "/dashboard/deliveries",
    "/dashboard/analytics",
    "/dashboard/settings",
  ],
};

/** Action-level permissions */
export const ROLE_PERMISSIONS = {
  ADMIN: {
    canInviteUsers: true,
    canRemoveUsers: true,
    canChangeRoles: true,
    canEditCompany: true,
    canTransferOwnership: true,
    canDeleteCompany: true,
    canViewUsers: true,
    canViewCompany: true,
  },
  MANAGER: {
    canInviteUsers: true,
    canRemoveUsers: false,
    canChangeRoles: false,
    canEditCompany: false,
    canTransferOwnership: false,
    canDeleteCompany: false,
    canViewUsers: true,
    canViewCompany: true,
  },
  OPERATOR: {
    canInviteUsers: false,
    canRemoveUsers: false,
    canChangeRoles: false,
    canEditCompany: false,
    canTransferOwnership: false,
    canDeleteCompany: false,
    canViewUsers: false,
    canViewCompany: false,
  },
} satisfies Record<Role, Record<string, boolean>>;

export type Permission = keyof (typeof ROLE_PERMISSIONS)["ADMIN"];

/** Check if a role can access a specific route */
export function canAccessRoute(role: Role, pathname: string): boolean {
  const allowed = ROLE_ALLOWED_ROUTES[role] ?? [];

  // Always allow /dashboard/403 to avoid redirect loops
  if (pathname === "/dashboard/403") return true;

  return allowed.some((route) => {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname === route || pathname.startsWith(route + "/");
  });
}

/** Check if a role has a specific action-level permission */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
