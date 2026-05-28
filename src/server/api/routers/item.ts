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

      const [items, total] = await Promise.all([
        ctx.prisma.item.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { inventory: true } },
          },
        }),
        ctx.prisma.item.count({ where }),
      ]);

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

  // ── COMPANY-WIDE STOCK OVERVIEW ───────────────────────────
  overview: companyProcedure.query(async ({ ctx }) => {
    const inventory = await ctx.prisma.inventory.findMany({
      where: {
        zone: { companyId: ctx.companyId },
      },
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true } },
        zone: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ zone: { name: "asc" } }, { item: { name: "asc" } }],
    });

    // Aggregate total stock per item across all zones
    const totals = inventory.reduce(
      (acc, inv) => {
        const key = inv.itemId;
        acc[key] ??= { item: inv.item, totalQuantity: 0, zones: [] };
        acc[key]!.totalQuantity += inv.quantity;
        acc[key]!.zones.push({ zone: inv.zone, quantity: inv.quantity });
        return acc;
      },
      {} as Record<
        string,
        {
          item: { id: string; name: string; sku: string; unit: string };
          totalQuantity: number;
          zones: {
            zone: { id: string; name: string; type: string };
            quantity: number;
          }[];
        }
      >,
    );

    return Object.values(totals);
  }),
});
