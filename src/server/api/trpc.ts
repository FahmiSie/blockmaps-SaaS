import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { type Role } from "@prisma/client";

// ============================================================
// CONTEXT
// ============================================================


export const createTRPCContext = async (opts: { headers: Headers } | { req: NextRequest }) => {
  const session = await auth();
  return {
    prisma,
    session,
    ...opts,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ============================================================
// INIT
// ============================================================

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// ============================================================
// MIDDLEWARES
// ============================================================

/** Ensure user is authenticated */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      prisma: ctx.prisma,  // ← tambah ini
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/** Ensure user belongs to a company */
const enforceCompany = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const { companyId, role } = ctx.session.user;
  if (!companyId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not associated with any company.",
    });
  }
  return next({
    ctx: {
      prisma: ctx.prisma,
      session: { ...ctx.session, user: ctx.session.user },
      companyId,
      role: role as Role,
    },
  });
});

const enforceRole = (allowedRoles: Role[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const { companyId, role } = ctx.session.user;
    if (!companyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No company assigned." });
    }
    if (!role || !allowedRoles.includes(role as Role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}.`,
      });
    }
    return next({
      ctx: {
        prisma: ctx.prisma,
        session: { ...ctx.session, user: ctx.session.user },
        companyId,
        role: role as Role,
      },
    });
  });

// ============================================================
// PROCEDURE BUILDERS
// ============================================================

/** Public — no auth required */
export const publicProcedure = t.procedure;

/** Authenticated — any logged-in user */
export const protectedProcedure = t.procedure.use(enforceAuth);

/** Company-scoped — authenticated + must have a companyId */
export const companyProcedure = t.procedure.use(enforceCompany);

/** Admin only */
export const adminProcedure = t.procedure.use(enforceRole(["ADMIN"]));

/** Admin or Manager */
export const managerProcedure = t.procedure.use(
  enforceRole(["ADMIN", "MANAGER"]),
);

/** All roles (Admin, Manager, Operator) but still company-scoped */
export const operatorProcedure = t.procedure.use(
  enforceRole(["ADMIN", "MANAGER", "OPERATOR"]),
);