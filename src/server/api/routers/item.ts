import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  companyProcedure,
  managerProcedure,
} from "@/server/api/trpc";

export const itemRouter = createTRPCRouter({
  // ── LIST ITEMS ────────────────────────────────────────────
  list: companyProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const skip = (page - 1) * limit;

      const where = {
        companyId: ctx.companyId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [rawItems, total] = await Promise.all([
        ctx.prisma.item.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { inventory: true } },
            inventory: {
              select: { quantity: true },
            },
          },
        }),
        ctx.prisma.item.count({ where }),
      ]);

      const items = rawItems.map((item) => {
        const totalQuantity = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          _count: item._count,
          totalQuantity,
        };
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // ── GET BY ID ─────────────────────────────────────────────
  getById: companyProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.item.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          inventory: {
            include: {
              zone: { select: { id: true, name: true, type: true } },
            },
          },
        },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),

  // ── CREATE ────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        sku: z.string().min(1).max(50),
        unit: z.string().min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conflict = await ctx.prisma.item.findUnique({
        where: { companyId_sku: { companyId: ctx.companyId, sku: input.sku } },
      });
      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `SKU "${input.sku}" already exists.`,
        });
      }
      return ctx.prisma.item.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  // ── UPDATE ────────────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        sku: z.string().min(1).max(50).optional(),
        unit: z.string().min(1).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const item = await ctx.prisma.item.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      if (data.sku && data.sku !== item.sku) {
        const conflict = await ctx.prisma.item.findUnique({
          where: {
            companyId_sku: { companyId: ctx.companyId, sku: data.sku },
          },
        });
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `SKU "${data.sku}" already exists.`,
          });
        }
      }

      return ctx.prisma.item.update({ where: { id }, data });
    }),

  // ── DELETE ────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.item.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.item.delete({ where: { id: input.id } });
    }),
});

// ============================================================
// INVENTORY ROUTER
// ============================================================

export const inventoryRouter = createTRPCRouter({
  // ── GET INVENTORY BY ZONE ─────────────────────────────────
  byZone: companyProcedure
    .input(z.object({ zoneId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const zone = await ctx.prisma.zone.findFirst({
        where: { id: input.zoneId, companyId: ctx.companyId },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.inventory.findMany({
        where: { zoneId: input.zoneId },
        include: {
          item: { select: { id: true, name: true, sku: true, unit: true } },
        },
        orderBy: { item: { name: "asc" } },
      });
    }),

  // ── GET INVENTORY BY ITEM (all zones) ─────────────────────
  byItem: companyProcedure
    .input(z.object({ itemId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.item.findFirst({
        where: { id: input.itemId, companyId: ctx.companyId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.inventory.findMany({
        where: { itemId: input.itemId },
        include: {
          zone: {
            select: { id: true, name: true, type: true, isActive: true },
          },
        },
        orderBy: { zone: { name: "asc" } },
      });
    }),

  // ── UPSERT INVENTORY ──────────────────────────────────────
  // Used by Admin/Manager to manually set stock levels
  upsert: managerProcedure
    .input(
      z.object({
        zoneId: z.string().cuid(),
        itemId: z.string().cuid(),
        quantity: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify both zone and item belong to company
      const [zone, item] = await Promise.all([
        ctx.prisma.zone.findFirst({
          where: { id: input.zoneId, companyId: ctx.companyId },
        }),
        ctx.prisma.item.findFirst({
          where: { id: input.itemId, companyId: ctx.companyId },
        }),
      ]);
      if (!zone)
        throw new TRPCError({ code: "NOT_FOUND", message: "Zone not found." });
      if (!item)
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });

      return ctx.prisma.inventory.upsert({
        where: {
          zoneId_itemId: { zoneId: input.zoneId, itemId: input.itemId },
        },
        update: { quantity: input.quantity },
        create: {
          zoneId: input.zoneId,
          itemId: input.itemId,
          quantity: input.quantity,
        },
        include: { item: true, zone: true },
      });
    }),

  // ── TRANSFER STOCK ──────────────────────────────────────────
  transferStock: managerProcedure
    .input(
      z.object({
        itemId: z.string().cuid(),
        fromZoneId: z.string().cuid(),
        toZoneId: z.string().cuid(),
        quantity: z.number().positive(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.fromZoneId === input.toZoneId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Source and destination zones cannot be the same." });
      }

      // Verify item belongs to company
      const item = await ctx.prisma.item.findFirst({
        where: { id: input.itemId, companyId: ctx.companyId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });

      // Verify zones belong to company
      const [fromZone, toZone] = await Promise.all([
        ctx.prisma.zone.findFirst({ where: { id: input.fromZoneId, companyId: ctx.companyId } }),
        ctx.prisma.zone.findFirst({ where: { id: input.toZoneId, companyId: ctx.companyId } }),
      ]);
      if (!fromZone || !toZone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "One or both zones not found." });
      }

      // Execute transfer in a transaction
      return ctx.prisma.$transaction(async (tx) => {
        // 1. Check source stock
        const sourceInventory = await tx.inventory.findUnique({
          where: { zoneId_itemId: { zoneId: input.fromZoneId, itemId: input.itemId } },
        });

        if (!sourceInventory || sourceInventory.quantity < input.quantity) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Insufficient stock in source zone. Available: ${sourceInventory?.quantity ?? 0}, Requested: ${input.quantity}`
          });
        }

        // 2. Decrement source zone
        await tx.inventory.update({
          where: { zoneId_itemId: { zoneId: input.fromZoneId, itemId: input.itemId } },
          data: { quantity: { decrement: input.quantity } },
        });

        // 3. Increment destination zone
        await tx.inventory.upsert({
          where: { zoneId_itemId: { zoneId: input.toZoneId, itemId: input.itemId } },
          update: { quantity: { increment: input.quantity } },
          create: {
            zoneId: input.toZoneId,
            itemId: input.itemId,
            quantity: input.quantity,
          },
        });

        // Return updated stock in source zone as result
        return tx.inventory.findUnique({
          where: { zoneId_itemId: { zoneId: input.fromZoneId, itemId: input.itemId } },
          include: { item: true, zone: true }
        });
      });
    }),

  // ── COMPANY-WIDE STOCK OVERVIEW ───────────────────────────
  overview: companyProcedure.query(async ({ ctx }) => {
    const items = await ctx.prisma.item.findMany({
      where: {
        companyId: ctx.companyId,
      },
      include: {
        inventory: {
          include: {
            zone: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return items.map((item) => {
      const totalQuantity = item.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const zones = item.inventory.map((inv) => ({
        zone: inv.zone,
        quantity: inv.quantity,
      }));
      return {
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
        },
        totalQuantity,
        zones,
      };
    });
  }),
});
