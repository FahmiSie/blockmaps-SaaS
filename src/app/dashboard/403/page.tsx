import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff, ArrowLeft, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Access Restricted — BlockMaps",
  description: "You do not have permission to access this area.",
};

export default function AccessDeniedPage() {
  return (
    <div
      className="flex h-full min-h-full flex-col items-center justify-center px-8 py-16"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Icon cluster */}
      <div className="relative mb-8 flex items-center justify-center">
        <div
          className="absolute h-40 w-40 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.6) 0%, transparent 70%)" }}
        />
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <Lock className="h-9 w-9" style={{ color: "#ef4444" }} />
        </div>
        {/* Small shield icon at corner */}
        <div
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-base)",
          }}
        >
          <ShieldOff className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {/* Text */}
      <div className="max-w-sm text-center">
        {/* Error code */}
        <p
          className="mb-3 font-mono text-[11px] font-medium uppercase tracking-widest"
          style={{ color: "rgba(239,68,68,0.6)" }}
        >
          Error 403 · Access Restricted
        </p>

        <h1
          className="mb-4 text-[28px] font-bold tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
        >
          Access Restricted
        </h1>

        <p
          className="mb-8 text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          You do not have permission to access this area.
          <br />
          Contact your administrator if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-sm px-6 py-2.5 text-[13px] font-medium transition-all hover:opacity-90"
            style={{ background: "var(--foreground)", color: "var(--bg-base)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-[12px] transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            Go to Settings
          </Link>
        </div>
      </div>

      {/* Bottom decoration — subtle grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}
