"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { api } from "@/trpc/react";
import {
  Map,
  Plus,
  Grid3X3,
  List,
  Package,
  ChevronRight,
  Settings2,
  ToggleLeft,
  Trash2,
  Pencil,
  Bug,
  Save,
} from "lucide-react";
import { createZoneAction, deleteZoneAction, updateZoneAction } from "@/server/actions/zone.action";

// ─── Zone type config ────────────────────────────────────────────
const ZONE_TYPE_CONFIG = {
  RAW_MATERIAL:   { label: "Raw Material",   className: "zone-raw",     dot: "bg-amber-400" },
  PRODUCTION:     { label: "Production",     className: "zone-prod",    dot: "bg-cyan-400" },
  FINISHED_GOODS: { label: "Finished Goods", className: "zone-finish",  dot: "bg-green-400" },
  STORAGE:        { label: "Storage",        className: "zone-storage", dot: "bg-zinc-400" },
} as const;

type ZoneType = keyof typeof ZONE_TYPE_CONFIG;
type ViewMode = "map" | "list";

export type LayoutZone = {
  rawX: number;
  rawY: number;
  renderX: number;
  renderY: number;
  renderW: number;
  renderH: number;
  zone: {
    id: string;
    name: string;
    type: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    isActive: boolean;
    _count: { inventory: number };
  };
};

