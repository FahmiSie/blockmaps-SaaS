import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  companyProcedure,
} from "@/server/api/trpc";

const ZoneTypeEnum = z.enum([
  "RAW_MATERIAL",
  "PRODUCTION",
  "FINISHED_GOODS",
  "STORAGE",
]);

const ZonePositionSchema = z.object({
  positionX: z.number(),
  positionY: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const zoneRouter = createTRPCRouter({
  // ── LIST ALL ZONES ────────────────────────────────────────
  list: companyProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
        type: ZoneTypeEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.zone.findMany({
        where: {
          companyId: ctx.companyId,
          ...(!input.includeInactive && { isActive: true }),
          ...(input.type && { type: input.type }),
        },
        include: {
          _count: { select: { inventory: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  // ── GET FULL FLOOR PLAN (zones + inventory snapshot) ──────
  floorPlan: companyProcedure.query(async ({ ctx }) => {
    return ctx.prisma.zone.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      include: {
        inventory: {
          include: {
            item: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  // ── GET BY ID ─────────────────────────────────────────────
  getById: companyProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const zone = await ctx.prisma.zone.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          inventory: {
            include: { item: true },
          },
          _count: {
            select: { deliveriesFrom: true, deliveriesTo: true },
          },
        },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND" });
      return zone;
    }),

  // ── CREATE ZONE ───────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        type: ZoneTypeEnum,
      }).merge(ZonePositionSchema),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.zone.create({
        data: { ...input, companyId: ctx.companyId },
      });
    }),

  // ── UPDATE ZONE ───────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        type: ZoneTypeEnum.optional(),
        isActive: z.boolean().optional(),
      }).merge(ZonePositionSchema.partial()),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const zone = await ctx.prisma.zone.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.zone.update({ where: { id }, data });
    }),

  // ── BULK UPSERT POSITIONS (drag-and-drop save) ────────────
  bulkUpdatePositions: adminProcedure
    .input(
      z.array(
        z.object({
          id: z.string().cuid(),
          positionX: z.number(),
          positionY: z.number(),
          width: z.number().positive(),
          height: z.number().positive(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all zones belong to this company
      const ids = input.map((z) => z.id);
      const owned = await ctx.prisma.zone.findMany({
        where: { id: { in: ids }, companyId: ctx.companyId },
        select: { id: true },
      });
      if (owned.length !== ids.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "One or more zones do not belong to your company.",
        });
      }

      await ctx.prisma.$transaction(
        input.map(({ id, ...pos }) =>
          ctx.prisma.zone.update({ where: { id }, data: pos }),
        ),
      );

      return { updated: input.length };
    }),

  // ── DEACTIVATE ────────────────────────────────────────────
  deactivate: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const zone = await ctx.prisma.zone.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND" });

      // Check no active deliveries involve this zone
      const active = await ctx.prisma.deliveryRequest.count({
        where: {
          OR: [{ fromZoneId: input.id }, { toZoneId: input.id }],
          status: { in: ["PENDING", "APPROVED", "IN_PROGRESS"] },
        },
      });
      if (active > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Zone has ${active} active delivery request(s). Resolve them before deactivating.`,
        });
      }

      return ctx.prisma.zone.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ── DELETE ────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const zone = await ctx.prisma.zone.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!zone) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.zone.delete({ where: { id: input.id } });
    }),

  // ── ZONE STATS (for dashboard) ────────────────────────────
  stats: companyProcedure.query(async ({ ctx }) => {
    const byType = await ctx.prisma.zone.groupBy({
      by: ["type", "isActive"],
      where: { companyId: ctx.companyId },
      _count: true,
    });
    return byType;
  }),
});