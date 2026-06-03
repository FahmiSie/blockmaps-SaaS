import { auth } from "@/server/auth";
import { ZonesClient } from "./client";
import { api, HydrateClient } from "@/trpc/server";

export default async function ZonesPage() {
  const session = await auth();

  await api.zone.list.prefetch({ includeInactive: false });
  await api.zone.stats.prefetch();

  return (
    <HydrateClient>
      <ZonesClient user={{ id: session?.user?.id ?? "", role: session?.user?.role ?? "OPERATOR" }} />
    </HydrateClient>
  );
}