// ─── Tactical map zone block ─────────────────────────────────────
function ZoneBlock({
  layoutZone,
  selected,
  debugMode,
  onClick,
}: {
  layoutZone: LayoutZone;
  selected: boolean;
  debugMode: boolean;
  onClick: () => void;
}) {
  const { zone, renderX, renderY, renderW, renderH, rawX, rawY } = layoutZone;
  const cfg = ZONE_TYPE_CONFIG[zone.type as ZoneType] ?? ZONE_TYPE_CONFIG.STORAGE;
  const isOffset = rawX !== renderX || rawY !== renderY;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        left: renderX,
        top: renderY,
        width: renderW,
        height: renderH,
      }}
      className={`absolute flex flex-col justify-between rounded border p-3 text-left transition-all duration-300 ${
        selected ? "z-20" : "z-10 hover:z-30"
      } ${
        !zone.isActive
          ? "border-border/20 bg-card/20 opacity-40"
          : selected
          ? "border-logistics-cyan bg-logistics-cyan/[0.04] shadow-[0_0_20px_rgba(6,182,212,0.15),inset_0_0_12px_rgba(6,182,212,0.08)] ring-1 ring-logistics-cyan/30"
          : "border-border bg-card/80 backdrop-blur-[2px] hover:border-logistics-cyan/50 hover:bg-accent/40 hover:shadow-[0_0_12px_rgba(6,182,212,0.05)]"
      } ${debugMode && isOffset ? "ring-1 ring-logistics-amber/70 border-logistics-amber bg-logistics-amber/10" : ""}`}
    >
      {/* Visual scanning lines or telemetry highlights on selection */}
      {selected && !debugMode && (
        <>
          {/* Glowing Corner Brackets */}
          <div className="absolute -left-[1px] -top-[1px] h-3 w-3 border-l-2 border-t-2 border-logistics-cyan" />
          <div className="absolute -right-[1px] -top-[1px] h-3 w-3 border-r-2 border-t-2 border-logistics-cyan" />
          <div className="absolute -left-[1px] -bottom-[1px] h-3 w-3 border-l-2 border-b-2 border-logistics-cyan" />
          <div className="absolute -right-[1px] -bottom-[1px] h-3 w-3 border-r-2 border-b-2 border-logistics-cyan" />
          {/* Subtle animated scanline */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-logistics-cyan/40 to-transparent animate-[scanline_2s_ease-in-out_infinite]" />
        </>
      )}

      {/* Type badge */}
      <div className={`inline-flex items-center gap-1.5 self-start rounded-sm px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-semibold ${cfg.className}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </div>

      {/* Zone name */}
      <div className="my-1">
        <p className="truncate text-[13px] font-medium tracking-tight text-foreground">{zone.name}</p>
        <p className="mt-0.5 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
          {zone._count.inventory} registered SKU{zone._count.inventory !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Coordinates / Telemetry footer */}
      <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground/45 tabular-nums">
        <span>LOC: {renderX},{renderY}</span>
        <span>DIM: {renderW}x{renderH}</span>
      </div>

      {debugMode && isOffset && (
        <div className="absolute -top-6 left-0 whitespace-nowrap rounded bg-logistics-amber/20 px-1 py-0.5 font-mono text-[8px] text-logistics-amber border border-logistics-amber/40">
          OFFSET: ΔX={renderX - Math.round(rawX/32)*32} ΔY={renderY - Math.round(rawY/32)*32}
        </div>
      )}
    </button>
  );
}

// ─── Create zone modal ───────────────────────────────────────────
function CreateZoneModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ZoneType>("STORAGE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const result = await createZoneAction({
      name: name.trim(),
      type,
      positionX: Math.random() * 300 + 50,
      positionY: Math.random() * 200 + 50,
      width: 200,
      height: 140,
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
          <Map className="h-4 w-4 text-logistics-cyan animate-pulse" />
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-foreground">PROVISION NEW ZONE</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
              Zone Identifier
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alpha Sector, Finished Goods C"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-logistics-cyan focus:outline-none focus:ring-1 focus:ring-logistics-cyan/40"
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
              Operational Domain
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(ZONE_TYPE_CONFIG) as [ZoneType, typeof ZONE_TYPE_CONFIG[ZoneType]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition ${
                    type === key
                      ? "border-logistics-cyan bg-logistics-cyan/10 text-logistics-cyan"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
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

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-sm border border-border py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-sm bg-foreground py-2 font-mono text-[10px] uppercase tracking-widest text-background transition hover:bg-foreground/90 disabled:opacity-50"
            >
              {loading ? "PROVISIONING…" : "DEPLOY NODE"}
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
    _count: { inventory: number };
  };
  onClose: () => void;
  onRefresh: () => void;
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
    await deleteZoneAction(zone.id);
    setLoading(false);
    onClose();
    onRefresh();
  }

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-card/60 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background/40">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {editing ? "MODIFY METRICS" : "ZONE INSPECTOR"}
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
        {/* Visual Cue of Inspector Node */}
        <div className="rounded-sm border border-border bg-background/50 p-3 flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/60">CONNECTED OPERATIONAL NODE</span>
            <p className="truncate text-xs font-mono text-foreground font-semibold">{zone.id.substring(0, 12)}...</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/75">
            Zone Descriptor
          </p>
          {editing ? (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-logistics-cyan focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
              <p className="text-[15px] font-medium tracking-tight text-foreground">{zone.name}</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
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
            Spatial Grid Telemetry
          </p>
          {editing ? (
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
            <div className="rounded-sm border border-border bg-background/40 p-3 font-mono text-[10px] tabular-nums text-muted-foreground space-y-2">
              <div className="flex justify-between border-b border-border/20 pb-1.5">
                <span className="text-muted-foreground/60">NODE ORIGIN X/Y</span>
                <span className="font-semibold text-foreground">{zone.positionX.toFixed(0)}px / {zone.positionY.toFixed(0)}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">DIMENSIONS WxH</span>
                <span className="font-semibold text-foreground">{zone.width.toFixed(0)}px × {zone.height.toFixed(0)}px</span>
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
              {zone._count.inventory}
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
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !newName.trim()}
              className="flex w-full items-center justify-center rounded-sm bg-foreground py-2 font-mono text-[10px] uppercase tracking-widest text-background transition hover:bg-foreground/90 disabled:opacity-50"
            >
              {loading ? "SAVING..." : "COMMIT CHANGES"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex w-full items-center justify-center py-2 font-mono text-[10px] uppercase tracking-widest border border-border text-muted-foreground rounded-sm transition hover:bg-accent"
            >
              CANCEL
            </button>
          </>
        ) : (
          <>
            <a
              href={`/dashboard/inventory?zoneId=${zone.id}`}
              className="flex w-full items-center justify-between rounded-sm border border-border px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <span>ACCESS INVENTORY</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-destructive/20 py-2 font-mono text-[10px] uppercase tracking-widest text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              DECOMMISSION ZONE
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────
export function ZonesClient() {
  const utils = api.useUtils();
  const { data: zones, isLoading } = api.zone.list.useQuery({ includeInactive: true });
  const { data: stats } = api.zone.stats.useQuery();

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidth] = useState(1000);

  // Measure map container width dynamically
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMapWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setMapWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [viewMode]);

  const GRID_SIZE = 32;
  const MAP_WIDTH_LIMIT = mapWidth > 0 ? mapWidth : 1000;

  const layoutZones = useMemo(() => {
    if (!zones) return [];

    // Sort deterministically by ID to prevent unstable layouts
    const sortedZones = [...zones].sort((a, b) => a.id.localeCompare(b.id));
    const processed: LayoutZone[] = [];

    for (const zone of sortedZones) {
      // 1. Grid Snap
      const rawX = zone.positionX;
      const rawY = zone.positionY;
      
      let renderW = Math.max(GRID_SIZE, Math.round(zone.width / GRID_SIZE) * GRID_SIZE);
      let renderH = Math.max(GRID_SIZE, Math.round(zone.height / GRID_SIZE) * GRID_SIZE);
      
      let candidateX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
      let candidateY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

      // 2. Collision detection loop
      let collision = true;
      let attempts = 0;
      while (collision && attempts < 1000) {
        collision = false;
        for (const p of processed) {
          // AABB overlap check
          if (
            candidateX < p.renderX + p.renderW &&
            candidateX + renderW > p.renderX &&
            candidateY < p.renderY + p.renderH &&
            candidateY + renderH > p.renderY
          ) {
            collision = true;
            break;
          }
        }
        
        if (collision) {
          candidateX += GRID_SIZE;
          if (candidateX + renderW > MAP_WIDTH_LIMIT) {
            candidateX = 0;
            candidateY += GRID_SIZE;
          }
          attempts++;
        }
      }

      processed.push({
        rawX,
        rawY,
        renderX: candidateX,
        renderY: candidateY,
        renderW,
        renderH,
        zone,
      });
    }

    return processed;
  }, [zones]);

  const selectedLayoutZone = layoutZones.find((lz) => lz.zone.id === selectedId) ?? null;
  const selectedZone = selectedLayoutZone?.zone ?? null;

  async function handleSaveLayout() {
    setSavingLayout(true);
    // Identify zones that were moved
    const moved = layoutZones.filter(lz => lz.rawX !== lz.renderX || lz.rawY !== lz.renderY);
    for (const lz of moved) {
      await updateZoneAction({
        id: lz.zone.id,
        name: lz.zone.name,
        positionX: lz.renderX,
        positionY: lz.renderY,
        width: lz.renderW,
        height: lz.renderH,
      });
    }
    setSavingLayout(false);
    refresh();
  }

  function refresh() {
    void utils.zone.list.invalidate();
    void utils.zone.stats.invalidate();
  }

  const totalByType = Object.entries(ZONE_TYPE_CONFIG).map(([type, cfg]) => ({
    type,
    label: cfg.label,
    dot: cfg.dot,
    count: zones?.filter((z) => z.type === type).length ?? 0,
  }));

  // SVG Telemetry path calculation — dynamic width, smooth cubic bezier
  const getTelemetryPath = useCallback(() => {
    if (!selectedLayoutZone) return "";
    const startX = selectedLayoutZone.renderX + selectedLayoutZone.renderW;
    const startY = selectedLayoutZone.renderY + selectedLayoutZone.renderH / 2;
    const endX = mapWidth - 4; // Right edge of the map container (inspector border)
    const endY = selectedLayoutZone.renderY + selectedLayoutZone.renderH / 2;

    // Smooth cubic bezier — the control points pull the curve horizontally
    const dx = endX - startX;
    const cp1x = startX + dx * 0.4;
    const cp2x = startX + dx * 0.6;

    return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
  }, [selectedLayoutZone, mapWidth]);

  const hasUnsavedLayout = layoutZones.some(lz => lz.rawX !== lz.renderX || lz.rawY !== lz.renderY);

  return (
    <div className="flex h-full flex-col">
      {/* Dynamic scanline + circuit tracing CSS injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes telemetry-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
      `}} />

      {/* ── Page header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <Map className="h-4 w-4 text-logistics-cyan" />
          <div>
            <h1 className="text-[14px] font-medium tracking-tight text-foreground">Facility Zones</h1>
            <p className="text-[12px] text-muted-foreground/80 tabular-nums">
              {zones?.filter((z) => z.isActive).length ?? 0} active ·{" "}
              {zones?.length ?? 0} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {debugMode && hasUnsavedLayout && (
            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={savingLayout}
              className="flex items-center gap-1.5 rounded-md border border-logistics-amber/50 bg-logistics-amber/10 px-3 py-1.5 text-[12px] font-medium tracking-tight text-logistics-amber transition hover:bg-logistics-amber/20 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {savingLayout ? "Saving..." : "Save Layout"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setDebugMode(!debugMode)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium tracking-tight transition ${
              debugMode
                ? "border-logistics-amber bg-logistics-amber/10 text-logistics-amber"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title="Toggle Debug Layout Engine"
          >
            <Bug className="h-3.5 w-3.5" />
            Debug Mode
          </button>

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

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-logistics-amber px-3 py-1.5 text-[12px] font-medium tracking-tight text-black transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" />
            New Zone
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex shrink-0 items-center gap-px border-b border-border bg-background">
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
      <div className="flex flex-1 overflow-hidden">

        {/* Main area */}
        <div className="flex-1 overflow-auto">
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
              ref={mapRef}
              className={`relative min-h-full min-w-full ${debugMode ? "" : "grid-dot-bg"}`}
              style={{
                width: "100%",
                height: "max(100%, 650px)",
                ...(debugMode
                  ? {
                      backgroundImage:
                        "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                      backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                      backgroundPosition: "0 0",
                    }
                  : {}),
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
            >
              {/* Map label */}
              <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded border border-border bg-card/85 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm z-30 font-mono tracking-widest uppercase">
                <Grid3X3 className="h-3.5 w-3.5 text-logistics-cyan animate-pulse" />
                Facility Floor Plan
              </div>

              {!zones?.length && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border">
                    <Map className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No zones yet — click{" "}
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="text-logistics-amber hover:underline"
                    >
                      New Zone
                    </button>{" "}
                    to get started
                  </p>
                </div>
              )}

              {/* Glowing animated connection path */}
              {(selectedLayoutZone || debugMode) && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                  {/* Debug Mode: Offset vectors */}
                  {debugMode && layoutZones.map(lz => {
                    const snappedRawX = Math.round(lz.rawX / GRID_SIZE) * GRID_SIZE;
                    const snappedRawY = Math.round(lz.rawY / GRID_SIZE) * GRID_SIZE;
                    if (snappedRawX === lz.renderX && snappedRawY === lz.renderY) return null;
                    return (
                      <g key={`debug-vector-${lz.zone.id}`}>
                        <rect x={snappedRawX} y={snappedRawY} width={lz.renderW} height={lz.renderH} fill="none" stroke="var(--logistics-red)" strokeWidth="1" strokeDasharray="4 4" className="opacity-40" />
                        <line x1={snappedRawX + lz.renderW/2} y1={snappedRawY + lz.renderH/2} x2={lz.renderX + lz.renderW/2} y2={lz.renderY + lz.renderH/2} stroke="var(--logistics-amber)" strokeWidth="2" strokeDasharray="4 4" />
                        <circle cx={lz.renderX + lz.renderW/2} cy={lz.renderY + lz.renderH/2} r="4" fill="var(--logistics-amber)" />
                      </g>
                    );
                  })}

                  {selectedLayoutZone && !debugMode && (
                    <>
                      {/* Glow layer */}
                      <path
                        d={getTelemetryPath()}
                        fill="none"
                        stroke="var(--logistics-cyan)"
                        strokeWidth="3.5"
                        className="opacity-15 blur-[2.5px]"
                      />
                      {/* Neon main circuit line */}
                      <path
                        d={getTelemetryPath()}
                        fill="none"
                        stroke="var(--logistics-cyan)"
                        strokeWidth="1.25"
                        className="opacity-45"
                      />
                      {/* Telemetry data transmission pulse dots */}
                      <path
                        d={getTelemetryPath()}
                        fill="none"
                        stroke="var(--logistics-cyan)"
                        strokeWidth="1.5"
                        strokeDasharray="5 15"
                        className="opacity-90 animate-[telemetry-dash_1.5s_linear_infinite]"
                      />
                    </>
                  )}
                </svg>
              )}

              {layoutZones.map((lz) => (
                <ZoneBlock
                  key={lz.zone.id}
                  layoutZone={lz}
                  selected={selectedId === lz.zone.id}
                  debugMode={debugMode}
                  onClick={() => setSelectedId(selectedId === lz.zone.id ? null : lz.zone.id)}
                />
              ))}
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
                          {z._count.inventory}
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
                  {!zones?.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No zones found
                      </td>
                    </tr>
                  )}
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
          />
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateZoneModal
          onClose={() => setShowCreate(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
