import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { DashboardLayoutClient } from "@/components/layout/dashboard-layout-client";

export const metadata: Metadata = {
  title: "Dashboard — BlockMaps",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.companyId) redirect("/onboarding");

  return (
    <DashboardLayoutClient user={session.user as any}>
      {children}
    </DashboardLayoutClient>
  );
}
