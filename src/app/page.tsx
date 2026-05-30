import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { HomepageClient } from "./homepage-client";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <HomepageClient />;
}
