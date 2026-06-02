import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  companyProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { uploadCompanyLogo } from "@/server/actions/upload.action";

export const companyRouter = createTRPCRouter({
  // ── GET CURRENT COMPANY ───────────────────────────────────
  getCurrent: companyProcedure.query(async ({ ctx }) => {
    const company = await ctx.prisma.company.findUnique({
      where: { id: ctx.companyId },
      include: {
        _count: {
          select: { users: true, zones: true, items: true, deliveries: true },
        },
      },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    return company;
  }),

  // ── CREATE COMPANY ────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        slug: z
          .string()
          .min(2)
          .max(50)
          .regex(
            /^[a-z0-9-]+$/,
            "Only lowercase letters, numbers, and hyphens",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check user doesn't already belong to a company
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { companyId: true },
      });
      if (user?.companyId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already belong to a company.",
        });
      }

      // Slug must be unique
      const existing = await ctx.prisma.company.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Slug already taken. Please choose another.",
        });
      }

      // Create company and assign creator as ADMIN
      const company = await ctx.prisma.company.create({
        data: {
          name: input.name,
          slug: input.slug,
          users: {
            connect: { id: ctx.session.user.id },
          },
        },
      });

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { role: "ADMIN", companyId: company.id },
      });

      return company;
    }),

  deleteCompany: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        slug: z
          .string()
          .min(2)
          .max(50)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.slug) {
        const data = await ctx.prisma.company.findFirst({
          where: { slug: input.slug },
        });
        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Data company not found.",
          });
        }
        return ctx.prisma.company.update({
          where: { id: ctx.companyId },
          data: { status: "Delete" },
        });
      }
    }),

  // ── UPDATE COMPANY ────────────────────────────────────────
  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        slug: z
          .string()
          .min(2)
          .max(50)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.slug) {
        const conflict = await ctx.prisma.company.findFirst({
          where: { slug: input.slug, NOT: { id: ctx.companyId } },
        });
        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Slug already taken.",
          });
        }
      }
      return ctx.prisma.company.update({
        where: { id: ctx.companyId },
        data: input,
      });
    }),

  // ── DASHBOARD SUMMARY ─────────────────────────────────────
  dashboardSummary: companyProcedure.query(async ({ ctx }) => {
    const [userCount, zoneCount, itemCount, deliveryCounts] = await Promise.all(
      [
        ctx.prisma.user.count({ where: { companyId: ctx.companyId } }),
        ctx.prisma.zone.count({
          where: { companyId: ctx.companyId, isActive: true },
        }),
        ctx.prisma.item.count({ where: { companyId: ctx.companyId } }),
        ctx.prisma.deliveryRequest.groupBy({
          by: ["status"],
          where: { companyId: ctx.companyId },
          _count: true,
        }),
      ],
    );

    const deliveryStats = deliveryCounts.reduce(
      (acc, cur) => {
        acc[cur.status] = cur._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      users: userCount,
      activeZones: zoneCount,
      items: itemCount,
      deliveries: {
        pending: deliveryStats.PENDING ?? 0,
        approved: deliveryStats.APPROVED ?? 0,
        inProgress: deliveryStats.IN_PROGRESS ?? 0,
        completed: deliveryStats.COMPLETED ?? 0,
        rejected: deliveryStats.REJECTED ?? 0,
      },
    };
  }),

  // ── UPDATE LOGO ───────────────────────────────────────────
  updateLogo: adminProcedure
    .input(z.object({ base64: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { url } = await uploadCompanyLogo({
        base64: input.base64,
        companyId: ctx.companyId,
      });

      return ctx.prisma.company.update({
        where: { id: ctx.companyId },
        data: { logoUrl: url },
        select: { id: true, name: true, logoUrl: true },
      });
    }),

  // ── REMOVE LOGO ───────────────────────────────────────────
  removeLogo: adminProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.company.update({
      where: { id: ctx.companyId },
      data: { logoUrl: null },
      select: { id: true, name: true, logoUrl: true },
    });
  }),
});
