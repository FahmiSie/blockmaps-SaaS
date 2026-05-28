import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  companyProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  // ── GET SELF ──────────────────────────────────────────────
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        company: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),

  // ── LIST USERS IN COMPANY ────────────────────────────────
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, role } = input;
      const skip = (page - 1) * limit;

      const where = {
        companyId: ctx.companyId,
        ...(role && { role }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
          },
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }),

  // ── GET BY ID ─────────────────────────────────────────────
  getById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  // ── UPDATE ROLE ──────────────────────────────────────────
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role.",
        });
      }
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  // ── UPDATE PROFILE ────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        image: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: { id: true, name: true, email: true, image: true },
      });
    }),

  // ── REMOVE FROM COMPANY ───────────────────────────────────
  remove: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself.",
        });
      }
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: { companyId: null },
        select: { id: true, name: true },
      });
    }),

  // ── INVITE (assign companyId to existing user) ────────────
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["MANAGER", "OPERATOR"]).default("OPERATOR"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with that email.",
        });
      }
      if (target.companyId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already belongs to a company.",
        });
      }
      return ctx.prisma.user.update({
        where: { id: target.id },
        data: { companyId: ctx.companyId, role: input.role },
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  // ── STATS ─────────────────────────────────────────────────
  stats: companyProcedure.query(async ({ ctx }) => {
    const [total, byRole] = await Promise.all([
      ctx.prisma.user.count({ where: { companyId: ctx.companyId } }),
      ctx.prisma.user.groupBy({
        by: ["role"],
        where: { companyId: ctx.companyId },
        _count: true,
      }),
    ]);
    return { total, byRole };
  }),
});