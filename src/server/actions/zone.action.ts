"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAdminContext() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, role: true },
  });
  if (!user?.companyId) return null;
  if (!["ADMIN"].includes(user.role)) return null;
  return { userId: session.user.id, companyId: user.companyId, role: user.role };
}

async function getCompanyContext() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, role: true },
  });
  if (!user?.companyId) return null;
  return { userId: session.user.id, companyId: user.companyId, role: user.role };
}

// ── SCHEMAS ────────────────────────────────────────────────

const ZoneTypeEnum = z.enum(["RAW_MATERIAL", "PRODUCTION", "FINISHED_GOODS", "STORAGE"]);

const CreateZoneSchema = z.object({
  name: z.string().min(1).max(100),
  type: ZoneTypeEnum,
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const UpdateZoneSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  type: ZoneTypeEnum.optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

const BulkPositionSchema = z.array(
  z.object({
    id: z.string().cuid(),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
);

// ── CREATE ─────────────────────────────────────────────────

export async function createZoneAction(
  formData: z.infer<typeof CreateZoneSchema>,
): Promise<ActionResult<{ id: string; name: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized. Admin access required." };

  const parsed = CreateZoneSchema.safeParse(formData);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat().join(", ");
    return { success: false, error: msg };
  }

  try {
    const zone = await prisma.zone.create({
      data: { ...parsed.data, companyId: ctx.companyId },
      select: { id: true, name: true },
    });

    revalidatePath("/admin/floor-plan");
    return { success: true, data: zone };
  } catch (err) {
    console.error("[createZoneAction]", err);
    return { success: false, error: "Failed to create zone." };
  }
}

// ── UPDATE ─────────────────────────────────────────────────

export async function updateZoneAction(
  formData: z.infer<typeof UpdateZoneSchema>,
): Promise<ActionResult<{ id: string; name: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const parsed = UpdateZoneSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Invalid data." };

  const { id, ...data } = parsed.data;

  try {
    const zone = await prisma.zone.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!zone) return { success: false, error: "Zone not found." };

    const updated = await prisma.zone.update({
      where: { id },
      data,
      select: { id: true, name: true },
    });

    revalidatePath("/admin/floor-plan");
    return { success: true, data: updated };
  } catch (err) {
    console.error("[updateZoneAction]", err);
    return { success: false, error: "Failed to update zone." };
  }
}

// ── BULK UPDATE POSITIONS (floor plan drag-and-drop save) ──

export async function bulkUpdateZonePositionsAction(
  positions: z.infer<typeof BulkPositionSchema>,
): Promise<ActionResult<{ updated: number }>> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const parsed = BulkPositionSchema.safeParse(positions);
  if (!parsed.success) return { success: false, error: "Invalid position data." };

  try {
    const ids = parsed.data.map((z) => z.id);
    const owned = await prisma.zone.findMany({
      where: { id: { in: ids }, companyId: ctx.companyId },
      select: { id: true },
    });

    if (owned.length !== ids.length) {
      return { success: false, error: "One or more zones do not belong to your company." };
    }

    await prisma.$transaction(
      parsed.data.map(({ id, ...pos }) =>
        prisma.zone.update({ where: { id }, data: pos }),
      ),
    );

    revalidatePath("/admin/floor-plan");
    return { success: true, data: { updated: parsed.data.length } };
  } catch (err) {
    console.error("[bulkUpdateZonePositionsAction]", err);
    return { success: false, error: "Failed to save positions." };
  }
}

// ── DEACTIVATE ─────────────────────────────────────────────

export async function deactivateZoneAction(
  zoneId: string,
): Promise<ActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, companyId: ctx.companyId },
    });
    if (!zone) return { success: false, error: "Zone not found." };

    const active = await prisma.deliveryRequest.count({
      where: {
        OR: [{ fromZoneId: zoneId }, { toZoneId: zoneId }],
        status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] },
      },
    });
    if (active > 0) {
      return {
        success: false,
        error: `Zone has ${active} active delivery request(s). Resolve them before deactivating.`,
      };
    }

    await prisma.zone.update({
      where: { id: zoneId },
      data: { isActive: false },
    });

    revalidatePath("/admin/floor-plan");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[deactivateZoneAction]", err);
    return { success: false, error: "Failed to deactivate zone." };
  }
}

// ── DELETE ─────────────────────────────────────────────────

export async function deleteZoneAction(zoneId: string): Promise<ActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const zone = await prisma.zone.findFirst({
      where: { id: zoneId, companyId: ctx.companyId },
    });
    if (!zone) return { success: false, error: "Zone not found." };

    await prisma.zone.delete({ where: { id: zoneId } });

    revalidatePath("/admin/floor-plan");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[deleteZoneAction]", err);
    return { success: false, error: "Failed to delete zone." };
  }
}