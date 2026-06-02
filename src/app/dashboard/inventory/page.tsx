import { InventoryClient } from "./client";
import { api, HydrateClient } from "@/trpc/server";

export default async function InventoryPage() {
  await api.inventory.overview.prefetch({ page: 1, limit: 10 });
  await api.inventory.stockOverview.prefetch({ page: 1, limit: 10 });

  return (
    <HydrateClient>
      <InventoryClient />
    </HydrateClient>
  );
}
