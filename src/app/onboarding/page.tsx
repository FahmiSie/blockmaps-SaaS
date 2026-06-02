"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Users, Building2, Building, Loader2, Clock, LogOut } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession, signOut } from "next-auth/react";

export default function OnboardingPage() {
  const [view, setView] = useState<"SELECT" | "CREATE" | "WAIT">("SELECT");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const { update } = useSession();
  const utils = api.useUtils();
  const hasRedirected = useRef(false);

  const {
    data: me,
    isLoading: checkingUser,
    refetch: refetchUser,
  } = api.user.me.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (me?.companyId && !hasRedirected.current) {
      hasRedirected.current = true;
      void update({ companyId: me.companyId, role: me.role }).then(() => {
        window.location.href = "/dashboard";
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const createCompany = api.company.create.useMutation({
    onSuccess: async (data) => {
      hasRedirected.current = true;
      await update({ companyId: data.id, role: "ADMIN" });
      utils.company.getCurrent.invalidate();
      window.location.href = "/dashboard";
    },
    onError: async (err) => {
      if (err.message === "You already belong to a company.") {
        try {
          const current = await utils.company.getCurrent.fetch();
          if (current && !hasRedirected.current) {
            hasRedirected.current = true;
            await update({ companyId: current.id, role: "ADMIN" });
            window.location.href = "/dashboard";
            return;
          }
        } catch {
          // company not found, continue showing error
        }
      }
      setStatusMessage(err.message);
      setLoading(false);
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    setStatusMessage("");
    createCompany.mutate({
      name: companyName.trim(),
      slug: companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"),
    });
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    setStatusMessage("");
    try {
      const res = await refetchUser();
      if (res.data?.companyId) {
        setStatusMessage("Invitation found! Redirecting...");
        // useEffect will handle the redirect
      } else {
        setStatusMessage(
          "No invitation detected yet. Please check again later or contact your administrator.",
        );
        setLoading(false);
      }
    } catch {
      setStatusMessage("Failed to check status. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* ── Background ── */}
      <div className="pointer-events-none absolute inset-0 grid-dot-bg opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, color-mix(in oklch, var(--logistics-cyan) 6%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* ── Header ── */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-sm border border-border/80 bg-card shadow-sm">
            <Building2 className="h-6 w-6 text-logistics-cyan" />
          </div>
          <h1 className="text-[28px] font-medium tracking-tight text-foreground">
            Welcome to BlockMaps
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {checkingUser
              ? "Checking workspace status..."
              : view === "SELECT"
                ? "Let's set up your operational workspace."
                : view === "CREATE"
                  ? "Create a new company workspace."
                  : "Waiting for workspace invitation."}
          </p>
        </div>

        {/* ── Loading / Checking ── */}
        {checkingUser ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-logistics-cyan" />
          </div>
        ) : (
          <>
            {/* ── SELECT ── */}
            {view === "SELECT" && (
              <div className="grid gap-4">
                <button
                  onClick={() => setView("CREATE")}
                  className="group flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-6 text-center transition-all hover:border-logistics-cyan/50 hover:bg-accent/40"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-logistics-cyan/10 text-logistics-cyan transition-transform group-hover:scale-110">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      Create New Workspace
                    </h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Set up a new organization and invite your team
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setView("WAIT")}
                  className="group flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-6 text-center transition-all hover:border-logistics-amber/50 hover:bg-accent/40"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-logistics-amber/10 text-logistics-amber transition-transform group-hover:scale-110">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      Wait for Invitation
                    </h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Wait for an administrator to invite you to their workspace
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* ── CREATE ── */}
            {view === "CREATE" && (
              <form
                onSubmit={handleCreate}
                className="rounded-md border border-border bg-card p-6 shadow-xl"
              >
                {statusMessage && (
                  <div className="mb-5 rounded-sm border border-logistics-red/20 bg-logistics-red/10 px-4 py-3 text-[12px] text-logistics-red">
                    {statusMessage}
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
                    onClick={() => {
                      setView("SELECT");
                      setStatusMessage("");
                    }}
                    className="flex flex-1 items-center justify-center rounded-sm border border-border px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !companyName.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Workspace"
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── WAIT ── */}
            {view === "WAIT" && (
              <div className="rounded-md border border-border bg-card p-6 text-center shadow-xl">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-logistics-amber/10 text-logistics-amber">
                  <Clock className="h-6 w-6" />
                </div>

                <h3 className="text-[16px] font-medium text-foreground">
                  Waiting for Invitation
                </h3>

                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  Ask your workspace administrator to invite your registered
                  email address:
                </p>
                <p className="mt-2 select-all break-all rounded-sm border border-border/50 bg-accent/50 px-3 py-1.5 font-mono text-[13px] font-medium text-foreground">
                  {me?.email}
                </p>

                {statusMessage && (
                  <div className="mt-4 rounded-sm border border-border bg-accent/30 px-3 py-2.5 text-[12px] text-muted-foreground">
                    {statusMessage}
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleCheckStatus}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Status"
                    )}
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setView("SELECT");
                        setStatusMessage("");
                      }}
                      className="flex-1 rounded-sm border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-logistics-red/20 px-3 py-2 text-[12px] font-medium text-logistics-red transition-colors hover:bg-logistics-red/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}