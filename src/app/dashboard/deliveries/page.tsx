import { auth } from "@/server/auth";
import { DeliveriesClient } from "./client";
import { api, HydrateClient } from "@/trpc/server";

export default async function DeliveriesPage() {
  const session = await auth();

  await api.delivery.list.prefetch({ page: 1, limit: 10 });

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
