import { unstable_noStore as noStore } from "next/cache";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import FlowGridTestClient from "./client";

export default async function FlowGridTestPage() {
  noStore();

  const session = await auth();

  // ── Prefetch semua tRPC queries ──────────────────────────────────────
  // Prefetch ini akan di-hydrate ke client, sehingga tidak loading ulang
  void api.user.me.prefetch();
  void api.user.stats.prefetch();
  void api.company.getCurrent.prefetch();
  void api.company.dashboardSummary.prefetch();
  void api.zone.list.prefetch({ includeInactive: false });
  void api.zone.floorPlan.prefetch();
  void api.zone.stats.prefetch();
  void api.item.list.prefetch({ page: 1, limit: 10 });
  void api.inventory.overview.prefetch();
  void api.delivery.list.prefetch({ page: 1, limit: 10 });
  void api.delivery.stats.prefetch();

  return (
    <HydrateClient>
      <FlowGridTestClient sessionUser={session?.user ?? null} />
    </HydrateClient>
  );
}