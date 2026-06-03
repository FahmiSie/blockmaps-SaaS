"use client";

import { useState } from "react";
import Script from "next/script";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  FileText,
  Download,
  Calendar,
  Building2,
  Users,
  Map,
  X
} from "lucide-react";
import Link from "next/link";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function BillingClient() {
  const utils = api.useUtils();
  const { data: company, isLoading: isLoadingCompany } = api.company.getCurrent.useQuery();
  const { data: planInfo, isLoading: isLoadingPlan } = api.payment.getCurrentPlan.useQuery();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const { data: history, isLoading: isLoadingHistory } = api.payment.getTransactionHistory.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });
  
  const { data: pendingTxs } = api.payment.getPendingTransactions.useQuery();

  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const createTxMutation = api.payment.createTransaction.useMutation({
    onSuccess: (data) => {
      if (window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: (result) => {
            toast.success("Payment completed successfully!");
            updateStatusMutation.mutate({ orderId: result.order_id });
          },
          onPending: (result) => {
            toast.info("Payment pending, please complete your transaction.");
            updateStatusMutation.mutate({ orderId: result.order_id });
          },
          onError: () => {
            toast.error("Payment failed. Please try again.");
            utils.payment.getTransactionHistory.invalidate();
            utils.payment.getPendingTransactions.invalidate();
          },
          onClose: () => {
            toast.warning("Payment checkout closed.");
            utils.payment.getTransactionHistory.invalidate();
            utils.payment.getPendingTransactions.invalidate();
          },
        });
      } else {
        toast.error("Midtrans Snap payment library not loaded. Please refresh the page.");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to initiate payment");
    },
  });

  const updateStatusMutation = api.payment.updateTransactionStatus.useMutation({
    onSuccess: (data) => {
      utils.company.getCurrent.invalidate();
      utils.payment.getTransactionHistory.invalidate();
      utils.payment.getPendingTransactions.invalidate();
      utils.payment.getCurrentPlan.invalidate();
      if (data.status === "settlement" || data.status === "capture") {
        toast.success("Workspace activated successfully!");
      }
    },
  });

  const handlePay = (amount: number, description: string) => {
    createTxMutation.mutate({ amount, description });
  };

  const handleResumePayment = (snapToken: string, _orderId: string) => {
    if (window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: (result) => {
          toast.success("Payment completed successfully!");
          updateStatusMutation.mutate({ orderId: result.order_id });
        },
        onPending: (result) => {
          toast.info("Payment pending.");
          updateStatusMutation.mutate({ orderId: result.order_id });
        },
        onError: () => {
          toast.error("Payment failed.");
          utils.payment.getTransactionHistory.invalidate();
          utils.payment.getPendingTransactions.invalidate();
        },
        onClose: () => {
          toast.warning("Payment checkout closed.");
          utils.payment.getTransactionHistory.invalidate();
          utils.payment.getPendingTransactions.invalidate();
        },
      });
    }
  };

  if (isLoadingCompany || isLoadingPlan) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--text-secondary)" }} />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-lg border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 text-center text-red-500">
        Company not found. Please log in again.
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={'SB-Mid-client-DD1Rl4vCEp_aAJxZ'}
        strategy="afterInteractive"
      />

      <div className="space-y-8">
        
        {/* ── Billing Overview ──────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Plan Card */}
          <div className="col-span-1 md:col-span-2 rounded-xl border p-6 flex flex-col justify-between"
               style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-base)" }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-1">Current Plan</p>
                <h3 className="text-3xl font-bold text-[var(--text-primary)]">{planInfo?.plan || "Starter"}</h3>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: planInfo?.status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: planInfo?.status === "Active" ? "var(--status-active)" : "var(--status-critical)",
                }}
              >
                {planInfo?.status === "Active" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {planInfo?.status}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[var(--border-base)] pt-6">
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Amount Paid</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {planInfo?.amountPaid ? `Rp ${planInfo.amountPaid.toLocaleString("id-ID")}` : "Free"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Next Renewal</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {planInfo?.renewalDate ? new Date(planInfo.renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Active Zones</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {planInfo?.currentUsage.zones} / {planInfo?.limits.zones === Infinity ? "Unlimited" : planInfo?.limits.zones}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1">Users</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {planInfo?.currentUsage.users} / {planInfo?.limits.users === Infinity ? "Unlimited" : planInfo?.limits.users}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats / Pending */}
          <div className="col-span-1 rounded-xl border p-6 flex flex-col justify-between"
               style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-base)" }}>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-4">Pending Payments</p>
              {pendingTxs && pendingTxs.length > 0 ? (
                <div className="space-y-3">
                  {pendingTxs.slice(0, 2).map((tx) => (
                    <div key={tx.id} className="rounded-lg border border-[rgba(245,158,11,0.2)] bg-[var(--bg-surface)] p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Rp {tx.amount.toLocaleString("id-ID")}</span>
                        <span className="text-[10px] flex items-center gap-1 text-[var(--logistics-amber)] font-medium">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{tx.description}</p>
                      <button
                        onClick={() => handleResumePayment(tx.snapToken, tx.orderId)}
                        className="mt-2 w-full rounded py-1.5 text-[10px] font-semibold bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90 transition-opacity"
                      >
                        Complete Payment
                      </button>
                    </div>
                  ))}
                  {pendingTxs.length > 2 && (
                    <p className="text-xs text-center text-[var(--text-muted)]">+{pendingTxs.length - 2} more</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 text-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mb-2 opacity-50" />
                  <p className="text-xs text-[var(--text-muted)]">All caught up! No pending payments.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Monthly Billing Filter & Invoice History ──────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
              <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Invoice History
              </h4>
            </div>
            
            <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-md px-3 py-1.5">
              <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none cursor-pointer ml-1 pl-1 border-l border-[var(--border-base)]"
              >
                {[currentDate.getFullYear() - 1, currentDate.getFullYear()].map(y => (
                  <option key={y} value={y} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-[var(--bg-surface)] border-[var(--border-base)] shadow-sm">
            {isLoadingHistory ? (
              <div className="p-8 text-center text-[var(--text-secondary)] flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b text-[11px] font-semibold uppercase tracking-wider border-[var(--border-base)] text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                    <th className="px-6 py-4 font-medium">Invoice Number</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Plan</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-base)]">
                  {(!history || history.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                          <FileText className="h-8 w-8 mb-3 opacity-20" />
                          <p>No invoices found for this month.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    history.map((tx) => {
                      const isSettled = tx.status === "settlement" || tx.status === "capture";
                      const isPending = tx.status === "pending";
                      const txDate = new Date(tx.createdAt);
                      
                      const monthYearStr = txDate.toLocaleString("default", { year: "numeric", month: "2-digit" });
                      const invoiceNumber = `INV-BM-${monthYearStr}-${tx.id.slice(-6).toUpperCase()}`;
                      
                      let planName = "Starter";
                      if (tx.amount === 99000) planName = "Growth";
                      if (tx.amount === 249000) planName = "Pro";

                      return (
                        <tr key={tx.id} className="transition-colors hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)]">
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] font-medium text-[var(--text-primary)]">
                            {invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {txDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {planName}
                          </td>
                          <td className="px-6 py-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                            Rp {tx.amount.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border"
                              style={{
                                backgroundColor: isSettled ? "rgba(34,197,94,0.05)" : isPending ? "rgba(245,158,11,0.05)" : "rgba(239,68,68,0.05)",
                                color: isSettled ? "var(--status-active)" : isPending ? "var(--status-warning)" : "var(--status-critical)",
                                borderColor: isSettled ? "rgba(34,197,94,0.2)" : isPending ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
                              }}
                            >
                              {isSettled ? "PAID" : tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap space-x-3">
                            <button 
                              onClick={() => setSelectedInvoice({ ...tx, invoiceNumber, planName, txDate })}
                              className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors"
                            >
                              View
                            </button>
                            <Link 
                              href={`/invoice/${tx.id}`}
                              target="_blank"
                              className="text-xs font-medium text-[var(--text-primary)] hover:opacity-75 transition-colors inline-flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Upgrade Plan Cards ────────────────────────────── */}
        <div className="pt-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Upgrade Your Workspace</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Unlock advanced warehouse features and increase your limits securely via Midtrans checkout.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            {/* Growth Tier */}
            <div className="rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 sm:p-8 flex flex-col justify-between hover:border-[var(--logistics-cyan)] transition-colors group">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-overlay)] px-3 py-1 text-[11px] font-semibold tracking-wider text-[var(--text-primary)] uppercase">
                  <Building2 className="h-3.5 w-3.5 text-[var(--logistics-cyan)]" /> Growth
                </div>
                <div className="flex items-baseline text-4xl font-bold text-[var(--text-primary)]">
                  Rp 99k
                  <span className="text-sm font-medium text-[var(--text-muted)] ml-1">/ mo</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Standard warehouse management capacities for growing businesses.</p>
                <ul className="space-y-3 pt-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-[var(--status-active)]" /> Up to 15 active zones</li>
                  <li className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-[var(--status-active)]" /> Up to 5 users</li>
                  <li className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-[var(--status-active)]" /> Basic routing & analytics</li>
                </ul>
              </div>
              <button
                onClick={() => handlePay(99000, "BlockMaps Growth Plan")}
                disabled={createTxMutation.isPending}
                className="mt-8 w-full rounded-md bg-[var(--text-primary)] py-3 text-sm font-semibold text-[var(--bg-base)] transition-all hover:opacity-90"
              >
                {createTxMutation.isPending ? "Starting checkout..." : "Upgrade to Growth"}
              </button>
            </div>

            {/* Pro Tier */}
            <div className="relative overflow-hidden rounded-xl border border-[rgba(245,158,11,0.5)] bg-[var(--bg-surface)] p-6 sm:p-8 flex flex-col justify-between shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all group">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                Most Popular
              </div>
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(245,158,11,0.1)] px-3 py-1 text-[11px] font-semibold tracking-wider text-[var(--logistics-amber)] uppercase">
                  <Users className="h-3.5 w-3.5" /> Enterprise Pro
                </div>
                <div className="flex items-baseline text-4xl font-bold text-[var(--text-primary)]">
                  Rp 249k
                  <span className="text-sm font-medium text-[var(--text-muted)] ml-1">/ mo</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Full professional dashboard features and unlimited scale.</p>
                <ul className="space-y-3 pt-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-[var(--logistics-amber)]" /> Unlimited active zones</li>
                  <li className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-[var(--logistics-amber)]" /> Unlimited users</li>
                  <li className="flex items-center gap-2.5"><CheckCircle className="h-4 w-4 text-[var(--logistics-amber)]" /> Priority live support</li>
                </ul>
              </div>
              <button
                onClick={() => handlePay(249000, "BlockMaps Pro Plan")}
                disabled={createTxMutation.isPending}
                className="mt-8 w-full rounded-md bg-[var(--logistics-amber)] py-3 text-sm font-semibold text-white transition-all hover:bg-amber-600"
              >
                {createTxMutation.isPending ? "Starting checkout..." : "Upgrade to Pro"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Invoice Detail Modal ──────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--border-base)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-base)] bg-[var(--bg-subtle)] px-6 py-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Invoice Detail</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Invoice Number</p>
                  <p className="font-mono text-sm font-medium text-[var(--text-primary)] mt-1">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Date</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                    {selectedInvoice.txDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-base)] p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--border-base)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-overlay)] text-[var(--text-primary)]">
                      <Map className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{selectedInvoice.planName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{selectedInvoice.description || "Workspace Activation"}</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg text-[var(--text-primary)]">Rp {selectedInvoice.amount.toLocaleString("id-ID")}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">Status</p>
                    <p className={`font-semibold ${(selectedInvoice.status === "settlement" || selectedInvoice.status === "capture") ? "text-[var(--status-active)]" : "text-[var(--status-warning)]"}`}>
                      {(selectedInvoice.status === "settlement" || selectedInvoice.status === "capture") ? "PAID" : selectedInvoice.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">Payment Method</p>
                    <p className="font-medium text-[var(--text-primary)] uppercase">{selectedInvoice.paymentType?.replace(/_/g, " ") || "MIDTRANS"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">Order Ref ID</p>
                    <p className="font-mono text-xs text-[var(--text-primary)]">{selectedInvoice.orderId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[var(--border-base)] bg-[var(--bg-subtle)] p-4 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
              >
                Close
              </button>
              <Link
                href={`/invoice/${selectedInvoice.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" /> Download PDF
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
