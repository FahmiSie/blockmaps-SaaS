import type { Metadata } from "next";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { CompanyClient } from "./client";
import { canAccessRoute, type Role } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Company — BlockMaps",
  description: "Manage your organization information and settings.",
};

export default async function CompanyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  if (!canAccessRoute(role, "/dashboard/company")) {
    redirect("/dashboard/403");
  }

  return <CompanyClient currentUser={session.user} />;
}
