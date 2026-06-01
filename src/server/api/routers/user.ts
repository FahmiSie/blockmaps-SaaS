import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  managerProcedure,
  companyProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { uploadUserAvatar, deleteCloudinaryImage } from "@/server/actions/upload.action";
import bcrypt from "bcryptjs";

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
        companyId: true,
        company: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),

  // ── LIST USERS IN COMPANY ────────────────────────────────
  list: managerProcedure
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

      return {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
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
  updateRole: managerProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent non-admins from promoting users to ADMIN
      if (input.role === "ADMIN" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admins can promote users to Admin.",
        });
      }

      const target = await ctx.prisma.user.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      
      // Prevent non-admins from modifying existing ADMIN users
      if (target.role === "ADMIN" && ctx.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admins can modify Admin users.",
        });
      }

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: { id: true, name: true, email: true, image: true },
      });
    }),
  // ── UPDATE AVATAR ─────────────────────────────────────────
  // Terima base64 dari client, upload ke Cloudinary, simpan URL ke DB
  updateAvatar: protectedProcedure
    .input(
      z.object({
        // base64 string dengan atau tanpa data URI prefix
        // contoh: "data:image/png;base64,iVBORw0..." atau "iVBORw0..."
        base64: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { url } = await uploadUserAvatar({
        base64: input.base64,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { image: url },
        select: { id: true, name: true, image: true },
      });
    }),

  // ── REMOVE AVATAR ─────────────────────────────────────────
  // Set image = null in DB, delete old Cloudinary asset
  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { image: true },
    });

    // If user has a Cloudinary avatar, delete it from Cloudinary too
    if (user?.image) {
      // Cloudinary public_id for avatars is "flowgrid/avatars/<userId>"
      const publicId = `flowgrid/avatars/${ctx.session.user.id}`;
      await deleteCloudinaryImage(publicId);
    }

    return ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: { image: null },
      select: { id: true, name: true, image: true },
    });
  }),

  // ── CHANGE PASSWORD ───────────────────────────────────────
  // Hanya untuk credentials user — OAuth user tidak punya password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password minimal 8 karakter").max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { password: true },
      });

      // OAuth user tidak punya password
      if (!user?.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Akun ini menggunakan login Google. Ganti password tidak tersedia.",
        });
      }

      const isValid = await bcrypt.compare(
        input.currentPassword,
        user.password,
      );
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password saat ini salah.",
        });
      }

      if (input.currentPassword === input.newPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password baru tidak boleh sama dengan password lama.",
        });
      }

      const hashed = await bcrypt.hash(input.newPassword, 12);
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { password: hashed },
      });

      return { success: true };
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

  // ── INVITE (assign companyId to user / pre-create if not exists) ──
  invite: managerProcedure
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
        return ctx.prisma.user.create({
          data: {
            email: input.email,
            companyId: ctx.companyId,
            role: input.role,
          },
          select: { id: true, name: true, email: true, role: true },
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