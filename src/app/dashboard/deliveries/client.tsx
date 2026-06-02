"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Truck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Settings2,
  Package,
  Play,
} from "lucide-react";
import {
  approveDeliveryAction,
  rejectDeliveryAction,
  startDeliveryAction,
  completeDeliveryAction,
  cancelDeliveryAction,
  createDeliveryRequestAction,
} from "@/server/actions/delivery.action";

type DeliveryStatus = "PENDING" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    COMPLETED: "bg-green-500/10 text-green-400 border-green-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    CANCELLED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium tracking-tight ${map[status] ?? map.PENDING}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Create Delivery Modal ───────────────────────────────────────
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

function CreateDeliveryModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: zones } = api.zone.list.useQuery({ includeInactive: false });

  const form = useForm({
    defaultValues: {
      fromZoneId: "",
      toZoneId: "",
      itemId: "",
      quantity: 1,
      priority: "NORMAL",
      notes: "",
    },
    mode: "onChange",
  });

  const fromZoneId = form.watch("fromZoneId");
  const toZoneId = form.watch("toZoneId");
  const itemId = form.watch("itemId");
  const quantity = form.watch("quantity");
  const notes = form.watch("notes");

  const { data: sourceInventory, isLoading: loadingInventory } = api.inventory.byZone.useQuery(
    { zoneId: fromZoneId },
    { enabled: !!fromZoneId }
  );

  const availableQty = sourceInventory?.find((i) => i.itemId === itemId)?.quantity ?? 0;
  const currentInv = sourceInventory?.find((i) => i.itemId === itemId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromZoneId || !toZoneId || !itemId || quantity < 1 || quantity > availableQty) return;
    setLoading(true);
    setError("");

    const result = await createDeliveryRequestAction({
      fromZoneId,
      toZoneId,
      notes: notes.trim() || undefined,
      items: [{ itemId, quantity }],
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    onSuccess();
    onClose();
  }

  const destinationZones = zones?.filter((z) => z.id !== fromZoneId) ?? [];

  const isValid = 
    fromZoneId && 
    toZoneId && 
    itemId && 
    quantity >= 1 && 
    quantity <= availableQty && 
    !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="mb-4 flex items-center gap-2">
          <Truck className="h-4 w-4 text-logistics-amber" />
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">Create Delivery Request</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              From Zone
            </label>
            <select
              {...form.register("fromZoneId")}
              onChange={(e) => {
                form.setValue("fromZoneId", e.target.value);
                form.setValue("itemId", "");
                form.setValue("quantity", 1);
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-logistics-amber focus:outline-none focus:ring-1 focus:ring-logistics-amber/40"
              required
            >
              <option value="">Select source zone...</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              To Zone
            </label>
            <select
              {...form.register("toZoneId")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-logistics-amber focus:outline-none focus:ring-1 focus:ring-logistics-amber/40"
              required
            >
              <option value="">Select destination zone...</option>
              {destinationZones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Item
            </label>
            <select
              {...form.register("itemId")}
              disabled={!fromZoneId || loadingInventory || !sourceInventory?.length}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-logistics-amber focus:outline-none disabled:opacity-50"
              required
            >
              <option value="">{loadingInventory ? "Loading items..." : "Select item..."}</option>
              {sourceInventory?.map((inv) => (
                <option key={inv.itemId} value={inv.itemId}>
                  {inv.item.name} ({inv.item.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Quantity
            </label>
            <input
              type="number"
              {...form.register("quantity", { valueAsNumber: true })}
              disabled={!itemId}
              min={1}
              max={availableQty}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-logistics-amber focus:outline-none disabled:opacity-50"
              required
            />
            {itemId && (
              <p className={`text-[10px] mt-0.5 ${quantity > availableQty ? "text-red-500" : "text-muted-foreground/80"}`}>
                Available: {availableQty} {currentInv?.item.unit}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Priority
            </label>
            <select
              {...form.register("priority")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-logistics-amber focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Notes (Optional)
            </label>
            <textarea
              {...form.register("notes")}
              placeholder="e.g. Handle with care..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-logistics-amber focus:outline-none h-16 resize-none"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-[11px] text-destructive shrink-0">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2 border-t border-border shrink-0 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="flex-1 rounded-md bg-logistics-amber py-2 text-xs font-medium tracking-tight text-black transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function DeliveriesClient({ user }: { user: { id: string; role: string } }) {
  const utils = api.useUtils();
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "ALL">("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = api.delivery.list.useQuery({
    page: 1,
    limit: 50,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const { data: stats } = api.delivery.stats.useQuery();

  async function handleAction(id: string, action: "APPROVE" | "REJECT" | "START" | "COMPLETE" | "CANCEL") {
    setLoadingId(id);
    try {
      let res;
      if (action === "APPROVE") res = await approveDeliveryAction(id);
      if (action === "REJECT") res = await rejectDeliveryAction(id, "Rejected via dashboard");
      if (action === "START") res = await startDeliveryAction(id);
      if (action === "COMPLETE") res = await completeDeliveryAction(id);
      if (action === "CANCEL") res = await cancelDeliveryAction(id);
      
      if (res && !res.success) {
        alert(res.error);
      } else {
        void utils.delivery.list.invalidate();
        void utils.delivery.stats.invalidate();
        void utils.company.dashboardSummary.invalidate();
        void utils.inventory.overview.invalidate();
        void utils.item.list.invalidate();
        void utils.zone.list.invalidate();
        void utils.zone.floorPlan.invalidate();
      }
    } catch (err: any) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setLoadingId(null);
    }
  }

  const isManager = ["ADMIN", "MANAGER"].includes(user.role);

  function refresh() {
    void utils.delivery.list.invalidate();
    void utils.delivery.stats.invalidate();
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Truck className="h-4 w-4 text-logistics-amber" />
          <div>
            <h1 className="text-[14px] font-medium tracking-tight text-foreground">Delivery Operations</h1>
            <p className="text-[12px] tracking-tight text-muted-foreground/80">
              Internal routing & transfer management
            </p>
          </div>
        </div>
 
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-md bg-logistics-amber px-3 py-1.5 text-[12px] font-medium tracking-tight text-black transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex shrink-0 gap-2 border-b border-border bg-background px-5 py-2">
        {(["ALL", "PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-sm px-3 py-1.5 text-[12px] font-medium tracking-tight transition ${
              statusFilter === s
                ? "bg-accent text-foreground shadow-[inset_2px_0_0_0_theme(colors.foreground)]"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            {s.replace("_", " ")}
            {s !== "ALL" && stats?.byStatus[s] ? (
              <span className="ml-1.5 rounded bg-background px-1.5 py-0.5 text-[9px] tabular-nums">
                {stats.byStatus[s]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto bg-background p-5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-3 text-center">
              <Settings2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Loading operations…</p>
            </div>
          </div>
        ) : !data?.requests.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border">
            <Truck className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No delivery requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                {/* Top Row: Route + Status */}
                <div className="flex items-start justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                      {req.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-5 w-5 text-logistics-green" />
                      ) : req.status === "REJECTED" ? (
                        <AlertCircle className="h-5 w-5 text-logistics-red" />
                      ) : req.status === "IN_PROGRESS" ? (
                        <Truck className="h-5 w-5 text-logistics-cyan animate-pulse" />
                      ) : (
                        <Clock className="h-5 w-5 text-logistics-amber" />
                      )}
                    </div>

                    {/* Routing */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="rounded bg-accent px-2 py-0.5 text-foreground">
                          {req.fromZone.name}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="rounded bg-accent px-2 py-0.5 text-foreground">
                          {req.toZone.name}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] tracking-tight text-muted-foreground">
                        Requested by <span className="font-medium text-foreground">{req.requestedBy.name}</span> on{" "}
                        <span className="tabular-nums">{new Date(req.createdAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={req.status} />
                  </div>
                </div>

                {/* Bottom Row: Items + Actions */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-4 text-[12px] font-medium tracking-tight">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      <span>{req.items.length} item types</span>
                    </div>
                    <div className="flex gap-2 text-[11px]">
                      {req.items.slice(0, 3).map((i) => (
                        <span key={i.itemId} className="rounded-sm bg-accent/50 px-1.5 py-0.5 tabular-nums text-foreground">
                          {i.quantity}× {i.item.name}
                        </span>
                      ))}
                      {req.items.length > 3 && (
                        <span className="text-muted-foreground">+{req.items.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  {/* Operational Actions */}
                  <div className="flex items-center gap-2">
                    {loadingId === req.id && (
                      <span className="text-[11px] tracking-tight text-muted-foreground animate-pulse mr-2">
                        Processing...
                      </span>
                    )}

                    {req.status === "PENDING" && isManager && (
                      <>
                        <button
                          onClick={() => handleAction(req.id, "REJECT")}
                          disabled={loadingId === req.id}
                          className="rounded-sm border border-logistics-red/30 px-3 py-1.5 text-[11px] font-medium tracking-tight text-logistics-red transition hover:bg-logistics-red/10"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "APPROVE")}
                          disabled={loadingId === req.id}
                          className="rounded-sm border border-logistics-cyan/30 px-3 py-1.5 text-[11px] font-medium tracking-tight text-logistics-cyan transition hover:bg-logistics-cyan/10"
                        >
                          Approve
                        </button>
                      </>
                    )}

                    {req.status === "PENDING" && req.requestedBy.id === user.id && (
                      <button
                        onClick={() => handleAction(req.id, "CANCEL")}
                        disabled={loadingId === req.id}
                        className="rounded-sm border border-destructive/30 px-3 py-1.5 text-[11px] font-medium tracking-tight text-destructive transition hover:bg-destructive/10"
                      >
                        Cancel Request
                      </button>
                    )}

                    {req.status === "APPROVED" && (
                      <button
                        onClick={() => handleAction(req.id, "START")}
                        disabled={loadingId === req.id}
                        className="flex items-center gap-1.5 rounded-sm bg-logistics-cyan/20 px-3 py-1.5 text-[11px] font-medium tracking-tight text-logistics-cyan transition hover:bg-logistics-cyan/30"
                      >
                        <Play className="h-3 w-3" /> Start Delivery
                      </button>
                    )}

                    {req.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => handleAction(req.id, "COMPLETE")}
                        disabled={loadingId === req.id}
                        className="flex items-center gap-1.5 rounded-sm bg-logistics-green/20 px-3 py-1.5 text-[11px] font-medium tracking-tight text-logistics-green transition hover:bg-logistics-green/30"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDeliveryModal onClose={() => setShowCreate(false)} onSuccess={refresh} />
      )}
    </div>
  );
}
