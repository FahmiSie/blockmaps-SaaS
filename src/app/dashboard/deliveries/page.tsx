import { unstable_noStore as noStore } from "next/cache";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import { DeliveriesClient } from "./client";

export default async function DeliveriesPage() {
  noStore();
  const session = await auth();

  await Promise.all([
    api.delivery.list.prefetch({ page: 1, limit: 50 }),
    api.delivery.stats.prefetch(),
  ]);

  return (
    <HydrateClient>
      <DeliveriesClient
        user={{
          id: session?.user?.id ?? "",
          role: session?.user?.role ?? "OPERATOR",
        }}
      />
    </HydrateClient>
  );
}
