import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardTopbar } from "@/components/layout/topbar";

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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Fixed left sidebar */}
      <DashboardSidebar user={session.user} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar user={session.user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
