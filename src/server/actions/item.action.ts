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
  if (!user?.companyId || user.role !== "ADMIN") return null;
  return { userId: session.user.id, companyId: user.companyId };
}

async function getManagerContext() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true, role: true },
  });
  if (!user?.companyId) return null;
  if (!["ADMIN", "MANAGER"].includes(user.role)) return null;
  return { userId: session.user.id, companyId: user.companyId, role: user.role };
}

// ── SCHEMAS ────────────────────────────────────────────────

const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  unit: z.string().min(1).max(20),
});

const UpdateItemSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  sku: z.string().min(1).max(50).optional(),
  unit: z.string().min(1).max(20).optional(),
});

const UpsertInventorySchema = z.object({
  zoneId: z.string().cuid(),
  itemId: z.string().cuid(),
  quantity: z.number().min(0),
});

// ── CREATE ITEM ────────────────────────────────────────────

export async function createItemAction(
  formData: z.infer<typeof CreateItemSchema>,
): Promise<ActionResult<{ id: string; name: string; sku: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized. Admin access required." };

  const parsed = CreateItemSchema.safeParse(formData);
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat().join(", ");
    return { success: false, error: msg };
  }

  try {
    const conflict = await prisma.item.findUnique({
      where: { companyId_sku: { companyId: ctx.companyId, sku: parsed.data.sku } },
    });
    if (conflict) {
      return { success: false, error: `SKU "${parsed.data.sku}" already exists.` };
    }

    const item = await prisma.item.create({
      data: { ...parsed.data, companyId: ctx.companyId },
      select: { id: true, name: true, sku: true },
    });

    revalidatePath("/admin/inventory");
    return { success: true, data: item };
  } catch (err) {
    console.error("[createItemAction]", err);
    return { success: false, error: "Failed to create item." };
  }
}

// ── UPDATE ITEM ────────────────────────────────────────────

export async function updateItemAction(
  formData: z.infer<typeof UpdateItemSchema>,
): Promise<ActionResult<{ id: string; name: string }>> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const parsed = UpdateItemSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Invalid data." };

  const { id, ...data } = parsed.data;

  try {
    const item = await prisma.item.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    if (!item) return { success: false, error: "Item not found." };

    if (data.sku && data.sku !== item.sku) {
      const conflict = await prisma.item.findUnique({
        where: { companyId_sku: { companyId: ctx.companyId, sku: data.sku } },
      });
      if (conflict) return { success: false, error: `SKU "${data.sku}" already exists.` };
    }

    const updated = await prisma.item.update({
      where: { id },
      data,
      select: { id: true, name: true },
    });

    revalidatePath("/admin/items");
    revalidatePath(`/admin/items/${id}`);
    return { success: true, data: updated };
  } catch (err) {
    console.error("[updateItemAction]", err);
    return { success: false, error: "Failed to update item." };
  }
}

// ── DELETE ITEM ────────────────────────────────────────────

export async function deleteItemAction(itemId: string): Promise<ActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const item = await prisma.item.findFirst({
      where: { id: itemId, companyId: ctx.companyId },
    });
    if (!item) return { success: false, error: "Item not found." };

    await prisma.item.delete({ where: { id: itemId } });

    revalidatePath("/admin/items");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[deleteItemAction]", err);
    return { success: false, error: "Failed to delete item." };
  }
}

// ── UPSERT INVENTORY ──────────────────────────────────────

export async function upsertInventoryAction(
  formData: z.infer<typeof UpsertInventorySchema>,
): Promise<ActionResult<{ zoneId: string; itemId: string; quantity: number }>> {
  const ctx = await getManagerContext();
  if (!ctx) return { success: false, error: "Unauthorized. Manager or Admin required." };

  const parsed = UpsertInventorySchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Invalid data." };

  const { zoneId, itemId, quantity } = parsed.data;

  try {
    const [zone, item] = await Promise.all([
      prisma.zone.findFirst({ where: { id: zoneId, companyId: ctx.companyId } }),
      prisma.item.findFirst({ where: { id: itemId, companyId: ctx.companyId } }),
    ]);

    if (!zone) return { success: false, error: "Zone not found." };
    if (!item) return { success: false, error: "Item not found." };

    const inventory = await prisma.inventory.upsert({
      where: { zoneId_itemId: { zoneId, itemId } },
      update: { quantity },
      create: { zoneId, itemId, quantity },
      select: { zoneId: true, itemId: true, quantity: true },
    });

    revalidatePath(`/admin/zones/${zoneId}`);
    revalidatePath(`/admin/items/${itemId}`);
    revalidatePath("/admin/inventory");
    return { success: true, data: inventory };
  } catch (err) {
    console.error("[upsertInventoryAction]", err);
    return { success: false, error: "Failed to update inventory." };
  }
}

// ── BULK IMPORT ITEMS ──────────────────────────────────────

export async function bulkImportItemsAction(
  items: Array<{ name: string; sku: string; unit: string }>,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  try {
    const existingSKUs = await prisma.item.findMany({
      where: { companyId: ctx.companyId },
      select: { sku: true },
    });
    const skuSet = new Set(existingSKUs.map((i) => i.sku));

    const newItems = items.filter((i) => !skuSet.has(i.sku));
    const skipped = items.length - newItems.length;

    if (newItems.length > 0) {
      await prisma.item.createMany({
        data: newItems.map((i) => ({ ...i, companyId: ctx.companyId })),
      });
    }

    revalidatePath("/admin/items");
    return { success: true, data: { created: newItems.length, skipped } };
  } catch (err) {
    console.error("[bulkImportItemsAction]", err);
    return { success: false, error: "Bulk import failed." };
  }
}