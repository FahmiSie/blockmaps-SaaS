"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { api } from "@/trpc/react";
import {
  Map,
  Plus,
  Grid3X3,
  List,
  ChevronRight,
  Settings2,
  Trash2,
  Pencil,
  Save,
  Route,
  Navigation,
  Footprints,
  Truck as Forklift,
  X,
} from "lucide-react";
import { createZoneAction, deleteZoneAction, updateZoneAction } from "@/server/actions/zone.action";
import { findMultiStopRoute, type MultiRouteResult, type Rect } from "@/lib/routing";
import { EmptyState } from "@/components/blockmaps/EmptyState";

// ─── Zone type config ────────────────────────────────────────────
const ZONE_TYPE_CONFIG = {
  RAW_MATERIAL:   { label: "Raw Material",   className: "zone-raw",     dot: "bg-amber-400" },
  PRODUCTION:     { label: "Production",     className: "zone-prod",    dot: "bg-cyan-400" },
  FINISHED_GOODS: { label: "Finished Goods", className: "zone-finish",  dot: "bg-green-400" },
  STORAGE:        { label: "Storage",        className: "zone-storage", dot: "bg-zinc-400" },
} as const;

type ZoneType = keyof typeof ZONE_TYPE_CONFIG;
type ViewMode = "map" | "list";

const GRID_SIZE = 32;
const CANVAS_PADDING = 32; // min gap from all canvas edges

export type LayoutZone = {
  rawX: number;
  rawY: number;
  renderX: number;
  renderY: number;
  renderW: number;
  renderH: number;
  hasCollision: boolean;
  zone: {
    id: string;
    name: string;
    type: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    isActive: boolean;
    inventory?: any[];
  };
};

