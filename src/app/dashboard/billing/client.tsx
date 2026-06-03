"use client";

import { useState } from "react";
import Script from "next/script";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { History, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";


export default function BillingClient() {
  const utils = api.useUtils();
  const { data: company, isLoading: isLoadingCompany } = api.company.getCurrent.useQuery();
  const { data: history, isLoading: isLoadingHistory } = api.payment.getTransactionHistory.useQuery();
  const { data: pendingTxs, isLoading: isLoadingPending } = api.payment.getPendingTransactions.useQuery();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  if (isLoadingCompany || isLoadingHistory || isLoadingPending) {
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
        {/* Company Status overview */}
        <div
          className="rounded-xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-base)",
          }}
        >
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Workspace Status
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Manage payment and checkout settings for <span className="font-semibold text-[var(--text-primary)]">{company.name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium uppercase tracking-wider"
              style={{
                backgroundColor: company.status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color: company.status === "Active" ? "var(--status-active)" : "var(--status-critical)",
                border: `1px solid ${company.status === "Active" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              {company.status === "Active" ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Active Workspace
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Suspended / Pending
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pending Transactions Section */}
        {pendingTxs && pendingTxs.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Pending Payments
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              {pendingTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border p-4 flex flex-col justify-between gap-4"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "rgba(245,158,11,0.2)",
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[var(--text-secondary)]">{tx.orderId}</span>
                      <span className="text-xs text-[var(--logistics-amber)] font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {tx.description ?? "Workspace Activation"}
                    </p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      Rp {tx.amount.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResumePayment(tx.snapToken, tx.orderId)}
                    className="w-full rounded-md py-2 text-xs font-semibold transition-all hover:opacity-90"
                    style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-base)" }}
                  >
                    Continue To The Payment
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Tiers / Pay Options */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Available Workspace Tiers
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Upgrade or refresh your workspace options using secure Midtrans checkout.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Growth Tier */}
            <div
              className="rounded-xl border p-6 flex flex-col justify-between gap-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-base)",
              }}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-[var(--text-primary)]">Growth Access</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Unlock standard warehouse management capacities</p>
                </div>
                <div className="flex items-baseline text-2xl font-bold text-[var(--text-primary)]">
                  Rp 99.000
                  <span className="text-xs font-medium text-[var(--text-muted)] ml-1">/ activation</span>
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">✓ Up to 15 active warehouse zones</li>
                  <li className="flex items-center gap-2">✓ Full inventory management workflows</li>
                  <li className="flex items-center gap-2">✓ Delivery requests routing</li>
                </ul>
              </div>
              <button
                onClick={() => handlePay(99000, "BlockMaps Growth Access")}
                disabled={createTxMutation.isPending}
                className="w-full rounded-md py-2.5 text-xs font-semibold transition-all hover:bg-[var(--bg-overlay)]"
                style={{
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-primary)",
                  backgroundColor: "transparent",
                }}
              >
                {createTxMutation.isPending ? "Starting checkout..." : "Activate Growth Access"}
              </button>
            </div>

            {/* Pro Tier */}
            <div
              className="rounded-xl border p-6 flex flex-col justify-between gap-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-base)",
              }}
            >
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-[var(--text-primary)]">Pro Enterprise Access</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Full professional dashboard features</p>
                </div>
                <div className="flex items-baseline text-2xl font-bold text-[var(--text-primary)]">
                  Rp 249.000
                  <span className="text-xs font-medium text-[var(--text-muted)] ml-1">/ activation</span>
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">✓ Unlimited active warehouse zones</li>
                  <li className="flex items-center gap-2">✓ Priority live support options</li>
                  <li className="flex items-center gap-2">✓ Custom dashboard analytics & reporting</li>
                </ul>
              </div>
              <button
                onClick={() => handlePay(249000, "BlockMaps Pro Access")}
                disabled={createTxMutation.isPending}
                className="w-full rounded-md py-2.5 text-xs font-semibold transition-all hover:bg-[var(--bg-overlay)]"
                style={{
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-primary)",
                  backgroundColor: "transparent",
                }}
              >
                {createTxMutation.isPending ? "Starting checkout..." : "Activate Pro Access"}
              </button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--text-secondary)]" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Payment Transaction History
            </h4>
          </div>

          <div
            className="overflow-x-auto rounded-xl border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-base)",
            }}
          >
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr
                  className="border-b text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: "var(--border-base)",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-subtle)",
                  }}
                >
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Order ID</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-base)]">
                {(!history || history.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
                {(() => {
                  const totalItems = history?.length || 0;
                  const totalPages = Math.ceil(totalItems / itemsPerPage);
                  const paginatedHistory = history?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                  return paginatedHistory?.map((tx) => {
                  const isSettled = tx.status === "settlement" || tx.status === "capture";
                  const isPending = tx.status === "pending";

                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-[var(--bg-overlay)]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] whitespace-nowrap text-[var(--text-primary)]">
                        {tx.orderId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.description ?? "Workspace Activation"}
                      </td>
                      <td className="px-6 py-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                        Rp {tx.amount.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            backgroundColor: isSettled
                              ? "rgba(34,197,94,0.1)"
                              : isPending
                              ? "rgba(245,158,11,0.1)"
                              : "rgba(239,68,68,0.1)",
                            color: isSettled
                              ? "var(--status-active)"
                              : isPending
                              ? "var(--status-warning)"
                              : "var(--status-critical)",
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {history && history.length > itemsPerPage && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-base)] bg-[var(--bg-subtle)]">
                <span className="text-xs text-[var(--text-secondary)]">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, history.length)} of {history.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-[var(--border-base)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil((history.length) / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil((history.length) / itemsPerPage)}
                    className="px-3 py-1.5 text-xs font-medium border border-[var(--border-base)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
