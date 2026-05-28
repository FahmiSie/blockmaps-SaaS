"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── SCHEMAS ────────────────────────────────────────────────

const CreateCompanySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
});

const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

// ── CREATE COMPANY ─────────────────────────────────────────

export async function createCompanyAction(
  formData: z.infer<typeof CreateCompanySchema>,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized." };

  const parsed = CreateCompanySchema.safeParse(formData);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const msg = Object.values(errors).flat().join(", ");
    return { success: false, error: msg };
  }

  const { name, slug } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (user?.companyId) {
      return { success: false, error: "You already belong to a company." };
    }

    const existing = await prisma.company.findUnique({ where: { slug } });
    if (existing) {
      return { success: false, error: "This slug is already taken. Please choose another." };
    }

    const company = await prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: { name, slug },
        select: { id: true, slug: true },
      });
      await tx.user.update({
        where: { id: session.user.id },
        data: { companyId: c.id, role: "ADMIN" },
      });
      return c;
    });

    revalidatePath("/dashboard");
    redirect(`/dashboard`);

    return { success: true, data: company };
  } catch (err) {
    if ((err as Error).message === "NEXT_REDIRECT") throw err;
    console.error("[createCompanyAction]", err);
    return { success: false, error: "Failed to create company. Please try again." };
  }
}

// ── UPDATE COMPANY ─────────────────────────────────────────

export async function updateCompanyAction(
  formData: z.infer<typeof UpdateCompanySchema>,
): Promise<ActionResult<{ id: string; name: string; slug: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized." };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, role: true },
  });

  if (!user?.companyId) return { success: false, error: "No company assigned." };
  if (user.role !== "ADMIN") return { success: false, error: "Only admins can update company settings." };

  const parsed = UpdateCompanySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data." };
  }

  try {
    if (parsed.data.slug) {
      const conflict = await prisma.company.findFirst({
        where: { slug: parsed.data.slug, NOT: { id: user.companyId } },
      });
      if (conflict) return { success: false, error: "Slug already taken." };
    }

    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: parsed.data,
      select: { id: true, name: true, slug: true },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: company };
  } catch (err) {
    console.error("[updateCompanyAction]", err);
    return { success: false, error: "Failed to update company." };
  }
}