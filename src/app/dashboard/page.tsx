import { unstable_noStore as noStore } from "next/cache";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import { DashboardClient } from "./client";

export default async function DashboardPage() {
  noStore();

  const session = await auth();

  await Promise.all([
    api.company.dashboardSummary.prefetch(),
    api.delivery.list.prefetch({ page: 1, limit: 8 }),
    api.zone.list.prefetch({ includeInactive: false }),
  ]);

  return (
    <HydrateClient>
      <DashboardClient
        user={{
          name: session?.user?.name ?? null,
          role: session?.user?.role ?? "OPERATOR",
        }}
      />
    </HydrateClient>
  );
}
