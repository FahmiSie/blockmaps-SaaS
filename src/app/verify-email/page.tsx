/* eslint-disable @typescript-eslint/prefer-optional-chain */
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) redirect("/login");

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });

  if (!user || !user.verifyTokenExp || user.verifyTokenExp < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Invalid link
          </h1>
          <p className="text-sm text-neutral-500">
            The verification link has expired or is invalid.
          </p>
          <Link
            href="/login"
            className="text-primary-400 hover:text-primary-300 mt-2 inline-block text-sm font-semibold"
          >
            Back to Login
          </Link>
        </div>
      </main>
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verifyToken: null,
      verifyTokenExp: null,
    },
  });

  redirect("/login?verified=1");
}
