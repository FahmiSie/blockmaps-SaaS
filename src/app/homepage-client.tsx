"use client";

import { useEffect, useState } from "react";

// ─── Tactical Map Preview SVG ──────────────────────────────────
function TacticalMapPreview() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-sm border border-border bg-card"
      style={{ height: "540px" }}
    >
      {/* Grid line background */}
      <div className="absolute inset-0 grid-line-bg opacity-50" />

      {/* Corner coordinate labels */}
      <div className="absolute left-4 top-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        0,0
      </div>
      <div className="absolute right-4 top-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        1200,0
      </div>
      <div className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        0,800
      </div>

      {/* Value Annotations (Floating) */}
      <div className="absolute left-8 top-16 flex items-center gap-2 rounded-full border border-border/40 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <span className="text-[10px]">📦</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Track inventory across facility zones</span>
      </div>
      <div className="absolute right-8 top-16 flex items-center gap-2 rounded-full border border-border/40 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <span className="text-[10px]">🚚</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Monitor deliveries in real time</span>
      </div>
      <div className="absolute bottom-6 left-[28%] flex items-center gap-2 rounded-full border border-border/40 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <span className="text-[10px]"></span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">View operational activity instantly</span>
      </div>

      {/* Floor plan label */}
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-sm border border-border/50 bg-background/80 px-3 py-1.5 backdrop-blur-md">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-logistics-cyan opacity-40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-logistics-cyan" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          FACILITY OVERVIEW
        </span>
      </div>

      {/* SVG routes and zone connections */}
      <svg className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--logistics-cyan)" opacity="0.7" />
          </marker>
          <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--logistics-amber)" opacity="0.7" />
          </marker>
        </defs>
        {/* Route: Raw Material → Production */}
        <line
          x1="320" y1="200" x2="520" y2="200"
          stroke="var(--logistics-cyan)"
          strokeWidth="1"
          opacity="0.5"
          markerEnd="url(#arrow)"
          className="route-dash"
        />
        {/* Route: Production → Finished Goods */}
        <line
          x1="700" y1="200" x2="800" y2="300"
          stroke="var(--logistics-amber)"
          strokeWidth="1"
          strokeDasharray="6 4"
          opacity="0.4"
          markerEnd="url(#arrow-amber)"
        />
        {/* Telemetry line - horizontal bottom */}
        <line
          x1="120" y1="360" x2="900" y2="360"
          stroke="var(--border)"
          strokeWidth="1"
          opacity="0.8"
        />
        <circle cx="120" cy="360" r="2" fill="var(--logistics-amber)" opacity="0.6" />
        <circle cx="480" cy="360" r="2" fill="var(--logistics-amber)" opacity="0.4" />
        <circle cx="900" cy="360" r="2" fill="var(--logistics-amber)" opacity="0.6" />
      </svg>

      {/* Delivery Route Annotation */}
      <div className="absolute text-center" style={{ left: 340, top: 165, width: 160 }}>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Movement between facility zones</div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-1">↓</div>
      </div>

      {/* Zone: Raw Material */}
      <div
        className="absolute flex flex-col justify-between rounded-sm border p-4 transition-colors hover:bg-logistics-amber/5"
        style={{
          left: 80, top: 120,
          width: 240, height: 160,
          borderColor: "color-mix(in oklch, var(--logistics-amber) 30%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--logistics-amber) 3%, var(--card))",
        }}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5" style={{ backgroundColor: "color-mix(in oklch, var(--logistics-amber) 15%, transparent)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-logistics-amber" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-logistics-amber">
              RAW MAT
            </span>
          </div>
          <p className="text-[14px] font-medium text-foreground">Zone A-01</p>
          <p className="text-[11px] text-muted-foreground">Main Receiving Bay</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Volume</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-foreground">84%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-[84%] rounded-full bg-logistics-amber" />
          </div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 tabular-nums">80,120 · 240×160</p>
        </div>
      </div>
      
      {/* Annotation for Raw Material Zone */}
      <div className="absolute text-center" style={{ left: 80, top: 290, width: 240 }}>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">↓</div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Where incoming inventory is received</div>
      </div>

      {/* Zone: Production */}
      <div
        className="absolute flex flex-col justify-between rounded-sm border p-4 transition-colors hover:bg-logistics-cyan/5"
        style={{
          left: 520, top: 120,
          width: 240, height: 160,
          borderColor: "color-mix(in oklch, var(--logistics-cyan) 30%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--logistics-cyan) 3%, var(--card))",
        }}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5" style={{ backgroundColor: "color-mix(in oklch, var(--logistics-cyan) 15%, transparent)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-logistics-cyan shadow-[0_0_8px_var(--logistics-cyan)]" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-logistics-cyan">
              PROD
            </span>
          </div>
          <p className="text-[14px] font-medium text-foreground">Zone B-01</p>
          <p className="text-[11px] text-muted-foreground">Assembly Line 1</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Status</span>
            <span className="font-mono text-[10px] font-medium tabular-nums text-logistics-cyan uppercase tracking-widest">Active</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-[45%] rounded-full bg-logistics-cyan" />
          </div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40 tabular-nums">520,120 · 240×160</p>
        </div>
      </div>

      {/* Annotation for Production Area */}
      <div className="absolute text-center" style={{ left: 520, top: 290, width: 240 }}>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">↓</div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Items are processed here</div>
      </div>

      {/* Zone: Finished Goods */}
      <div
        className="absolute flex flex-col justify-between rounded-sm border p-4 transition-colors hover:bg-logistics-green/5"
        style={{
          left: 780, top: 310,
          width: 200, height: 140,
          borderColor: "color-mix(in oklch, var(--logistics-green) 30%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--logistics-green) 3%, var(--card))",
        }}
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5" style={{ backgroundColor: "color-mix(in oklch, var(--logistics-green) 15%, transparent)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-logistics-green" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-logistics-green">
              FINISH
            </span>
          </div>
          <p className="text-[14px] font-medium text-foreground">Zone C-01</p>
          <p className="text-[11px] text-muted-foreground">Dispatch Prep</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Load</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-logistics-green">92%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-[92%] rounded-full bg-logistics-green" />
          </div>
        </div>
      </div>

      {/* Annotation for Storage Area (Finished Goods) */}
      <div className="absolute text-center" style={{ left: 780, top: 460, width: 200 }}>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">↓</div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Inventory is stored and tracked</div>
      </div>

      {/* Active delivery badge */}
      <div
        className="absolute flex items-start gap-2.5 rounded-sm border border-border/80 bg-background/90 px-3 py-2 shadow-xl backdrop-blur-sm"
        style={{ left: 80, top: 380 }}
      >
        <div className="mt-1 h-1.5 w-1.5 animate-pulse shrink-0 rounded-full bg-logistics-green" />
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-widest text-foreground font-medium mb-1">
            Delivery in Progress
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80">
            Raw Material → Production
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80 mt-0.5">
            240 Units Moving
          </span>
        </div>
      </div>

      {/* Live Activity panel bottom right */}
      <div
        className="absolute bottom-6 right-6 space-y-2 rounded-sm border border-border/80 bg-background/90 p-4 shadow-xl backdrop-blur-sm"
        style={{ width: 220 }}
      >
        <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
          Live Activity
        </p>
        {[
          { label: "Active Zones", value: "4", unit: "" },
          { label: "Items in Transit", value: "240", unit: "units" },
          { label: "Today's Deliveries", value: "12", unit: "routes" },
          { label: "Warehouse Usage", value: "84", unit: "%" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">{row.label}</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-foreground">
              {row.value}
              <span className="text-muted-foreground/60 ml-1">{row.unit}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Scan line overlay — subtle depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklch, var(--background) 40%, transparent) 100%)",
        }}
      />
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────
function Navbar({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 transition-all duration-300"
      style={{
        borderBottom: scrolled
          ? "1px solid var(--border)"
          : "1px solid transparent",
        background: scrolled
          ? "rgba(10, 10, 10, 0.85)"
          : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1600px] items-center justify-between px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <rect x="0.5" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-amber)" strokeWidth="1" fill="none" />
              <rect x="8" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-cyan)" strokeWidth="1" fill="none" />
              <rect x="0.5" y="8" width="5.5" height="5.5" stroke="var(--logistics-green)" strokeWidth="1" fill="none" />
              <rect x="8" y="8" width="5.5" height="5.5" stroke="oklch(0.48 0.004 260)" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <span className="text-[14px] font-medium tracking-tight text-foreground">
            BlockMaps
          </span>
          <span className="rounded-sm bg-accent/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            OS
          </span>
        </div>

        {/* Right Side: Navigation & Auth */}
        <div className="flex items-center gap-6">
          {/* Nav links */}
          <nav className="hidden items-center gap-6 md:flex">
            {["Features", "Workflow", "Architecture"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[14px] font-normal text-[#9ca3af] transition-colors hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Divider */}
          <div className="hidden h-4 w-px bg-white/10 md:block" />

          {/* CTA buttons */}
          <div className="flex items-center gap-6">
            <a
              href="/login"
              className="text-[14px] font-normal text-[#9ca3af] transition-colors hover:text-white"
            >
              Log in
            </a>
            <a
              href="/register"
              className="flex h-8 items-center justify-center rounded-full bg-white px-4 text-[14px] font-normal text-black transition-all hover:bg-white/90"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Feature Card ──────────────────────────────────────────────
function FeatureCard({
  icon,
  label,
  title,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-sm border border-border bg-card p-6 transition-all duration-200 hover:border-border/80 hover:bg-accent/10">
      <div>
        <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-background text-foreground shadow-sm group-hover:border-foreground/20 group-hover:text-foreground transition-colors">
          {icon}
        </div>
        <h3 className="mb-2 text-[18px] font-medium tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        {label}
      </div>
    </div>
  );
}

// ─── Stat Item ─────────────────────────────────────────────────
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-8 first:pl-0 last:pr-0">
      <p className="font-mono text-[32px] font-medium tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

// ─── Workflow Step ─────────────────────────────────────────────
function WorkflowStep({
  step,
  title,
  description,
  isLast,
}: {
  step: string;
  title: string;
  description: string;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-6">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-card font-mono text-[11px] font-medium text-foreground">
          {step}
        </div>
        {!isLast && (
          <div className="my-2 h-full w-px bg-border/50" />
        )}
      </div>
      <div className="pb-10">
        <h4 className="mb-2 text-[18px] font-medium tracking-tight text-foreground">
          {title}
        </h4>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export function HomepageClient() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      label: "Spatial Engine",
      title: "Accurate Facility Mapping",
      description:
        "Define your physical factory floors as an easy-to-use digital grid. Understand exactly where everything is located without any ambiguity.",
      icon: (
        <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="3.5" height="3.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="6" y="0.5" width="3.5" height="3.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="0.5" y="6" width="3.5" height="3.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="6" y="6" width="3.5" height="3.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      label: "Live Telemetry",
      title: "Real-Time Inventory Tracking",
      description:
        "Track stock movement the moment it happens. Availability updates instantly across your entire network, keeping everyone in sync.",
      icon: (
        <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
          <polyline points="1,8 3,5 5,6 8,2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="2" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: "State Machine",
      title: "Reliable Delivery Workflows",
      description:
        "Manage logistics with confidence. Deliveries move from Pending to Completed sequentially, backed by complete audit logs.",
      icon: (
        <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
          <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
          <path d="M6.5,2.5 L9,5 L6.5,7.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      ),
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Map Your Facility",
      description:
        "Place your storage and production areas onto the map. Set physical boundaries and assign zone types easily.",
    },
    {
      step: "02",
      title: "Add Inventory",
      description:
        "Populate your zones with initial stock counts. The system immediately starts tracking capacity and availability.",
    },
    {
      step: "03",
      title: "Request Deliveries",
      description:
        "Operators submit delivery requests between zones. Once approved, quantities are reserved to prevent overlapping orders.",
    },
    {
      step: "04",
      title: "Complete Transfers",
      description:
        "Upon physical arrival, the delivery is marked complete. Stock is safely deducted from the source and added to the destination.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar scrolled={scrolled} />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-40 pb-32">
        <div className="pointer-events-none absolute inset-0 grid-hero-bg opacity-30" style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)" }} />

        <div className="relative mx-auto max-w-[1600px] px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            {/* Hero Left Content */}
            <div className="mb-16 flex-1 lg:mb-0">
              <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-border/50 bg-accent/20 px-3 py-1.5 backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-logistics-cyan opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-logistics-cyan" />
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  BlockMaps 1.0 is Live
                </span>
              </div>

              <h1 className="mb-6 max-w-2xl text-[48px] font-medium leading-[1.05] tracking-tight text-foreground lg:text-[64px]">
                Manage your warehouse with total clarity.
              </h1>

              <p className="mb-10 max-w-xl text-[18px] leading-relaxed text-muted-foreground">
                BlockMaps is a modern warehouse management system. Map your facility, track inventory movements in real-time, and streamline your entire logistics operation.
              </p>

              <div className="flex items-center gap-4">
                <a
                  href="/login"
                  className="flex h-10 items-center justify-center gap-2 rounded-sm bg-foreground px-6 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
                >
                  Sign In
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2,6 L10,6 M7,3 L10,6 L7,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </a>
                <a
                  href="#features"
                  className="flex h-10 items-center justify-center rounded-sm border border-border px-6 text-[13px] font-medium text-foreground transition-colors hover:bg-accent/30"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Hero Right / Preview */}
            <div className="flex-1 lg:w-[800px] lg:flex-none">
              <TacticalMapPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section id="architecture" className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-[1600px] px-8 py-10">
          <div className="flex flex-wrap items-center justify-between gap-12 divide-x divide-border/0 md:divide-border/50">
            <StatItem value="99.9%" label="System Reliability" />
            <StatItem value="<30ms" label="Transaction Latency" />
            <StatItem value="ACID" label="Database Integrity" />
            <StatItem value="Isolated" label="Tenant Architecture" />
          </div>
        </div>
      </section>

      {/* ── FEATURES STRIP ── */}
      <section id="features" className="py-32">
        <div className="mx-auto max-w-[1600px] px-8">
          <div className="mb-16 max-w-2xl">
            <h2 className="mb-4 text-[32px] font-medium tracking-tight text-foreground">
              Built for precision.
            </h2>
            <p className="text-[18px] leading-relaxed text-muted-foreground">
              No complex abstractions. Just clear facility mapping, reliable workflows,
              and safe delivery tracking. Designed for operators and managers who demand
              a system that simply works.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section id="workflow" className="border-t border-border py-32 bg-card/20">
        <div className="mx-auto max-w-[1600px] px-8">
          <div className="grid grid-cols-1 gap-20 lg:grid-cols-2">
            <div>
              <div className="mb-12">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  How It Works
                </p>
                <h2 className="mb-4 text-[32px] font-medium tracking-tight text-foreground">
                  A reliable operational workflow.
                </h2>
                <p className="text-[18px] leading-relaxed text-muted-foreground">
                  Processes are clearly defined. Zones are mapped before inventory is added. Inventory
                  must exist before deliveries can occur. Every action passes through strict
                  safety checks. Predictable at every step.
                </p>
              </div>

              <div>
                {workflowSteps.map((step, i) => (
                  <WorkflowStep
                    key={step.step}
                    {...step}
                    isLast={i === workflowSteps.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* Workflow state machine visualization */}
            <div className="flex flex-col justify-center rounded-sm border border-border bg-background p-8">
              <p className="mb-8 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                Delivery State Machine
              </p>
              <div className="space-y-4">
                {[
                  { state: "PENDING", color: "var(--logistics-amber)", desc: "Operator submission" },
                  { state: "APPROVED", color: "var(--logistics-cyan)", desc: "Manager sign-off · Reserve" },
                  { state: "IN_PROGRESS", color: "var(--foreground)", desc: "Physical transit" },
                  { state: "COMPLETED", color: "var(--logistics-green)", desc: "Commit transaction" },
                ].map((s, i, arr) => (
                  <div key={s.state} className="relative">
                    <div className="flex items-center gap-4 rounded-sm border border-border bg-card p-4 transition-colors hover:border-border/80">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span className="font-mono text-[12px] font-medium tracking-widest" style={{ color: s.color }}>
                          {s.state}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {s.desc}
                        </span>
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="absolute -bottom-4 left-6 h-4 w-px bg-border/80" />
                    )}
                  </div>
                ))}
              </div>

              {/* REJECTED / CANCELLED */}
              <div className="mt-8 grid grid-cols-2 gap-4 pt-8 border-t border-border">
                {[
                  { state: "REJECTED", color: "var(--logistics-red)" },
                  { state: "CANCELLED", color: "var(--muted-foreground)" },
                ].map((s) => (
                  <div
                    key={s.state}
                    className="flex items-center gap-3 rounded-sm border border-border bg-card/50 p-3"
                  >
                    <div className="h-1.5 w-1.5 rounded-full opacity-60" style={{ backgroundColor: s.color }} />
                    <span className="font-mono text-[10px] tracking-widest" style={{ color: s.color }}>
                      {s.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="border-t border-border py-40">
        <div className="mx-auto max-w-[1600px] px-8 text-center">
          <h2 className="mb-6 text-[40px] font-medium tracking-tight text-foreground">
            Get started with BlockMaps.
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-[18px] leading-relaxed text-muted-foreground">
            Create your account today. Start mapping your warehouse and tracking inventory in minutes. No complex setup required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/register"
              className="flex h-12 items-center justify-center gap-2 rounded-sm bg-foreground px-8 text-[14px] font-medium text-background transition-all hover:bg-foreground/90"
            >
              Sign Up Now
            </a>
            <a
              href="#features"
              className="flex h-12 items-center justify-center rounded-sm border border-border px-8 text-[14px] font-medium text-foreground transition-colors hover:bg-accent/30"
            >
              View Features
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-12 bg-card/30">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-6 px-8 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center">
               <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0.5" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-amber)" strokeWidth="1" fill="none" />
                <rect x="8" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-cyan)" strokeWidth="1" fill="none" />
                <rect x="0.5" y="8" width="5.5" height="5.5" stroke="var(--logistics-green)" strokeWidth="1" fill="none" />
                <rect x="8" y="8" width="5.5" height="5.5" stroke="oklch(0.48 0.004 260)" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <span className="text-[13px] font-medium text-foreground">
              BlockMaps
            </span>
          </div>
          <div className="flex items-center gap-8">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Logistics OS Kernel
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
              © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
