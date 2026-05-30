"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Package,
  Plus,
  Search,
  Settings2,
  Box,
  MapPin,
  Barcode,
  Layers,
} from "lucide-react";
import { createItemAction } from "@/server/actions/item.action";

// ─── Create item modal ───────────────────────────────────────────
function CreateItemModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !unit.trim()) return;
    setLoading(true);
    setError("");
    const result = await createItemAction({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      unit: unit.trim().toLowerCase(),
    });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-logistics-cyan" />
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">Register New Item</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Item Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engine Block V8"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-logistics-cyan focus:outline-none focus:ring-1 focus:ring-logistics-cyan/40"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
                SKU / Code
              </label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="ENG-V8-001"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs uppercase text-foreground placeholder:text-muted-foreground/50 focus:border-logistics-cyan focus:outline-none focus:ring-1 focus:ring-logistics-cyan/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
                Unit
              </label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, kg, box"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-logistics-cyan focus:outline-none focus:ring-1 focus:ring-logistics-cyan/40"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !sku.trim() || !unit.trim()}
              className="flex-1 rounded-md bg-logistics-cyan py-2 text-xs font-medium tracking-tight text-black transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Registering…" : "Register Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main client component ───────────────────────────────────────
export function InventoryClient() {
  const utils = api.useUtils();
  const { data: inventory, isLoading } = api.inventory.overview.useQuery();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  function refresh() {
    void utils.inventory.overview.invalidate();
  }

  const filtered = inventory?.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.item.name.toLowerCase().includes(q) ||
      i.item.sku.toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* ── Page header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-logistics-cyan" />
          <div>
            <h1 className="text-[14px] font-medium tracking-tight text-foreground">Global Inventory</h1>
            <p className="text-[12px] tabular-nums text-muted-foreground/80">
              {inventory?.length ?? 0} total registered SKUs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-64 rounded-md border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-logistics-cyan focus:outline-none focus:ring-1 focus:ring-logistics-cyan/30"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-logistics-cyan px-3 py-1.5 text-[12px] font-medium tracking-tight text-black transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Item
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-auto bg-background p-5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-3 text-center">
              <Settings2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Loading inventory…</p>
            </div>
          </div>
        ) : !filtered.length ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border">
            <Box className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No items found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((inv) => (
              <div
                key={inv.item.id}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-border/80 hover:shadow-md"
              >
                {/* Header: Item Info */}
                <div className="flex items-start justify-between border-b border-border bg-accent/20 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Barcode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-[10px] font-semibold text-logistics-cyan">
                        {inv.item.sku}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-[13px] font-medium tracking-tight text-foreground">
                      {inv.item.name}
                    </h3>
                  </div>
                  <div className="ml-4 flex shrink-0 flex-col items-end">
                    <span className="text-[16px] font-medium tabular-nums text-foreground leading-none">
                      {inv.totalQuantity}
                    </span>
                    <span className="text-[11px] font-medium tracking-tight text-muted-foreground/80">
                      {inv.item.unit} Total
                    </span>
                  </div>
                </div>

                {/* Body: Zone distribution */}
                <div className="flex-1 p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium tracking-tight text-muted-foreground/80">
                      Stock Locations
                    </span>
                  </div>

                  {!inv.zones.length ? (
                    <p className="text-xs text-muted-foreground/60 italic">
                      No stock available in any zone.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {inv.zones.map((z, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded bg-accent/50 px-2.5 py-1.5 text-xs">
                          <span className="truncate pr-2 font-medium text-foreground">
                            {z.zone.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
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

      {showCreate && (
        <CreateItemModal onClose={() => setShowCreate(false)} onSuccess={refresh} />
      )}
    </div>
  );
}
