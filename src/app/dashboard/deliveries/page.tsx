import { auth } from "@/server/auth";
import { DeliveriesClient } from "./client";

export default async function DeliveriesPage() {
  const session = await auth();

  return (
    <DeliveriesClient
      user={{
        id: session?.user?.id ?? "",
        role: session?.user?.role ?? "OPERATOR",
      }}
    />
  );
}
