import { unstable_noStore as noStore } from "next/cache";
import { api, HydrateClient } from "@/trpc/server";
import { InventoryClient } from "./client";

export default async function InventoryPage() {
  noStore();

  await Promise.all([
    api.inventory.overview.prefetch(),
    api.zone.list.prefetch({ includeInactive: false }),
  ]);

  return (
    <HydrateClient>
      <InventoryClient />
    </HydrateClient>
  );
}
