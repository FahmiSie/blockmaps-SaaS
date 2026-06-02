import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import BillingClient from "./client";
import { canAccessRoute, type Role } from "@/lib/rbac";

export default async function BillingPage() {
  noStore();

  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  if (!canAccessRoute(role, "/dashboard/billing")) {
    redirect("/dashboard/403");
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="page-title">Billing & Subscription</h2>
      </div>
      <BillingClient />
    </div>
  );
}
