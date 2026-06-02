import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import {
  createMidtransTransaction,
  coreApi,
} from "@/server/actions/payment.action";

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

            if (
              realStatus === "expire" ||
              realStatus === "cancel" ||
              realStatus === "deny" ||
              realStatus === "failure"
            ) {
              await ctx.prisma.company.update({
                where: { id: tx.company_id },
                data: { status: "Delete" },
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
  getTransactionHistory: adminProcedure.query(async ({ ctx }) => {
    const txs = await ctx.prisma.transaction.findMany({
      where: { company_id: ctx.companyId },
      orderBy: { created_at: "desc" },
      take: 50,
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

  // ── UPDATE STATUS (dipanggil dari frontend setelah Snap callback) ──
  updateTransactionStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        status: z.string(),
        paymentType: z.string().nullable(),
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

      await ctx.prisma.transaction.update({
        where: { order_id: input.orderId },
        data: {
          status: input.status,
          payment_type: input.paymentType,
        },
      });

      // ── Aktivasi setelah settlement ──────────────────────
      if (input.status === "settlement" || input.status === "capture") {
        await ctx.prisma.company.update({
          where: { id: tx.company_id },
          data: { status: "Active" },
        });
      }

      // ── Nonaktifkan jika expire/cancel/fraud ─────────────
      if (
        input.status === "expire" ||
        input.status === "cancel" ||
        input.status === "deny" ||
        input.status === "failure"
      ) {
        await ctx.prisma.company.update({
          where: { id: tx.company_id },
          data: { status: "Delete" },
        });
      }

      return { ok: true };
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
