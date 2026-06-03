import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import InvoiceClient from "./client";
import { canAccessRoute, type Role } from "@/lib/rbac";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  noStore();
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  if (!canAccessRoute(role, "/dashboard/billing")) {
    redirect("/dashboard/403");
  }

  return (
    <div className="flex-1 bg-white min-h-screen">
      <InvoiceClient transactionId={id} />
    </div>
  );
}
