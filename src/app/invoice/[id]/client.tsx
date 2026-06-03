"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { Loader2, Printer, ArrowLeft, Map } from "lucide-react";
import Link from "next/link";

export default function InvoiceClient({ transactionId }: { transactionId: string }) {
  const { data: tx, isLoading, error } = api.payment.getTransactionById.useQuery({ id: transactionId });
  const [printDate, setPrintDate] = useState<Date | null>(null);

  useEffect(() => {
    // Set the print date to when the invoice is actually generated/viewed by the user
    setPrintDate(new Date());
  }, []);

  if (isLoading || !printDate) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center text-red-500">
        <p className="mb-4">Invoice could not be loaded.</p>
        <Link href="/dashboard/billing" className="text-blue-500 hover:underline">
          Return to Billing
        </Link>
      </div>
    );
  }

  const txDate = new Date(tx.createdAt); // Date of the transaction
  const periodStart = txDate;
  const periodEnd = new Date(txDate);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Generate invoice number based on the transaction month/year to remain consistent
  const monthYearStr = txDate.toLocaleString("default", { year: "numeric", month: "2-digit" });
  const invoiceNumber = `INV-BM-${monthYearStr}-${tx.id.slice(-6).toUpperCase()}`;

  let planName = "Starter Plan";
  if (tx.amount === 99000) planName = "Growth Plan";
  if (tx.amount === 249000) planName = "Pro Plan";

  const isPaid = tx.status === "settlement" || tx.status === "capture";
  const statusColor = isPaid ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50";
  const statusText = isPaid ? "PAID" : tx.status.toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-8 text-zinc-900 font-sans">
      {/* ── Print Actions (Hidden when printing) ── */}
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 border border-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          <Printer className="h-4 w-4" />
          Print / Export PDF
        </button>
      </div>

      {/* ── Invoice Paper ── */}
      <div className="mx-auto max-w-3xl overflow-hidden rounded-lg bg-white p-8 shadow-sm print:shadow-none print:p-0 border border-zinc-200 print:border-none">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Map className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BlockMaps</h1>
              <p className="text-sm text-zinc-500">Warehouse Intelligence</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-2xl font-light text-zinc-400">INVOICE</h2>
            <p className="font-mono text-sm font-medium text-zinc-900">{invoiceNumber}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase mb-2">Billed To</h3>
            <p className="text-base font-semibold text-zinc-900">{tx.companyName}</p>
            <p className="text-sm text-zinc-500 mt-1 font-mono">ID: {tx.companyId.slice(0, 8)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-right">
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Date</h3>
              <p className="font-medium text-zinc-900 mt-1">
                {printDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Status</h3>
              <div className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor}`}>
                {statusText}
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-12">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="pb-3 font-medium uppercase tracking-wider text-xs">Description</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-xs text-right">Period</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-xs text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr>
                <td className="py-4">
                  <p className="font-medium text-zinc-900">{planName}</p>
                  <p className="text-zinc-500 mt-0.5 text-xs">{tx.description || "Workspace Activation"}</p>
                </td>
                <td className="py-4 text-right text-zinc-500">
                  {periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" - "}
                  {periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="py-4 text-right font-medium text-zinc-900">
                  Rp {tx.amount.toLocaleString("id-ID")}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-6 text-right text-sm font-semibold text-zinc-900">
                  Total
                </td>
                <td className="pt-6 text-right text-lg font-bold text-zinc-900">
                  Rp {tx.amount.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="mt-16 border-t border-zinc-100 pt-8 text-sm text-zinc-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-zinc-900 mb-1">Payment Details</p>
              <p>Method: {tx.paymentType?.replace(/_/g, " ").toUpperCase() || "MIDTRANS"}</p>
              <p>Order Ref: <span className="font-mono">{tx.orderId}</span></p>
            </div>
            <div className="text-left sm:text-right">
              <p>If you have any questions about this invoice, please contact</p>
              <p className="font-medium text-zinc-900">billing@blockmaps.com</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
