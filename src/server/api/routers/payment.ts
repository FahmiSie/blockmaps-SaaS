import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { createMidtransTransaction } from "@/server/actions/payment.action";
import { coreApi } from "@/lib/midtrans";

export const paymentRouter = createTRPCRouter({
  // ── CREATE TRANSACTION ─────────────────────────────────
  createTransaction: adminProcedure
    .input(
      z.object({
        amount: z.number().min(1000),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Cek ada pending transaction yang belum selesai
      const existing = await ctx.prisma.transaction.findFirst({
        where: {
          company_id: ctx.companyId,
          status: "pending",
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ada transaksi pending yang belum diselesaikan.",
        });
      }

      const orderId = `ORDER-${ctx.companyId}-${Date.now()}`;

      const snapToken = await createMidtransTransaction({
        orderId,
        amount: input.amount,
        userId: ctx.session.user.id,
        description: input.description,
      });

      const transaction = await ctx.prisma.transaction.create({
        data: {
          user_id: ctx.session.user.id,
          company_id: ctx.companyId,
          order_id: orderId,
          amount: input.amount,
          description: input.description,
          status: "pending",
          snap_token: snapToken,
        },
      });

      return {
        snapToken,
        orderId,
        transactionId: transaction.id,
      };
    }),

  // ── GET PENDING TRANSACTIONS ───────────────────────────
  getPendingTransactions: adminProcedure.query(async ({ ctx }) => {
    const txs = await ctx.prisma.transaction.findMany({
      where: { company_id: ctx.companyId, status: "pending" },
      orderBy: { created_at: "desc" },
    });

    await Promise.all(
      txs.map(async (tx) => {
        try {
          const midtransStatus = await coreApi.transaction.status(tx.order_id);
          const realStatus = midtransStatus.transaction_status as string;

          if (realStatus !== "pending") {
            await ctx.prisma.transaction.update({
              where: { id: tx.id },
              data: {
                status: realStatus,
                payment_type: (midtransStatus.payment_type as string) ?? null,
              },
            });

            if (realStatus === "settlement" || realStatus === "capture") {
              await ctx.prisma.company.update({
                where: { id: tx.company_id },
                data: { status: "Active" },
              });
            }

            tx.status = realStatus;
          }
        } catch {
          // Order tidak ditemukan di Midtrans, biarkan pending
        }
      }),
    );

    return txs
      .filter((tx) => tx.status === "pending")
      .map((tx) => ({
        id: tx.id,
        orderId: tx.order_id,
        snapToken: tx.snap_token ?? "",
        amount: tx.amount,
        description: tx.description,
        createdAt: tx.created_at.toISOString(),
      }));
  }),

  // ── GET TRANSACTION HISTORY ────────────────────────────
  getTransactionHistory: adminProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12).optional(),
        year: z.number().min(2000).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let whereClause: any = { company_id: ctx.companyId };

      if (input?.month && input?.year) {
        // Find transactions within the given month/year
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 1);
        whereClause.created_at = {
          gte: startDate,
          lt: endDate,
        };
      }

      const txs = await ctx.prisma.transaction.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        take: input?.month ? undefined : 50, // if filtered by month, get all for that month
      });

      return txs.map((tx) => ({
        id: tx.id,
        orderId: tx.order_id,
        amount: tx.amount,
        status: tx.status,
        paymentType: tx.payment_type,
        description: tx.description,
        createdAt: tx.created_at.toISOString(),
      }));
    }),

  // ── GET TRANSACTION BY ID (For Invoice) ────────────────
  getTransactionById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findFirst({
        where: { id: input.id, company_id: ctx.companyId },
        include: {
          company: true,
        },
      });

      if (!tx) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
      }

      return {
        id: tx.id,
        orderId: tx.order_id,
        amount: tx.amount,
        status: tx.status,
        paymentType: tx.payment_type,
        description: tx.description,
        createdAt: tx.created_at.toISOString(),
        companyName: tx.company.name,
        companyId: tx.company.id,
      };
    }),

  // ── GET CURRENT PLAN ───────────────────────────────────
  getCurrentPlan: adminProcedure.query(async ({ ctx }) => {
    // Determine the current plan based on the most recent successful transaction.
    // TODO: Replace this transaction-based logic with a proper Subscription model in the future.
    const latestSuccessTx = await ctx.prisma.transaction.findFirst({
      where: {
        company_id: ctx.companyId,
        status: { in: ["settlement", "capture"] },
      },
      orderBy: { created_at: "desc" },
    });

    const activeZones = await ctx.prisma.zone.count({
      where: { companyId: ctx.companyId, isActive: true },
    });
    
    const activeUsers = await ctx.prisma.user.count({
      where: { companyId: ctx.companyId },
    });

    let plan = "Starter";
    let limits = { zones: 5, users: 2 };
    let renewalDate: Date | null = null;
    let periodStart: Date | null = null;

    if (latestSuccessTx) {
      if (latestSuccessTx.amount === 99000) {
        plan = "Growth";
        limits = { zones: 15, users: 5 };
      } else if (latestSuccessTx.amount === 249000) {
        plan = "Pro";
        limits = { zones: Infinity, users: Infinity }; // Unlimited
      } else {
        // Fallback for unexpected amounts, assume starter or past
      }

      periodStart = latestSuccessTx.created_at;
      renewalDate = new Date(latestSuccessTx.created_at);
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    // Determine if the current plan has expired
    const isExpired = renewalDate ? new Date() > renewalDate : false;
    
    if (isExpired && plan !== "Starter") {
       // Ideally we downgrade here, but for MVP we just mark it as expired or reset to Starter.
       // We'll return the original plan but flag it as expired.
    }

    return {
      plan: isExpired ? "Starter" : plan,
      status: isExpired ? "Expired" : "Active",
      limits,
      currentUsage: {
        zones: activeZones,
        users: activeUsers,
      },
      amountPaid: latestSuccessTx?.amount ?? 0,
      periodStart: periodStart ? periodStart.toISOString() : null,
      renewalDate: renewalDate ? renewalDate.toISOString() : null,
      latestOrderId: latestSuccessTx?.order_id,
    };
  }),



  // ── UPDATE STATUS (dipanggil dari frontend setelah Snap callback) ──
  updateTransactionStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUnique({
        where: { order_id: input.orderId },
      });

      if (!tx) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found.",
        });
      }

      if (tx.company_id !== ctx.session.user.companyId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Fetch the real, verified status from Midtrans Core API
      let realStatus = "pending";
      let paymentType: string | null = null;
      try {
        const midtransStatus = await coreApi.transaction.status(input.orderId);
        realStatus = midtransStatus.transaction_status as string;
        paymentType = (midtransStatus.payment_type as string) ?? null;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify transaction status with Midtrans.",
        });
      }

      await ctx.prisma.transaction.update({
        where: { order_id: input.orderId },
        data: {
          status: realStatus,
          payment_type: paymentType,
        },
      });

      // ── Aktivasi setelah settlement ──────────────────────
      if (realStatus === "settlement" || realStatus === "capture") {
        await ctx.prisma.company.update({
          where: { id: tx.company_id },
          data: { status: "Active" },
        });
      }

      return { ok: true, status: realStatus };
    }),

  // ── REFRESH SNAP TOKEN (jika token expired) ────────────
  refreshSnapToken: adminProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.transactionId,
          company_id: ctx.companyId,
          status: "pending",
        },
      });

      if (!tx) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found.",
        });
      }

      const newOrderId = `ORDER-${ctx.companyId}-${Date.now()}`;

      const snapToken = await createMidtransTransaction({
        orderId: newOrderId,
        amount: tx.amount,
        userId: ctx.session.user.id,
        description: tx.description ?? undefined,
      });

      await ctx.prisma.transaction.update({
        where: { id: tx.id },
        data: {
          snap_token: snapToken,
          order_id: newOrderId,
          status: "pending",
        },
      });

      return { snapToken, orderId: newOrderId };
    }),

  // ── DELETE PENDING TRANSACTION ─────────────────────────
  deleteTransaction: adminProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.transaction.deleteMany({
        where: {
          id: input.transactionId,
          company_id: ctx.companyId,
          status: "pending",
        },
      });
      return { ok: true };
    }),
});
