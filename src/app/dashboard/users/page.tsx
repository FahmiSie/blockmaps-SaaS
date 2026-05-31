import type { Metadata } from "next";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./client";
import { canAccessRoute, type Role } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Users — BlockMaps",
  description: "Manage team members and access permissions.",
};

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  if (!canAccessRoute(role, "/dashboard/users")) {
    redirect("/dashboard/403");
  }

  return <UsersClient currentUser={session.user} />;
}
