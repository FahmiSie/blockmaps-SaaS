import { auth } from "@/server/auth";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <DashboardClient
      user={{
        name: session?.user?.name ?? null,
        role: session?.user?.role ?? "OPERATOR",
      }}
    />
  );
}
