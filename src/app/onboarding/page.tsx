"use client";

import { useState } from "react";
import { Plus, Users, ArrowRight, Building2, Building, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function OnboardingPage() {
  const [view, setView] = useState<"SELECT" | "CREATE" | "JOIN">("SELECT");
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { update } = useSession();
  const utils = api.useUtils();
  
  // Auto-recovery if database has company but session cookie doesn't
  const { data: existingCompany, isLoading: checkingCompany } = api.company.getCurrent.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (existingCompany?.id) {
      void update({ companyId: existingCompany.id, role: "ADMIN" }).then(() => {
        window.location.href = "/dashboard";
      });
    }
  }, [existingCompany, update]);

  const createCompany = api.company.create.useMutation({
    onSuccess: async (data) => {
      await update({ companyId: data.id, role: "ADMIN" });
      utils.company.getCurrent.invalidate();
      window.location.href = "/dashboard";
    },
    onError: async (err) => {
      if (err.message === "You already belong to a company") {
        const current = await utils.company.getCurrent.fetch();
        if (current) {
          await update({ companyId: current.id, role: "ADMIN" });
          window.location.href = "/dashboard";
          return;
        }
      }
      setError(err.message);
      setLoading(false);
    },
  });

  // Note: the backend API might not have a specific join route yet,
  // we will map this to the appropriate invite acceptance logic once available
  // For now, this is just a placeholder action.
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    setError("");
    createCompany.mutate({ 
      name: companyName.trim(), 
      slug: companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') 
    });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");
    // TODO: implement join logic via API
    // joinCompany.mutate({ inviteCode: inviteCode.trim() });
    setTimeout(() => {
      setError("Joining by code is not yet implemented on the server.");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background items-center justify-center">
      {/* ── BACKGROUND GRIDS ── */}
      <div className="pointer-events-none absolute inset-0 grid-dot-bg opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, color-mix(in oklch, var(--logistics-cyan) 6%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-sm border border-border/80 bg-card shadow-sm">
            <Building2 className="h-6 w-6 text-logistics-cyan" />
          </div>
          <h1 className="text-[28px] font-medium tracking-tight text-foreground">
            Welcome to BlockMaps
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {checkingCompany ? "Checking workspace status..." : view === "SELECT" ? "Let's set up your operational workspace." : view === "CREATE" ? "Create a new company workspace." : "Join an existing workspace."}
          </p>
        </div>

        {checkingCompany ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-logistics-cyan" />
          </div>
        ) : view === "SELECT" && (
          <div className="grid gap-4">
            <button
              onClick={() => setView("CREATE")}
              className="group flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-6 text-center transition-all hover:border-logistics-cyan/50 hover:bg-accent/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-logistics-cyan/10 text-logistics-cyan transition-transform group-hover:scale-110">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Create New Workspace</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">Set up a new organization and invite your team</p>
              </div>
            </button>

            <button
              onClick={() => setView("JOIN")}
              className="group flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-6 text-center transition-all hover:border-logistics-amber/50 hover:bg-accent/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-logistics-amber/10 text-logistics-amber transition-transform group-hover:scale-110">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Join Existing Workspace</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">Enter an invite code provided by your administrator</p>
              </div>
            </button>
          </div>
        )}

        {view === "CREATE" && (
          <form onSubmit={handleCreate} className="rounded-md border border-border bg-card p-6 shadow-xl">
            {error && (
              <div className="mb-5 rounded-sm border border-logistics-red/20 bg-logistics-red/10 px-4 py-3 text-[12px] text-logistics-red">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground">
                Company Name
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-sm border border-border bg-background py-2 pl-9 pr-3 text-[14px] text-foreground outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30"
                  placeholder="Acme Logistics Inc."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setView("SELECT"); setError(""); }}
                className="flex flex-1 items-center justify-center rounded-sm border border-border px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </form>
        )}

        {view === "JOIN" && (
          <form onSubmit={handleJoin} className="rounded-md border border-border bg-card p-6 shadow-xl">
            {error && (
              <div className="mb-5 rounded-sm border border-logistics-red/20 bg-logistics-red/10 px-4 py-3 text-[12px] text-logistics-red">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground">
                Invite Code
              </label>
              <input
                autoFocus
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[14px] font-mono text-foreground outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30"
                placeholder="XXXX-XXXX"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setView("SELECT"); setError(""); }}
                className="flex flex-1 items-center justify-center rounded-sm border border-border px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Join Workspace"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
