"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── CONTEXT HELPERS ────────────────────────────────────────

async function getContext(minRole?: "MANAGER" | "ADMIN") {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, role: true },
  });
  if (!user?.companyId) return null;
  if (minRole === "ADMIN" && user.role !== "ADMIN") return null;
  if (minRole === "MANAGER" && !["ADMIN", "MANAGER"].includes(user.role)) return null;
  return { userId: session.user.id, companyId: user.companyId, role: user.role };
}

// ── SCHEMAS ────────────────────────────────────────────────

const CreateDeliverySchema = z.object({
  fromZoneId: z.string().cuid(),
  toZoneId: z.string().cuid(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        quantity: z.number().positive(),
      }),
    )
    .min(1, "At least one item required"),
});

// ── CREATE DELIVERY REQUEST ───────────────────────────────

export async function createDeliveryRequestAction(
  formData: z.infer<typeof CreateDeliverySchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const parsed = CreateDeliverySchema.safeParse(formData);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat().join(", ");
    return { success: false, error: msg };
  }

  const { fromZoneId, toZoneId, notes, items } = parsed.data;

  if (fromZoneId === toZoneId) {
    return { success: false, error: "Source and destination zones cannot be the same." };
  }

  try {
    const [fromZone, toZone] = await Promise.all([
      prisma.zone.findFirst({ where: { id: fromZoneId, companyId: ctx.companyId, isActive: true } }),
      prisma.zone.findFirst({ where: { id: toZoneId, companyId: ctx.companyId, isActive: true } }),
    ]);

    if (!fromZone) return { success: false, error: "Source zone not found or inactive." };
    if (!toZone) return { success: false, error: "Destination zone not found or inactive." };

    // Verify items belong to company
    const itemIds = items.map((i) => i.itemId);
    const ownedItems = await prisma.item.findMany({
      where: { id: { in: itemIds }, companyId: ctx.companyId },
      select: { id: true, name: true, unit: true },
    });
    if (ownedItems.length !== itemIds.length) {
      return { success: false, error: "One or more items do not belong to your company." };
    }

    // Check stock levels in source zone
    const inventoryRecords = await prisma.inventory.findMany({
      where: { zoneId: fromZoneId, itemId: { in: itemIds } },
    });
    const inventoryMap = new Map(inventoryRecords.map((r) => [r.itemId, r.quantity]));
    const itemNameMap = new Map(ownedItems.map((i) => [i.id, `${i.name}`]));

    for (const reqItem of items) {
      const available = inventoryMap.get(reqItem.itemId) ?? 0;
      if (available < reqItem.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${itemNameMap.get(reqItem.itemId) ?? reqItem.itemId}". Available: ${available}, Requested: ${reqItem.quantity}.`,
        };
      }
    }

    const delivery = await prisma.deliveryRequest.create({
      data: {
        companyId: ctx.companyId,
        requestedById: ctx.userId,
        fromZoneId,
        toZoneId,
        notes,
        items: {
          create: items.map(({ itemId, quantity }) => ({ itemId, quantity })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/delivery");
    revalidatePath("/admin/deliveries");
    return { success: true, data: delivery };
  } catch (err) {
    console.error("[createDeliveryRequestAction]", err);
    return { success: false, error: "Failed to create delivery request." };
  }
}

// ── APPROVE ────────────────────────────────────────────────

export async function approveDeliveryAction(
  deliveryId: string,
): Promise<ActionResult> {
  const ctx = await getContext("MANAGER");
  if (!ctx) return { success: false, error: "Unauthorized. Manager or Admin required." };

  try {
    const req = await prisma.deliveryRequest.findFirst({
      where: { id: deliveryId, companyId: ctx.companyId },
    });
    if (!req) return { success: false, error: "Delivery request not found." };
    if (req.status !== "PENDING") {
      return { success: false, error: `Cannot approve a request with status "${req.status}".` };
    }

    await prisma.deliveryRequest.update({
      where: { id: deliveryId },
      data: { status: "APPROVED", approvedById: ctx.userId },
    });

    revalidatePath("/admin/deliveries");
    revalidatePath(`/admin/deliveries/${deliveryId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[approveDeliveryAction]", err);
    return { success: false, error: "Failed to approve delivery." };
  }
}

// ── REJECT ─────────────────────────────────────────────────

export async function rejectDeliveryAction(
  deliveryId: string,
  notes?: string,
): Promise<ActionResult> {
  const ctx = await getContext("MANAGER");
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const req = await prisma.deliveryRequest.findFirst({
      where: { id: deliveryId, companyId: ctx.companyId },
    });
    if (!req) return { success: false, error: "Delivery request not found." };
    if (!["PENDING", "APPROVED"].includes(req.status)) {
      return { success: false, error: `Cannot reject a request with status "${req.status}".` };
    }

    await prisma.deliveryRequest.update({
      where: { id: deliveryId },
      data: {
        status: "REJECTED",
        approvedById: ctx.userId,
        ...(notes && { notes }),
      },
    });

    revalidatePath("/admin/deliveries");
    revalidatePath(`/admin/deliveries/${deliveryId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[rejectDeliveryAction]", err);
    return { success: false, error: "Failed to reject delivery." };
  }
}

// ── START (Operator) ───────────────────────────────────────

export async function startDeliveryAction(
  deliveryId: string,
): Promise<ActionResult> {
  const ctx = await getContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const req = await prisma.deliveryRequest.findFirst({
      where: { id: deliveryId, companyId: ctx.companyId },
    });
    if (!req) return { success: false, error: "Delivery request not found." };
    if (req.status !== "APPROVED") {
      return { success: false, error: "Only approved requests can be started." };
    }

    await prisma.deliveryRequest.update({
      where: { id: deliveryId },
      data: { status: "IN_PROGRESS" },
    });

    revalidatePath("/delivery");
    revalidatePath(`/delivery/${deliveryId}`);
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[startDeliveryAction]", err);
    return { success: false, error: "Failed to start delivery." };
  }
}

// ── COMPLETE + INVENTORY UPDATE ───────────────────────────

export async function completeDeliveryAction(
  deliveryId: string,
): Promise<ActionResult> {
  const ctx = await getContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const req = await prisma.deliveryRequest.findFirst({
      where: { id: deliveryId, companyId: ctx.companyId },
      include: { items: true },
    });
    if (!req) return { success: false, error: "Delivery request not found." };
    if (req.status !== "IN_PROGRESS") {
      return { success: false, error: "Only in-progress requests can be completed." };
    }

    // Atomic transaction: mark complete + adjust inventory
    await prisma.$transaction(async (tx) => {
      await tx.deliveryRequest.update({
        where: { id: deliveryId },
        data: { status: "COMPLETED" },
      });

      for (const deliveryItem of req.items) {
        // Deduct from source
        await tx.inventory.upsert({
          where: {
            zoneId_itemId: { zoneId: req.fromZoneId, itemId: deliveryItem.itemId },
          },
          update: { quantity: { decrement: deliveryItem.quantity } },
          create: {
            zoneId: req.fromZoneId,
            itemId: deliveryItem.itemId,
            quantity: 0,
          },
        });

        // Add to destination
        await tx.inventory.upsert({
          where: {
            zoneId_itemId: { zoneId: req.toZoneId, itemId: deliveryItem.itemId },
          },
          update: { quantity: { increment: deliveryItem.quantity } },
          create: {
            zoneId: req.toZoneId,
            itemId: deliveryItem.itemId,
            quantity: deliveryItem.quantity,
          },
        });
      }
    });

    revalidatePath("/delivery");
    revalidatePath(`/delivery/${deliveryId}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/floor-plan");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[completeDeliveryAction]", err);
    return { success: false, error: "Failed to complete delivery." };
  }
}

// ── CANCEL (own PENDING request, or Manager) ──────────────

export async function cancelDeliveryAction(
  deliveryId: string,
): Promise<ActionResult> {
  const ctx = await getContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const req = await prisma.deliveryRequest.findFirst({
      where: { id: deliveryId, companyId: ctx.companyId },
    });
    if (!req) return { success: false, error: "Delivery request not found." };

    const isOwner = req.requestedById === ctx.userId;
    const isManager = ["ADMIN", "MANAGER"].includes(ctx.role);

    if (!isOwner && !isManager) {
      return { success: false, error: "You can only cancel your own requests." };
    }
    if (req.status !== "PENDING") {
      return { success: false, error: "Only pending requests can be cancelled." };
    }

    await prisma.deliveryRequest.update({
      where: { id: deliveryId },
      data: { status: "REJECTED" },
    });

    revalidatePath("/delivery");
    revalidatePath("/admin/deliveries");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[cancelDeliveryAction]", err);
    return { success: false, error: "Failed to cancel delivery." };
  }
}