// ─── Tactical map zone block ─────────────────────────────────────
function ZoneBlock({
  layoutZone,
  selected,
  isRouteStart,
  isRouteMiddle,
  isRouteEnd,
  isRoutePath,
  isDimmed,
  onClick,
  onPositionChange,
  onSizeChange,
}: {
  layoutZone: LayoutZone;
  selected: boolean;
  isRouteStart?: boolean;
  isRouteMiddle?: boolean;
  isRouteEnd?: boolean;
  isRoutePath?: boolean;
  isDimmed?: boolean;
  onClick: () => void;
  onPositionChange?: (id: string, dx: number, dy: number) => void;
  onSizeChange?: (id: string, dw: number, dh: number) => void;
}) {
  const { zone, renderX, renderY, renderW, renderH, hasCollision } = layoutZone;
  const cfg = ZONE_TYPE_CONFIG[zone.type as ZoneType] ?? ZONE_TYPE_CONFIG.STORAGE;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !onPositionChange) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    let startX = e.clientX;
    let startY = e.clientY;
    let moved = false;

    const onPointerMove = (ev: PointerEvent) => {
      moved = true;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onPositionChange(zone.id, dx, dy);
      startX = ev.clientX;
      startY = ev.clientY;
    };

    const onPointerUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      if (!moved) onClick();
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
  };

  const handleResizeDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !onSizeChange) return;
    e.stopPropagation(); // prevent triggering drag
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    let startX = e.clientX;
    let startY = e.clientY;

    const onPointerMove = (ev: PointerEvent) => {
      const dw = ev.clientX - startX;
      const dh = ev.clientY - startY;
      onSizeChange(zone.id, dw, dh);
      startX = ev.clientX;
      startY = ev.clientY;
    };

    const onPointerUp = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        left: renderX,
        top: renderY,
        width: renderW,
        height: renderH,
        cursor: "grab",
      }}
      className={`absolute flex flex-col justify-between overflow-hidden rounded border p-3 text-left transition-all duration-300 ${
        selected ? "z-20" : isRoutePath ? "z-20" : "z-10 hover:z-30"
      } ${
        hasCollision
          ? "border-destructive bg-destructive/10 ring-1 ring-destructive/30"
          : isRouteStart
          ? "border-logistics-green bg-logistics-green/10 ring-2 ring-logistics-green shadow-lg shadow-logistics-green/20"
          : isRouteEnd
          ? "border-logistics-amber bg-logistics-amber/10 ring-2 ring-logistics-amber shadow-lg shadow-logistics-amber/20"
          : isRouteMiddle
          ? "border-logistics-cyan bg-logistics-cyan/10 ring-2 ring-logistics-cyan shadow-lg shadow-logistics-cyan/20"
          : isRoutePath
          ? "border-logistics-cyan bg-logistics-cyan/5 ring-1 ring-logistics-cyan shadow-[0_0_15px_rgba(0,255,255,0.15)]"
          : !zone.isActive
          ? "border-border/20 bg-card/20 opacity-40"
          : isDimmed
          ? "border-border/40 bg-card/40 opacity-30 grayscale-[50%]"
          : selected
          ? "border-foreground bg-accent/30 shadow-md ring-1 ring-foreground/20"
          : "border-border bg-card hover:border-foreground/40 hover:bg-accent/40"
      }`}
    >
      {/* Visual scanning lines removed for spatial mapping */}

      {/* Type badge */}
      <div className={`inline-flex items-center gap-1.5 self-start rounded-sm px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-semibold ${cfg.className}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>

      {/* Zone name */}
      <div className="my-1 flex-1 min-h-0 overflow-hidden flex flex-col">
        <p className="truncate text-[13px] font-medium tracking-tight text-foreground shrink-0">{zone.name}</p>
        
        {/* Inventory Preview */}
        <div className="mt-1 space-y-1 overflow-hidden">
          {(!zone.inventory || zone.inventory.length === 0) ? (
            <p className="font-mono text-[9px] tracking-wider text-muted-foreground/60 uppercase truncate">No stock assigned</p>
          ) : (
            <>
              {zone.inventory.slice(0, 3).map((inv, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-mono">
                  <span className="truncate text-muted-foreground max-w-[100px]">{inv.item.name}</span>
                  <span className="text-foreground whitespace-nowrap">{inv.quantity} {inv.item.unit}</span>
                </div>
              ))}
              {zone.inventory.length > 3 && (
                <div className="text-[9px] text-logistics-cyan font-mono italic">
                  +{zone.inventory.length - 3} more items
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Coordinates / Telemetry footer */}
      <div className="mt-auto pt-1 flex items-center justify-between gap-1 font-mono text-[9px] text-muted-foreground/45 tabular-nums border-t border-border/40 shrink-0 overflow-hidden">
        <span className="truncate min-w-0">LOC: {renderX},{renderY}</span>
        <span className="truncate min-w-0 text-right">DIM: {renderW}x{renderH}</span>
      </div>

      {/* Resize Handle */}
      {onSizeChange && (
        <div
          onPointerDown={handleResizeDown}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize flex items-end justify-end p-0.5 opacity-50 hover:opacity-100"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground/60" />
        </div>
      )}
    </div>
  );
}

// ─── Create zone modal ───────────────────────────────────────────
function CreateZoneModal({
  existingZones,
  onClose,
  onSuccess,
}: {
  existingZones: LayoutZone[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ZoneType>("STORAGE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const baseName = name.trim();
    if (!baseName) return;
    setLoading(true);
    setError("");
    
    let finalName = baseName;
    let suffixCounter = 1;
    let isDuplicate = true;
    
    while (isDuplicate) {
      isDuplicate = existingZones.some(z => z.zone.name.toLowerCase() === finalName.toLowerCase() && z.zone.type === type);
      if (isDuplicate) {
        suffixCounter++;
        finalName = `${baseName}-${suffixCounter}`;
      }
    }

    const width = 224;
    const height = 160;
    const GRID_SIZE = 32;
    
    // Find first available slot scanning in a grid pattern
    let placedX = 64;
    let placedY = 64;
    let foundSpot = false;
    
    for (let y = 32; y < 2000 && !foundSpot; y += GRID_SIZE) {
      for (let x = 32; x < 2000 && !foundSpot; x += GRID_SIZE) {
        const hasOverlap = existingZones.some(z => {
          return x < z.renderX + z.renderW &&
                 x + width > z.renderX &&
                 y < z.renderY + z.renderH &&
                 y + height > z.renderY;
        });
        if (!hasOverlap) {
          placedX = x;
          placedY = y;
          foundSpot = true;
        }
      }
    }

    const result = await createZoneAction({
      name: finalName,
      type,
      positionX: placedX,
      positionY: placedY,
      width,
      height,
    });
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-2 border-b border-border/80 pb-3">
          <Map className="h-4 w-4 text-amber-500" />
          <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Create Storage Area</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Area Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alpha Sector, Finished Goods C"
              className="w-full rounded-md border border-[var(--border-base)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium tracking-tight text-muted-foreground/80">
              Area Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ZONE_TYPE_CONFIG) as [ZoneType, typeof ZONE_TYPE_CONFIG[ZoneType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-[12px] font-medium tracking-tight transition ${
                    type === key
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                      : "border-[var(--border-base)] text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-sm bg-destructive/10 border border-destructive/20 px-3 py-2 text-[11px] text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-3 border-t border-border mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md bg-zinc-800 py-2 text-[12px] font-medium text-white transition hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-md bg-amber-500 py-2 text-[12px] font-medium tracking-tight text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Area"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail panel ────────────────────────────────────────────────
function ZoneDetailPanel({
  zone,
  onClose,
  onRefresh,
  isAdmin,
}: {
  zone: {
    id: string;
    name: string;
    type: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    isActive: boolean;
    inventory?: any[];
  };
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(zone.name);
  const [newX, setNewX] = useState(zone.positionX.toString());
  const [newY, setNewY] = useState(zone.positionY.toString());
  const [newW, setNewW] = useState(zone.width.toString());
  const [newH, setNewH] = useState(zone.height.toString());
  const [loading, setLoading] = useState(false);
  const cfg = ZONE_TYPE_CONFIG[zone.type as ZoneType] ?? ZONE_TYPE_CONFIG.STORAGE;

  async function handleSave() {
    if (!newName.trim()) return;
    setLoading(true);
    await updateZoneAction({
      id: zone.id,
      name: newName.trim(),
      positionX: Number(newX) || 0,
      positionY: Number(newY) || 0,
      width: Number(newW) || 100,
      height: Number(newH) || 100,
    });
    setLoading(false);
    setEditing(false);
    onRefresh();
  }

  function handleCancel() {
    setNewName(zone.name);
    setNewX(zone.positionX.toString());
    setNewY(zone.positionY.toString());
    setNewW(zone.width.toString());
    setNewH(zone.height.toString());
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete zone "${zone.name}"? This cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteZoneAction(zone.id);
    setLoading(false);
    if (!result.success) {
      alert(result.error);
      return;
    }
    onClose();
    onRefresh();
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 z-50 flex w-[300px] shrink-0 flex-col border-l border-border bg-card/85 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background/40">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {editing && isAdmin ? "MODIFY METRICS" : "ZONE INSPECTOR"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Visual Cue of Physical Area */}
        <div className="rounded-sm border border-border bg-background/50 p-3 flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/60">SELECTED PHYSICAL AREA</span>
            <p className="truncate text-xs font-mono text-foreground font-semibold">{zone.id.substring(0, 12)}...</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/75">
            Zone Descriptor
          </p>
          {editing && isAdmin ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-logistics-cyan focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
              <p className="text-[15px] font-medium tracking-tight text-foreground">{zone.name}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/75">
            Domain Classification
          </p>
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ${cfg.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Position / Size */}
        <div className="space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/75">
            Spatial Dimensions
          </p>
          {editing && isAdmin ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Position X</label>
                  <input
                    type="number"
                    value={newX}
                    onChange={(e) => setNewX(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-logistics-cyan focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Position Y</label>
                  <input
                    type="number"
                    value={newY}
                    onChange={(e) => setNewY(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-logistics-cyan focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Width</label>
                  <input
                    type="number"
                    value={newW}
                    onChange={(e) => setNewW(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-logistics-cyan focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Height</label>
                  <input
                    type="number"
                    value={newH}
                    onChange={(e) => setNewH(e.target.value)}
                    className="w-full rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-logistics-cyan focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-sm border border-border bg-background/40 p-2.5 font-mono text-[8px] tabular-nums text-muted-foreground space-y-1.5">
              <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
                <span className="text-muted-foreground/50 tracking-widest">POS X/Y</span>
                <span className="font-semibold text-foreground text-[9px]">{zone.positionX.toFixed(0)}px / {zone.positionY.toFixed(0)}px</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground/50 tracking-widest">SIZE WxH</span>
                <span className="font-semibold text-foreground text-[9px]">{zone.width.toFixed(0)}px × {zone.height.toFixed(0)}px</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats segment */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Inventory count */}
          <div className="rounded-sm border border-border bg-background/30 p-3 flex flex-col justify-between">
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/70">INVENTORY SKU</span>
            <span className="mt-2 text-[18px] font-mono font-medium text-foreground tracking-tight">
              {zone.inventory?.length ?? 0}
            </span>
          </div>

          {/* Status */}
          <div className="rounded-sm border border-border bg-background/30 p-3 flex flex-col justify-between">
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/70">OPERATIONAL</span>
            <span className={`mt-2 font-mono text-[11px] uppercase tracking-wider font-semibold ${zone.isActive ? "text-logistics-cyan" : "text-muted-foreground"}`}>
              {zone.isActive ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 border-t border-border p-4 bg-background/40 space-y-2">
        {editing && isAdmin ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !newName.trim()}
              className="flex w-full items-center justify-center rounded-sm bg-amber-500 py-2 text-[12px] font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex w-full items-center justify-center rounded-sm bg-zinc-800 py-2 text-[12px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <a
              href={`/dashboard/inventory?zoneId=${zone.id}`}
              className="flex w-full items-center justify-between rounded-sm bg-zinc-800 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-zinc-700"
            >
              <span>Access Inventory</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-red-500 py-2 text-[12px] font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Delete Zone
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────
export function ZonesClient({ user }: { user?: { id: string; role: string } }) {
  const isAdmin = user?.role === "ADMIN";
  const utils = api.useUtils();
  const { data: zones, isLoading } = api.zone.floorPlan.useQuery();

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [showCreate, setShowCreate] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error", message: string } | null>(null);
  const [localOffsets, setLocalOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [localSizes, setLocalSizes] = useState<Record<string, { dw: number; dh: number }>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidth] = useState(1000);
  const [mapHeight, setMapHeight] = useState(650);

  // Routing State
  const [routeStops, setRouteStops] = useState<string[]>(["", "", ""]);
  const [routeResult, setRouteResult] = useState<MultiRouteResult | null>(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);

  // Build searchable items
  const routeOptions = useMemo(() => {
    if (!zones) return [];
    const options: { id: string, label: string, type: 'zone' | 'item' }[] = [];
    
    zones.forEach(z => {
      if (z.isActive) {
        options.push({ id: z.id, label: `Zone: ${z.name}`, type: 'zone' });
        z.inventory?.forEach(inv => {
          options.push({ id: z.id, label: `Item: ${inv.item.name} in ${z.name}`, type: 'item' });
        });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [zones]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    const updateSize = () => {
      if (mapRef.current) {
        setMapWidth(mapRef.current.clientWidth);
        setMapHeight(mapRef.current.clientHeight);
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [viewMode, isLoading]);


  const handlePositionChange = useCallback((id: string, dx: number, dy: number) => {
    setLocalOffsets((prev) => {
      const current = prev[id] ?? { dx: 0, dy: 0 };
      const newDx = current.dx + dx;
      const newDy = current.dy + dy;

      const zone = zones?.find(z => z.id === id);
      if (!zone) return { ...prev, [id]: { dx: newDx, dy: newDy } };

      const rawX = zone.positionX;
      const rawY = zone.positionY;


      let targetX = rawX + newDx;
      let targetY = rawY + newDy;

      // Real-time clamp (minimums only, allowing expansion to the right/bottom)
      targetX = Math.max(CANVAS_PADDING, targetX);
      targetY = Math.max(CANVAS_PADDING, targetY);

      return { ...prev, [id]: { dx: targetX - rawX, dy: targetY - rawY } };
    });
  }, [zones]);

  const handleSizeChange = useCallback((id: string, dw: number, dh: number) => {
    setLocalSizes((prev) => {
      const current = prev[id] ?? { dw: 0, dh: 0 };
      const newDw = current.dw + dw;
      const newDh = current.dh + dh;

      const zone = zones?.find(z => z.id === id);
      if (!zone) return { ...prev, [id]: { dw: newDw, dh: newDh } };

      const rawW = zone.width;
      const rawH = zone.height;
      
      let targetW = rawW + newDw;
      let targetH = rawH + newDh;

      // Constraints
      targetW = Math.max(160, Math.min(480, targetW));
      targetH = Math.max(120, Math.min(320, targetH));

      return { ...prev, [id]: { dw: targetW - rawW, dh: targetH - rawH } };
    });
  }, [zones]);

  const layoutZones = useMemo(() => {
    if (!zones) return [];

    const sortedZones = [...zones].sort((a, b) => a.id.localeCompare(b.id));
    const processed: LayoutZone[] = [];

    for (const zone of sortedZones) {
      const rawX = zone.positionX;
      const rawY = zone.positionY;
      const rawW = zone.width || 224;
      const rawH = zone.height || 160;

      const sizeOffset = localSizes[zone.id] ?? { dw: 0, dh: 0 };
      let renderW = Math.max(160, Math.round((rawW + sizeOffset.dw) / GRID_SIZE) * GRID_SIZE);
      let renderH = Math.max(120, Math.round((rawH + sizeOffset.dh) / GRID_SIZE) * GRID_SIZE);

      const offset = localOffsets[zone.id] ?? { dx: 0, dy: 0 };
      let renderX = Math.round((rawX + offset.dx) / GRID_SIZE) * GRID_SIZE;
      let renderY = Math.round((rawY + offset.dy) / GRID_SIZE) * GRID_SIZE;

      // Fallback for unsaved zones (position 0,0 from DB)
      if (rawX === 0 && rawY === 0 && !localOffsets[zone.id]) {
        renderX = CANVAS_PADDING + (processed.length % 4) * 260;
        renderY = CANVAS_PADDING + Math.floor(processed.length / 4) * 200;
        renderX = Math.round(renderX / GRID_SIZE) * GRID_SIZE;
        renderY = Math.round(renderY / GRID_SIZE) * GRID_SIZE;
      }

      // ── Boundary clamping (all 4 sides) ──────────────────────
      // Top/Left: minimum padding from canvas edge
      renderX = Math.max(CANVAS_PADDING, renderX);
      renderY = Math.max(CANVAS_PADDING, renderY);
      
      // Re-snap to grid after clamping
      renderX = Math.round(renderX / GRID_SIZE) * GRID_SIZE;
      renderY = Math.round(renderY / GRID_SIZE) * GRID_SIZE;

      processed.push({
        rawX,
        rawY,
        renderX,
        renderY,
        renderW,
        renderH,
        hasCollision: false,
        zone,
      });
    }

    // AABB Collision Detection for all zones
    for (let i = 0; i < processed.length; i++) {
      for (let j = 0; j < processed.length; j++) {
        if (i === j) continue;
        const a = processed[i];
        const b = processed[j];
        if (!a || !b) continue;
        if (
          a.renderX < b.renderX + b.renderW &&
          a.renderX + a.renderW > b.renderX &&
          a.renderY < b.renderY + b.renderH &&
          a.renderY + a.renderH > b.renderY
        ) {
          a.hasCollision = true;
          b.hasCollision = true;
        }
      }
    }

    return processed;
  }, [zones, localOffsets, localSizes]);

  const contentWidth = useMemo(() => {
    return Math.max(mapWidth, ...layoutZones.map(z => z.renderX + z.renderW + CANVAS_PADDING));
  }, [layoutZones, mapWidth]);

  const contentHeight = useMemo(() => {
    return Math.max(mapHeight, ...layoutZones.map(z => z.renderY + z.renderH + CANVAS_PADDING));
  }, [layoutZones, mapHeight]);

  const selectedLayoutZone = layoutZones.find((lz) => lz.zone.id === selectedId) ?? null;
  const selectedZone = selectedLayoutZone?.zone ?? null;

  const bulkUpdate = api.zone.bulkUpdatePositions.useMutation({
    onSuccess: () => {
      setLocalOffsets({});
      setLocalSizes({});
      refresh();
      setToastMsg({ type: "success", message: "Layout saved successfully" });
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: (err) => {
      console.error("[bulkUpdate error]", err);
      setToastMsg({ type: "error", message: "Failed to save layout" });
      setTimeout(() => setToastMsg(null), 3000);
    }
  });

  async function handleSaveLayout() {
    setSavingLayout(true);
    setToastMsg(null);
    const modified = layoutZones.filter(lz => 
      lz.rawX !== lz.renderX || lz.rawY !== lz.renderY || 
      lz.zone.width !== lz.renderW || lz.zone.height !== lz.renderH
    );
    const updates = modified.map(lz => ({
      id: lz.zone.id,
      positionX: lz.renderX,
      positionY: lz.renderY,
      width: lz.renderW,
      height: lz.renderH,
    }));
    
    console.log("[handleSaveLayout] payload sent:", updates);
    
    if (updates.length > 0) {
      try {
        const response = await bulkUpdate.mutateAsync(updates);
        console.log("[handleSaveLayout] response received:", response);
      } catch (err) {
        console.error("[handleSaveLayout] mutation error:", err);
      }
    } else {
      setToastMsg({ type: "success", message: "Layout saved successfully" });
      setTimeout(() => setToastMsg(null), 3000);
    }
    setSavingLayout(false);
  }

  function refresh() {
    void utils.zone.list.invalidate();
    void utils.zone.stats.invalidate();
    void utils.zone.floorPlan.invalidate();
  }

  function handleCalculateRoute() {
    const validStops = routeStops.filter(Boolean);
    if (validStops.length < 2) return;

    for (let i = 0; i < validStops.length - 1; i++) {
      if (validStops[i] === validStops[i+1]) {
        setToastMsg({ type: "error", message: "Cannot have duplicate consecutive stops." });
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }
    }

    const rects: Rect[] = layoutZones.map(lz => ({
      id: lz.zone.id,
      x: lz.renderX,
      y: lz.renderY,
      w: lz.renderW,
      h: lz.renderH,
    }));

    try {
      const result = findMultiStopRoute(rects, validStops, contentWidth, contentHeight);
      setRouteResult(result);
    } catch (e: any) {
      setToastMsg({ type: "error", message: e.message || "No safe route available." });
      setTimeout(() => setToastMsg(null), 3000);
      setRouteResult(null);
    }
  }

  function handleClearRoute() {
    setRouteStops(["", "", ""]);
    setRouteResult(null);
  }

  const totalByType = Object.entries(ZONE_TYPE_CONFIG).map(([type, cfg]) => ({
    type,
    label: cfg.label,
    dot: cfg.dot,
    count: zones?.filter((z) => z.type === type).length ?? 0,
  }));

  const hasUnsavedLayout = layoutZones.some(lz => 
    lz.rawX !== lz.renderX || lz.rawY !== lz.renderY || 
    lz.zone.width !== lz.renderW || lz.zone.height !== lz.renderH
  );
  const hasCollisions = layoutZones.some(lz => lz.hasCollision);

  return (
    <div className="flex h-full flex-col">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row shrink-0 items-start sm:items-center justify-between border-b border-border px-5 py-3 relative gap-3 sm:gap-0">
        {/* Simple Toast */}
        {toastMsg && (
          <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow-lg border text-xs z-50 transition-all ${
            toastMsg.type === "success" 
              ? "bg-logistics-green/10 border-logistics-green/30 text-logistics-green" 
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}>
            {toastMsg.message}
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Map className="h-4 w-4 text-logistics-cyan" />
          <div>
            <h1 className="text-[14px] font-medium tracking-tight text-foreground">Facility Map</h1>
            <p className="text-[12px] text-muted-foreground/80 tabular-nums">
              {zones?.filter((z) => z.isActive).length ?? 0} active ·{" "}
              {zones?.length ?? 0} total
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isAdmin && hasUnsavedLayout && (
            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={savingLayout || hasCollisions}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium tracking-tight transition ${
                hasCollisions
                  ? "bg-red-500/20 text-red-500 opacity-50 cursor-not-allowed"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
              title={hasCollisions ? "Cannot save layout with overlapping zones" : "Save Layout"}
            >
              <Save className="h-3.5 w-3.5" />
              {savingLayout ? "Saving..." : hasCollisions ? "Resolve Overlaps" : "Save Layout"}
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition ${
                viewMode === "map"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="h-3 w-3" />
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition ${
                viewMode === "list"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3 w-3" />
              List
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex w-full sm:w-auto items-center justify-center sm:justify-start gap-1.5 rounded border border-[var(--border-base)] bg-zinc-950 px-3 py-1.5 text-[12px] font-medium tracking-tight text-foreground transition hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5 text-logistics-cyan" />
              Create Area
            </button>
          )}
        </div>
      </div>

      {showBanner && (
        <div className="shrink-0 border-b border-logistics-cyan/30 bg-logistics-cyan/5 px-5 py-3 relative group">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-[13px] font-semibold text-logistics-cyan mb-1 flex items-center gap-1.5">
                Welcome to Facility Map
              </h2>
              <ul className="text-[12px] text-muted-foreground/80 space-y-0.5 list-disc list-inside">
                <li>Drag areas to arrange warehouse layout</li>
                <li>Resize areas to match real-world locations</li>
                <li>Click an area to view stored inventory</li>
                <li>Select two areas to find the fastest route</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowBanner(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Stats bar ── */}
      <div className="flex shrink-0 items-center gap-px border-b border-border bg-background overflow-x-auto whitespace-nowrap no-scrollbar">
        {totalByType.map((t) => (
          <div
            key={t.type}
            className="flex flex-1 items-center gap-2 px-4 py-2.5 border-r border-border/40 last:border-r-0"
          >
            <span className={`h-2 w-2 rounded-full ${t.dot}`} />
            <span className="text-[11px] text-muted-foreground">{t.label}</span>
            <span className="ml-auto text-xs font-bold tabular-nums text-foreground">
              {t.count}
            </span>
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Main area */}
        <div className="flex-1 overflow-auto" ref={mapRef}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-3 text-center">
                <Settings2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Loading zones…</p>
              </div>
            </div>
          ) : viewMode === "map" ? (
            /* ── TACTICAL MAP VIEW ── */
            <div
              className="relative min-h-full min-w-full grid-dot-bg"
              style={{
                width: contentWidth,
                height: contentHeight,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
            >
              {/* Warning Banner for Collisions */}
              {hasCollisions && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-sm border border-destructive/50 bg-destructive/10 px-4 py-2 backdrop-blur-md shadow-xl text-[12px] font-medium text-destructive flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                  </span>
                  Resolve overlapping zones before saving
                </div>
              )}

              {/* Grid axes overlay for debug */}
              <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded border border-border bg-card/85 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm z-30 font-mono tracking-widest uppercase">
                <Grid3X3 className="h-3.5 w-3.5 text-logistics-cyan animate-pulse" />
                Facility Floor Plan
              </div>

              {!zones?.length && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-background/50 backdrop-blur-sm z-20">
                  <EmptyState 
                    icon={Map}
                    title="No Storage Areas Yet"
                    description={isAdmin ? "Create your first storage area to map your facility." : "Your facility hasn't been mapped yet."}
                    action={
                      isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setShowCreate(true)}
                          className="flex items-center gap-1.5 rounded border border-[var(--border-base)] bg-[var(--bg-elevated)] px-4 py-2 text-[13px] font-medium tracking-tight text-foreground transition hover:bg-accent"
                        >
                          <Plus className="h-4 w-4" />
                          Create Area
                        </button>
                      ) : null
                    }
                  />
                </div>
              )}

              {/* Route Finder Panel */}
              {showRoutePanel ? (
                <div className="absolute left-2 right-2 sm:left-auto sm:right-4 top-14 sm:top-4 w-auto sm:w-[280px] rounded border border-border bg-card/85 backdrop-blur-sm z-40 shadow-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-logistics-cyan" />
                      <h3 className="text-[12px] font-semibold tracking-tight uppercase font-mono">Multi-Stop Route</h3>
                    </div>
                    <button onClick={() => setShowRoutePanel(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                
                <div className="flex flex-col gap-2">
                  {routeStops.map((stopId, index) => {
                    const isOptional = index > 0 && index < routeStops.length - 1;
                    return (
                      <div key={`stop-${index}`} className="flex items-end gap-1.5">
                        <div className="space-y-1 flex-1">
                          <label className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
                            {index === 0 ? "From" : index === routeStops.length - 1 ? "To" : `Via ${index}`}
                          </label>
                          <select
                            value={stopId}
                            onChange={e => {
                              const newStops = [...routeStops];
                              newStops[index] = e.target.value;
                              setRouteStops(newStops);
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-logistics-cyan"
                          >
                            <option value="">{index === 0 ? "Select origin..." : index === routeStops.length - 1 ? "Select destination..." : "Select stop..."}</option>
                            {routeOptions.map((opt, i) => <option key={`${opt.id}-${i}`} value={opt.id}>{opt.label}</option>)}
                          </select>
                        </div>
                        {isOptional && (
                          <button
                            onClick={() => {
                              const newStops = [...routeStops];
                              newStops.splice(index, 1);
                              setRouteStops(newStops);
                            }}
                            className="p-1.5 mb-px rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Remove Stop"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  
                  {routeStops.length < 4 && (
                    <button
                      onClick={() => {
                        const newStops = [...routeStops];
                        newStops.splice(newStops.length - 1, 0, "");
                        setRouteStops(newStops);
                      }}
                      className="mt-1 flex items-center justify-center gap-1 py-1.5 rounded border border-dashed border-border/60 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Stop
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleClearRoute}
                    className="flex-1 bg-zinc-800 rounded py-1.5 text-[12px] font-medium text-white hover:bg-zinc-700 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleCalculateRoute}
                    disabled={routeStops.filter(Boolean).length < 2}
                    className="flex-[2] bg-amber-500 text-white rounded py-1.5 text-[12px] font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="h-3 w-3" /> Calculate
                  </button>
                </div>
                
                {routeResult && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
                    {/* Segment Breakdown */}
                    {routeResult.segments.length > 1 && (
                      <div className="space-y-1.5 mb-2">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Segments</span>
                        {routeResult.segments.map((seg, i) => {
                          const fromName = zones?.find(z => z.id === seg.fromZoneId)?.name || "Area";
                          const toName = zones?.find(z => z.id === seg.toZoneId)?.name || "Area";
                          return (
                            <div key={`seg-${i}`} className="flex justify-between items-center text-[10px] pl-2 border-l-2 border-border/30">
                              <span className="text-muted-foreground truncate pr-2 max-w-[170px]">{fromName} → {toName}</span>
                              <span className="font-mono text-foreground/80">{seg.distanceMeters.toFixed(1)}m</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Total Distance</span>
                      <span className="font-mono font-bold text-amber-500">{routeResult.totalDistance.toFixed(1)}m</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Footprints className="h-3 w-3" /> Walking</span>
                      <span className="font-mono font-medium">{Math.ceil(routeResult.walkingTimeSeconds)}s</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Forklift className="h-3 w-3" /> Forklift</span>
                      <span className="font-mono font-medium">{Math.ceil(routeResult.forkliftTimeSeconds)}s</span>
                    </div>
                  </div>
                )}
              </div>
              ) : (
                <button
                  onClick={() => setShowRoutePanel(true)}
                  className="absolute right-4 top-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card/85 px-4 py-2 text-[12px] font-medium shadow-xl backdrop-blur-sm transition hover:bg-accent hover:text-foreground text-muted-foreground"
                >
                  <Route className="h-4 w-4 text-logistics-cyan" />
                  Find Route
                </button>
              )}

              {/* SVG Route Overlay */}
              {routeResult && (
                <svg className="absolute inset-0 z-15 pointer-events-none" style={{ minWidth: contentWidth, minHeight: contentHeight }}>
                  <defs>
                    <marker id="erd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
                      <polygon points="0 0, 8 4, 0 8" fill="rgba(100, 116, 139, 1)" />
                    </marker>
                    <marker id="erd-dot" markerWidth="6" markerHeight="6" refX="3" refY="3">
                      <circle cx="3" cy="3" r="2.5" fill="rgba(100, 116, 139, 1)" />
                    </marker>
                  </defs>
                  {(() => {
                    if (routeResult.fullPath.length < 2) return null;
                    const d = routeResult.fullPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                    return (
                      <path
                        d={d}
                        fill="none"
                        stroke="rgba(100, 116, 139, 0.8)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        markerStart="url(#erd-dot)"
                        markerEnd="url(#erd-arrow)"
                      />
                    );
                  })()}
                </svg>
              )}

              {layoutZones.map((lz) => {
                const validRouteStops = routeResult ? routeStops.filter(Boolean) : [];
                const isRoutePath = routeResult?.fullPath.some(n => n.id.startsWith(lz.zone.id + "_"));
                
                return (
                  <ZoneBlock
                    key={lz.zone.id}
                    layoutZone={lz}
                    selected={selectedId === lz.zone.id}
                    isRoutePath={isRoutePath}
                    isRouteStart={lz.zone.id === validRouteStops[0]}
                    isRouteEnd={lz.zone.id === validRouteStops[validRouteStops.length - 1]}
                    isRouteMiddle={validRouteStops.slice(1, -1).includes(lz.zone.id)}
                    isDimmed={Boolean(validRouteStops.length && !validRouteStops.includes(lz.zone.id))}
                    onClick={() => setSelectedId(selectedId === lz.zone.id ? null : lz.zone.id)}
                    onPositionChange={isAdmin ? handlePositionChange : undefined}
                    onSizeChange={isAdmin ? handleSizeChange : undefined}
                  />
                );
              })}
            </div>
          ) : !zones?.length ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState 
                icon={Map}
                title="No Storage Areas Yet"
                description={isAdmin ? "Create your first storage area to map your facility." : "Your facility hasn't been mapped yet."}
                action={
                  isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-1.5 rounded border border-[var(--border-base)] bg-[var(--bg-elevated)] px-4 py-2 text-[13px] font-medium tracking-tight text-foreground transition hover:bg-accent"
                    >
                      <Plus className="h-4 w-4" />
                      Create Area
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <div className="p-4">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-medium tracking-tight text-muted-foreground/80">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Items</th>
                    <th className="pb-2 pr-4 font-medium">Position</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {zones?.map((z) => {
                    const cfg = ZONE_TYPE_CONFIG[z.type as ZoneType] ?? ZONE_TYPE_CONFIG.STORAGE;
                    return (
                      <tr
                        key={z.id}
                        className={`cursor-pointer transition hover:bg-accent/50 ${selectedId === z.id ? "bg-logistics-cyan/5 text-logistics-cyan" : ""}`}
                        onClick={() => setSelectedId(selectedId === z.id ? null : z.id)}
                      >
                        <td className="py-2.5 pr-4 font-medium text-foreground">{z.name}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium tracking-tight ${cfg.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                          {z.inventory?.length ?? 0}
                        </td>
                        <td className="py-2.5 pr-4 font-mono tabular-nums text-muted-foreground/70">
                          {z.positionX.toFixed(0)},{z.positionY.toFixed(0)}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-semibold ${z.isActive ? "text-logistics-green" : "text-muted-foreground"}`}>
                            {z.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedZone && (
          <ZoneDetailPanel
            key={selectedZone.id}
            zone={selectedZone}
            onClose={() => setSelectedId(null)}
            onRefresh={refresh}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateZoneModal
          existingZones={layoutZones}
          onClose={() => setShowCreate(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
