import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  companyProcedure,
  managerProcedure,
  operatorProcedure,
} from "@/server/api/trpc";

const DeliveryStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
]);

const deliveryInclude = {
  requestedBy: { select: { id: true, name: true, email: true, image: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  fromZone: { select: { id: true, name: true, type: true } },
  toZone: { select: { id: true, name: true, type: true } },
  items: {
    include: {
      item: { select: { id: true, name: true, sku: true, unit: true } },
    },
  },
} as const;

export const deliveryRouter = createTRPCRouter({
  list: companyProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        status: DeliveryStatusEnum.optional(),
        fromZoneId: z.string().cuid().optional(),
        toZoneId: z.string().cuid().optional(),
        requestedById: z.string().cuid().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const {
        page,
        limit,
        status,
        fromZoneId,
        toZoneId,
        requestedById,
        dateFrom,
        dateTo,
        search,
      } = input;
      const skip = (page - 1) * limit;

      const where = {
        companyId: ctx.companyId,
        ...(status && { status }),
        ...(fromZoneId && { fromZoneId }),
        ...(toZoneId && { toZoneId }),
        ...(requestedById && { requestedById }),
        ...((dateFrom ?? dateTo)
          ? {
              createdAt: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
              },
            }
          : {}),
        ...(search && {
          OR: [
            { requestedBy: { name: { contains: search, mode: "insensitive" as const } } },
            { fromZone: { name: { contains: search, mode: "insensitive" as const } } },
            { toZone: { name: { contains: search, mode: "insensitive" as const } } },
            { items: { some: { item: { name: { contains: search, mode: "insensitive" as const } } } } },
          ],
        }),
      };

      const [requests, total] = await Promise.all([
        ctx.prisma.deliveryRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: deliveryInclude,
        }),
        ctx.prisma.deliveryRequest.count({ where }),
      ]);

      return {
        requests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getById: companyProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const req = await ctx.prisma.deliveryRequest.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: deliveryInclude,
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      return req;
    }),

  create: operatorProcedure
    .input(
      z.object({
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.fromZoneId === input.toZoneId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source and destination zones cannot be the same.",
        });
      }

      const [fromZone, toZone] = await Promise.all([
        ctx.prisma.zone.findFirst({
          where: {
            id: input.fromZoneId,
            companyId: ctx.companyId,
            isActive: true,
          },
        }),
        ctx.prisma.zone.findFirst({
          where: {
            id: input.toZoneId,
            companyId: ctx.companyId,
            isActive: true,
          },
        }),
      ]);
      if (!fromZone)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source zone not found or inactive.",
        });
      if (!toZone)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Destination zone not found or inactive.",
        });

      const itemIds = input.items.map((i) => i.itemId);
      const ownedItems = await ctx.prisma.item.findMany({
        where: { id: { in: itemIds }, companyId: ctx.companyId },
        select: { id: true },
      });
      if (ownedItems.length !== itemIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more items do not belong to your company.",
        });
      }

      const inventoryChecks = await ctx.prisma.inventory.findMany({
        where: { zoneId: input.fromZoneId, itemId: { in: itemIds } },
      });
      const inventoryMap = new Map(
        inventoryChecks.map((inv) => [inv.itemId, inv.quantity]),
      );

      for (const reqItem of input.items) {
        const available = inventoryMap.get(reqItem.itemId) ?? 0;
        if (available < reqItem.quantity) {
          const item = await ctx.prisma.item.findUnique({
            where: { id: reqItem.itemId },
            select: { name: true, sku: true, unit: true },
          });
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Insufficient stock for "${item?.name ?? reqItem.itemId}". Available: ${available.toString()}, Requested: ${reqItem.quantity.toString()}.`,
          });
        }
      }

      return ctx.prisma.deliveryRequest.create({
        data: {
          companyId: ctx.companyId,
          requestedById: ctx.session.user.id,
          fromZoneId: input.fromZoneId,
          toZoneId: input.toZoneId,
          notes: input.notes,
          items: {
            create: input.items.map(({ itemId, quantity }) => ({
              itemId,
              quantity,
            })),
          },
        },
        include: deliveryInclude,
      });
    }),

  approve: managerProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.deliveryRequest.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot approve a request with status "${req.status}".`,
        });
      }

      return ctx.prisma.deliveryRequest.update({
        where: { id: input.id },
        data: { status: "APPROVED", approvedById: ctx.session.user.id },
        include: deliveryInclude,
      });
    }),

  reject: managerProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.deliveryRequest.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["PENDING", "APPROVED"].includes(req.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject a request with status "${req.status}".`,
        });
      }

      return ctx.prisma.deliveryRequest.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          approvedById: ctx.session.user.id,
          ...(input.notes && { notes: input.notes }),
        },
        include: deliveryInclude,
      });
    }),

  start: operatorProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.deliveryRequest.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { items: true },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only approved requests can be started.",
        });
      }

      return ctx.prisma.deliveryRequest.update({
        where: { id: input.id },
        data: { status: "IN_PROGRESS" },
        include: deliveryInclude,
      });
    }),

  complete: operatorProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.deliveryRequest.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { items: true },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "IN_PROGRESS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only in-progress requests can be completed.",
        });
      }

      await ctx.prisma.deliveryRequest.update({
        where: { id: input.id },
        data: { status: "COMPLETED" },
      });

      for (const deliveryItem of req.items) {
        await ctx.prisma.inventory.upsert({
          where: {
            zoneId_itemId: {
              zoneId: req.fromZoneId,
              itemId: deliveryItem.itemId,
            },
          },
          update: { quantity: { decrement: deliveryItem.quantity } },
          create: {
            zoneId: req.fromZoneId,
            itemId: deliveryItem.itemId,
            quantity: -deliveryItem.quantity,
          },
        });

        await ctx.prisma.inventory.upsert({
          where: {
            zoneId_itemId: {
              zoneId: req.toZoneId,
              itemId: deliveryItem.itemId,
            },
          },
          update: { quantity: { increment: deliveryItem.quantity } },
          create: {
            zoneId: req.toZoneId,
            itemId: deliveryItem.itemId,
            quantity: deliveryItem.quantity,
          },
        });
      }

      return ctx.prisma.deliveryRequest.findUnique({
        where: { id: input.id },
        include: deliveryInclude,
      });
    }),

  cancel: operatorProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.deliveryRequest.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = req.requestedById === ctx.session.user.id;
      const isManager = ["ADMIN", "MANAGER"].includes(ctx.role);

      if (!isOwner && !isManager) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own requests.",
        });
      }
      if (req.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending requests can be cancelled.",
        });
      }

      return ctx.prisma.deliveryRequest.update({
        where: { id: input.id },
        data: { status: "REJECTED" },
        include: deliveryInclude,
      });
    }),

  stats: companyProcedure.query(async ({ ctx }) => {
    const [byStatus, recentActivity] = await Promise.all([
      ctx.prisma.deliveryRequest.groupBy({
        by: ["status"],
        where: { companyId: ctx.companyId },
        _count: true,
      }),
      ctx.prisma.deliveryRequest.findMany({
        where: { companyId: ctx.companyId },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          fromZone: { select: { id: true, name: true } },
          toZone: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, name: true } },
          items: { select: { id: true } },
        },
      }),
    ]);

    return {
      byStatus: byStatus.reduce(
        (acc, cur) => {
          acc[cur.status] = cur._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentActivity,
    };
  }),
});
