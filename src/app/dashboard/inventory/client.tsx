"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Package,
  Plus,
  Box,
  MapPin,
  Barcode,
  Loader2,
  ArrowRight,
  MoveRight,
} from "lucide-react";

// ─── Add Stock Dialog ───────────────────────────────────────────
const stockSchema = z.object({
  itemId: z.string().cuid({ message: "Select an item." }),
  zoneId: z.string().cuid({ message: "Select a zone." }),
  quantity: z
    .number({ invalid_type_error: "Enter a quantity." })
    .int()
    .min(0, "Quantity cannot be negative."),
});

type StockFormValues = z.infer<typeof stockSchema>;

function AddStockModal({
  onClose,
  onSuccess,
  defaultZoneId,
  defaultItemId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  defaultZoneId?: string;
  defaultItemId?: string;
}) {
  const utils = api.useUtils();
  const { data: items } = api.item.list.useQuery({ page: 1, limit: 100 });
  const { data: zones } = api.zone.list.useQuery({ includeInactive: false });
  const upsertInventory = api.inventory.upsert.useMutation();

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      itemId: defaultItemId || "",
      zoneId: defaultZoneId || "",
      quantity: 0,
    },
  });

  const selectedItemId = form.watch("itemId");
  const selectedItem = items?.items.find((i) => i.id === selectedItemId);

  async function handleSaveStock(values: StockFormValues) {
    try {
      await upsertInventory.mutateAsync({
        itemId: values.itemId,
        zoneId: values.zoneId,
        quantity: values.quantity,
      });
      await utils.inventory.overview.invalidate();
      await utils.item.list.invalidate();
      onSuccess();
      onClose();
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to save stock. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-md border border-[var(--border-base)] bg-[var(--bg-elevated)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-logistics-cyan" />
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">Update Stock in Zone</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Item *
            </label>
            <select
              {...form.register("itemId")}
              disabled={!!defaultItemId}
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-cyan disabled:opacity-50"
            >
              <option value="">Select item...</option>
              {items?.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · SKU: {i.sku}
                </option>
              ))}
            </select>
            {form.formState.errors.itemId && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.itemId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Zone *
            </label>
            <select
              {...form.register("zoneId")}
              disabled={!!defaultZoneId}
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-cyan disabled:opacity-50"
            >
              <option value="">Select zone...</option>
              {zones?.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} · {z.type.replace("_", " ")}
                </option>
              ))}
            </select>
            {form.formState.errors.zoneId && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.zoneId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              New Total Quantity *
            </label>
            <div className="relative">
              <input
                type="number"
                {...form.register("quantity", { valueAsNumber: true })}
                className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-cyan"
              />
              {selectedItem && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {selectedItem.unit}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">This will overwrite the current stock count.</p>
            {form.formState.errors.quantity && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.quantity.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-[var(--border-base)] py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={form.handleSubmit(handleSaveStock)}
              disabled={upsertInventory.isPending}
              className="flex-1 rounded bg-logistics-cyan py-2 text-xs font-medium tracking-tight text-black transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {upsertInventory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Move Stock Dialog ──────────────────────────────────────────
const moveStockSchema = z.object({
  itemId: z.string().cuid(),
  fromZoneId: z.string().cuid(),
  toZoneId: z.string().cuid({ message: "Select destination zone." }),
  quantity: z
    .number({ invalid_type_error: "Enter a quantity." })
    .int()
    .min(1, "Quantity must be at least 1."),
  notes: z.string().optional(),
}).refine((data) => data.fromZoneId !== data.toZoneId, {
  message: "Destination cannot be the same as source.",
  path: ["toZoneId"],
});

type MoveStockFormValues = z.infer<typeof moveStockSchema>;

function MoveStockModal({
  onClose,
  onSuccess,
  itemId,
  fromZoneId,
  availableQty,
  itemName,
}: {
  onClose: () => void;
  onSuccess: () => void;
  itemId: string;
  fromZoneId: string;
  availableQty: number;
  itemName: string;
}) {
  const utils = api.useUtils();
  const { data: zones } = api.zone.list.useQuery({ includeInactive: false });
  const transferStock = api.inventory.transferStock.useMutation();

  const form = useForm<MoveStockFormValues>({
    resolver: zodResolver(moveStockSchema),
    defaultValues: {
      itemId,
      fromZoneId,
      toZoneId: "",
      quantity: 1,
      notes: "",
    },
  });

  async function handleMoveStock(values: MoveStockFormValues) {
    if (values.quantity > availableQty) {
      form.setError("quantity", { message: "Exceeds available stock." });
      return;
    }
    
    try {
      await transferStock.mutateAsync(values);
      await utils.inventory.overview.invalidate();
      await utils.item.list.invalidate();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to transfer stock. Please try again.");
    }
  }

  const destinationZones = zones?.filter(z => z.id !== fromZoneId) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-md border border-[var(--border-base)] bg-[var(--bg-elevated)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <MoveRight className="h-4 w-4 text-logistics-amber" />
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">Move Stock</h2>
        </div>

        <form onSubmit={form.handleSubmit(handleMoveStock)} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Item
            </label>
            <div className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground opacity-70">
              {itemName}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              To Zone *
            </label>
            <select
              {...form.register("toZoneId")}
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-amber"
            >
              <option value="">Select destination zone...</option>
              {destinationZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} · {z.type.replace("_", " ")}
                </option>
              ))}
            </select>
            {form.formState.errors.toZoneId && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.toZoneId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Quantity to Move *
            </label>
            <input
              type="number"
              {...form.register("quantity", { valueAsNumber: true })}
              max={availableQty}
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-amber"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Available in source zone: {availableQty}</p>
            {form.formState.errors.quantity && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.quantity.message}</p>
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Notes (Optional)
            </label>
            <input
              type="text"
              {...form.register("notes")}
              placeholder="Reason for transfer..."
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-amber"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-[var(--border-base)] py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferStock.isPending}
              className="flex-1 rounded bg-logistics-amber py-2 text-xs font-medium tracking-tight text-black transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {transferStock.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Confirm Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Register Item Dialog ─────────────────────────────────────────
const itemSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(100),
  sku: z.string().min(1, "Enter a SKU.").max(50),
  unit: z.string().min(1, "Enter a unit.").max(20),
});

type ItemFormValues = z.infer<typeof itemSchema>;

function RegisterItemModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const utils = api.useUtils();
  const createItem = api.item.create.useMutation();
  const [error, setError] = useState("");

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      sku: "",
      unit: "PCS",
    },
  });

  async function handleRegisterItem(values: ItemFormValues) {
    try {
      setError("");
      await createItem.mutateAsync({
        name: values.name,
        sku: values.sku,
        unit: values.unit,
      });
      await utils.item.list.invalidate();
      await utils.inventory.overview.invalidate();
      onSuccess();
      onClose();
      form.reset();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to register item. SKU may already exist.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-md border border-[var(--border-base)] bg-[var(--bg-elevated)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Barcode className="h-4 w-4 text-logistics-cyan" />
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">Register New Item Master</h2>
        </div>

        <form onSubmit={form.handleSubmit(handleRegisterItem)} className="flex flex-col gap-4">
          {error && (
            <div className="rounded bg-red-500/10 border border-red-500/25 p-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Item Name *
            </label>
            <input
              type="text"
              {...form.register("name")}
              placeholder="e.g. Cardboard Box Small"
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-cyan"
            />
            {form.formState.errors.name && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              SKU *
            </label>
            <input
              type="text"
              {...form.register("sku")}
              placeholder="e.g. SKU-BOX-SM"
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-cyan"
            />
            {form.formState.errors.sku && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-medium tracking-wider text-[var(--text-tertiary)]">
              Unit of Measure *
            </label>
            <input
              type="text"
              {...form.register("unit")}
              placeholder="e.g. PCS, BOX, KG"
              className="w-full rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] px-3 py-2 text-xs text-foreground focus:outline-none focus:border-logistics-cyan"
            />
            {form.formState.errors.unit && (
              <p className="text-[12px] text-red-400 mt-1">{form.formState.errors.unit.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-[var(--border-base)] py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createItem.isPending}
              className="flex-1 rounded bg-logistics-cyan py-2 text-xs font-medium tracking-tight text-black transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createItem.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Register Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main client component ───────────────────────────────────────
export function InventoryClient() {
  const [activeTab, setActiveTab] = useState<"MASTER" | "STOCK">("MASTER");
  const [stockDialogConfig, setStockDialogConfig] = useState<{ isOpen: boolean; defaultZoneId?: string; defaultItemId?: string }>({ isOpen: false });
  const [moveStockConfig, setMoveStockConfig] = useState<{ isOpen: boolean; itemId?: string; fromZoneId?: string; availableQty?: number; itemName?: string }>({ isOpen: false });
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  const { data: inventory, isLoading: loadingOverview } = api.inventory.overview.useQuery();

  // Process data for "Stock by Zone" tab
  const zonesWithStock = useMemo(() => {
    if (!inventory) return [];
    const zoneMap = new Map<string, { id: string; name: string; type: string; items: any[] }>();

    inventory.forEach((inv) => {
      inv.zones.forEach((z) => {
        if (!zoneMap.has(z.zone.id)) {
          zoneMap.set(z.zone.id, {
            id: z.zone.id,
            name: z.zone.name,
            type: z.zone.type,
            items: [],
          });
        }
        zoneMap.get(z.zone.id)!.items.push({
          item: inv.item,
          quantity: z.quantity,
        });
      });
    });

    return Array.from(zoneMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Page header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-logistics-cyan" />
          <div>
            <h1 className="text-[14px] font-medium tracking-tight text-foreground">Global Inventory</h1>
            <p className="text-[12px] tabular-nums text-[var(--text-tertiary)]">
              {inventory?.length ?? 0} registered SKUs
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setRegisterDialogOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[var(--border-base)] px-3 py-1.5 text-[12px] font-medium tracking-tight text-foreground transition hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Register New Item
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border px-5">
        <button
          onClick={() => setActiveTab("MASTER")}
          className={`py-3 text-xs font-medium border-b-2 transition ${
            activeTab === "MASTER"
              ? "border-logistics-cyan text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Item Master
        </button>
        <button
          onClick={() => setActiveTab("STOCK")}
          className={`py-3 text-xs font-medium border-b-2 transition ${
            activeTab === "STOCK"
              ? "border-logistics-cyan text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Stock by Zone
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto bg-background p-5">
        {activeTab === "MASTER" && (
          <div>
            {loadingOverview ? (
              <div className="flex h-full items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
              </div>
            ) : !inventory?.length ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border">
                <Box className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-[var(--text-tertiary)]">No items found in master catalog.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {inventory.map((inv) => (
                  <div key={inv.item.id} className="flex flex-col rounded-md border border-border bg-card overflow-hidden transition hover:border-border/80">
                    <div className="p-4 bg-accent/20 border-b border-border/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-[14px] font-semibold tracking-tight text-foreground">{inv.item.name}</h3>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                            <span>SKU: <span className="text-logistics-cyan">{inv.item.sku}</span></span>
                            <span>·</span>
                            <span>Unit: <span className="uppercase text-foreground">{inv.item.unit}</span></span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[16px] font-medium tabular-nums text-foreground leading-none">{inv.totalQuantity}</span>
                           <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Total Stock</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 text-[12px]">
                      <div className="mb-2 font-medium tracking-tight text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        Stored in {inv.zones.length} zone{inv.zones.length !== 1 ? 's' : ''}:
                      </div>
                      
                      {!inv.zones.length ? (
                        <div className="flex flex-col gap-3 mt-3">
                          <p className="text-[var(--text-tertiary)] italic">Not assigned to any zone yet</p>
                          <button
                            onClick={() => setStockDialogConfig({ isOpen: true, defaultItemId: inv.item.id })}
                            className="w-fit flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent/80 transition"
                          >
                            <Plus className="h-3 w-3" /> Add stock to zone
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {inv.zones.map((z, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-logistics-cyan/50" />
                                <span className="text-foreground">{z.zone.name}</span>
                              </div>
                              <span className="tabular-nums font-medium text-muted-foreground">
                                {z.quantity} {inv.item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "STOCK" && (
          <div>
            {loadingOverview ? (
              <div className="flex h-full items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
              </div>
            ) : !zonesWithStock.length ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border">
                <Box className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-[var(--text-tertiary)]">No stock allocated to any zones yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {zonesWithStock.map((zone) => (
                  <div key={zone.id} className="rounded-md border border-border bg-card overflow-hidden">
                    <div className="bg-accent/30 px-4 py-3 flex items-center justify-between border-b border-border/50">
                       <div className="flex items-center gap-2">
                         <MapPin className="h-4 w-4 text-logistics-cyan" />
                         <h3 className="font-medium text-[14px] text-foreground">{zone.name}</h3>
                         <span className="ml-2 rounded-full bg-background border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                           {zone.type.replace("_", " ")}
                         </span>
                       </div>
                       <button
                         onClick={() => setStockDialogConfig({ isOpen: true, defaultZoneId: zone.id })}
                         className="flex items-center gap-1.5 text-[11px] font-medium text-logistics-cyan hover:text-logistics-cyan/80 transition"
                       >
                         <Plus className="h-3 w-3" /> Add Item
                       </button>
                    </div>
                    <div className="p-0">
                       <table className="w-full text-left text-[12px]">
                         <thead className="bg-background/50 text-muted-foreground border-b border-border/50">
                           <tr>
                             <th className="px-4 py-2 font-medium">Item</th>
                             <th className="px-4 py-2 font-medium">SKU</th>
                             <th className="px-4 py-2 font-medium text-right">Quantity</th>
                             <th className="px-4 py-2 font-medium text-right w-24">Action</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-border/30">
                           {zone.items.map((invItem) => (
                             <tr key={invItem.item.id} className="hover:bg-accent/10 transition">
                               <td className="px-4 py-2.5 font-medium text-foreground">{invItem.item.name}</td>
                               <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{invItem.item.sku}</td>
                               <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                                 {invItem.quantity} <span className="text-[10px] text-muted-foreground ml-1">{invItem.item.unit}</span>
                               </td>
                               <td className="px-4 py-2.5 text-right flex items-center justify-end gap-3">
                                 <button
                                   onClick={() => setStockDialogConfig({ isOpen: true, defaultZoneId: zone.id, defaultItemId: invItem.item.id })}
                                   className="text-[11px] text-logistics-cyan hover:underline"
                                 >
                                   Update
                                 </button>
                                 <button
                                   onClick={() => setMoveStockConfig({ isOpen: true, itemId: invItem.item.id, fromZoneId: zone.id, availableQty: invItem.quantity, itemName: invItem.item.name })}
                                   className="text-[11px] text-logistics-amber hover:underline"
                                 >
                                   Move
                                 </button>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {stockDialogConfig.isOpen && (
        <AddStockModal 
          onClose={() => setStockDialogConfig({ isOpen: false })} 
          onSuccess={() => {}} 
          defaultZoneId={stockDialogConfig.defaultZoneId}
          defaultItemId={stockDialogConfig.defaultItemId}
        />
      )}
      {moveStockConfig.isOpen && moveStockConfig.itemId && moveStockConfig.fromZoneId && (
        <MoveStockModal
          onClose={() => setMoveStockConfig({ isOpen: false })}
          onSuccess={() => {}}
          itemId={moveStockConfig.itemId}
          fromZoneId={moveStockConfig.fromZoneId}
          availableQty={moveStockConfig.availableQty || 0}
          itemName={moveStockConfig.itemName || ""}
        />
      )}
      {registerDialogOpen && (
        <RegisterItemModal onClose={() => setRegisterDialogOpen(false)} onSuccess={() => {}} />
      )}
    </div>
  );
}
