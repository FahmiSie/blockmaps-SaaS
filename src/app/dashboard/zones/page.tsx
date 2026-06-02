import { ZonesClient } from "./client";
import { api, HydrateClient } from "@/trpc/server";

export default async function ZonesPage() {
  await api.zone.list.prefetch({ includeInactive: false });
  await api.zone.stats.prefetch();

  return (
    <HydrateClient>
      <ZonesClient />
    </HydrateClient>
  );
}
