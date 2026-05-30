import { unstable_noStore as noStore } from "next/cache";
import { api, HydrateClient } from "@/trpc/server";
import { ZonesClient } from "./client";

export default async function ZonesPage() {
  noStore();

  await Promise.all([
    api.zone.list.prefetch({ includeInactive: true }),
    api.zone.stats.prefetch(),
  ]);

  return (
    <HydrateClient>
      <ZonesClient />
    </HydrateClient>
  );
}
