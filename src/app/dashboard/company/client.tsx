"use client";

import { api } from "@/trpc/react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/utils";
import Image from "next/image";
import {
  Building2,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Users,
  Map,
  Package,
  Truck,
  X,
  Shield,
  LogOut,
  Trash2,
  Plus,
} from "lucide-react";
import { signOut } from "next-auth/react";

/* ─── Types ──────────────────────────────────────────────── */
interface CurrentUser {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/* ─── Reusable field ────────────────────────────────────── */
function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[12px] font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </label>
      {hint && (
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  readOnly,
  mono,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full rounded-sm border px-3 py-2 text-[13px] transition-colors outline-none ${mono ? "font-mono" : ""}`}
      style={{
        background: readOnly ? "var(--bg-overlay)" : "var(--bg-elevated)",
        borderColor: "var(--border-base)",
        color: readOnly ? "var(--text-tertiary)" : "var(--text-primary)",
        cursor: readOnly ? "not-allowed" : undefined,
      }}
      onFocus={(e) => {
        if (!readOnly)
          e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border-base)";
      }}
    />
  );
}

/* ─── Danger Confirm Modal ───────────────────────────────── */
function DangerModal({
  title,
  description,
  confirmLabel,
  confirmColor = "#ef4444",
  onConfirm,
  onClose,
  loading,
  confirmText,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  confirmText?: string;
}) {
  const [typed, setTyped] = useState("");
  const canConfirm = !confirmText || typed === confirmText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="w-full max-w-md rounded-md p-6 shadow-2xl"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-base)",
        }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h2
              className="text-[15px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h2>
            <p
              className="mt-1 text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto">
            <X className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {confirmText && (
          <div className="mb-4">
            <p
              className="mb-1.5 text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Type{" "}
              <span
                className="font-mono font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {confirmText}
              </span>{" "}
              to confirm
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-sm border px-3 py-2 font-mono text-[13px] outline-none"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-base)",
                color: "var(--text-primary)",
              }}
              placeholder={confirmText}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="hover:bg-accent/50 flex flex-1 items-center justify-center rounded-sm border py-2.5 text-[13px] transition-colors"
            style={{
              borderColor: "var(--border-base)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm py-2.5 text-[13px] font-medium text-white transition-all disabled:opacity-40"
            style={{ background: confirmColor }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-md p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-base)",
      }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p
          className="text-[24px] font-bold tabular-nums"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
        >
          {value}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

/* ─── Section Card wrapper ──────────────────────────────── */
function SectionCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-base)",
      }}
    >
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: "var(--border-base)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-0.5 rounded-full"
            style={{ background: "var(--logistics-cyan)" }}
          />
          <h2
            className="text-[13px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h2>
        </div>
        {sub && (
          <p
            className="mt-0.5 pl-3 text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {sub}
          </p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ─── No Company State ───────────────────────────────────── */
function NoCompanyState() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div
        className="sticky top-0 z-10 border-b px-8 py-4"
        style={{
          background: "var(--bg-base)",
          borderColor: "var(--border-base)",
        }}
      >
        <h1
          className="text-[18px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Company
        </h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Manage your organization information and settings
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-16">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-md border"
          style={{
            borderColor: "var(--border-base)",
            background: "var(--bg-surface)",
          }}
        >
          <Building2
            className="h-8 w-8"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>

        <div className="text-center">
          <p
            className="text-[16px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            No active company
          </p>
          <p
            className="mt-1.5 max-w-xs text-[13px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Your company may have been deleted or deactivated. Create a new
            workspace to get started again.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => (window.location.href = "/onboarding")}
            className="flex items-center gap-2 rounded-sm px-5 py-2.5 text-[13px] font-medium transition-all hover:opacity-90"
            style={{ background: "var(--foreground)", color: "var(--bg-base)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Create New Company
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 rounded-sm px-4 py-2 text-[12px] transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export function CompanyClient({ currentUser }: { currentUser: CurrentUser }) {
  const isAdmin = currentUser.role === "ADMIN";

  const {
    data: company,
    isLoading,
    error,
    refetch,
  } = api.company.getCurrent.useQuery(undefined, {
    retry: false,
  });

  const { data: summary } = api.company.dashboardSummary.useQuery(undefined, {
    retry: false,
    enabled: !!company,
  });

  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [isCompanyDeleting, setIsCompanyDeleting] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isLogoRemoving, setIsLogoRemoving] = useState(false);

  const [dangerModal, setDangerModal] = useState<
    "leave" | "transfer" | "delete" | null
  >(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const updateCompany = api.company.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const updateLogo = api.company.updateLogo.useMutation();
  const removeLogo = api.company.removeLogo.useMutation();
  const removeCompany = api.company.deleteCompany.useMutation();

  function validateImageFile(file: File): string | null {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Only JPG, PNG, or WebP files are allowed.";
    }
    if (file.size > 2 * 1024 * 1024) {
      return "File size must be under 2MB.";
    }
    return null;
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }

    setIsLogoUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await updateLogo.mutateAsync({ base64 });
      toast.success("Company logo updated.");
      refetch();
    } catch {
      toast.error("Failed to upload logo. Please try again.");
    } finally {
      setIsLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogoRemove() {
    setIsLogoRemoving(true);
    try {
      await removeLogo.mutateAsync();
      toast.success("Company logo removed.");
      refetch();
    } catch {
      toast.error("Failed to remove logo. Please try again.");
    } finally {
      setIsLogoRemoving(false);
    }
  }

  const handleSave = () => {
    const newName = name.trim() || company?.name;
    if (!newName) return;
    updateCompany.mutate({ name: newName });
  };

  const handleLeave = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  async function handleCompanyRemove() {
    setIsCompanyDeleting(true);
    try {
      await removeCompany.mutateAsync();
      toast.success("Company deleted.");
      await signOut({ callbackUrl: "/login" });
    } catch {
      toast.error("Failed to delete company. Please try again.");
    } finally {
      setIsCompanyDeleting(false);
    }
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    );
  }

  /* ── No company / deleted ── */
  if (error ?? !company) {
    return <NoCompanyState />;
  }

  const displayName = name || company.name;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 border-b px-8 py-4"
        style={{
          background: "var(--bg-base)",
          borderColor: "var(--border-base)",
        }}
      >
        <h1
          className="text-[18px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Company
        </h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Manage your organization information and settings
        </p>
      </div>

      <div className="flex-1 space-y-6 px-8 py-6">
        {/* ── Company Information ── */}
        <SectionCard
          title="Company Information"
          sub="Basic details about your organization"
        >
          <div className="flex items-start gap-8">
            <div className="flex flex-col gap-3">
              <div
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md text-[24px] font-bold"
                style={{
                  background: "var(--bg-overlay)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-base)",
                }}
              >
                {company.logoUrl ? (
                  <Image
                    src={company.logoUrl}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (company.name?.[0]?.toUpperCase() ?? "C")
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLogoUploading || !isAdmin}
                  className="hover:bg-accent/50 flex items-center justify-center gap-2 rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50"
                  style={{
                    borderColor: "var(--border-base)",
                    color: "var(--text-primary)",
                  }}
                >
                  {isLogoUploading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {isLogoUploading ? "Uploading..." : "Replace Logo"}
                </button>
                {company.logoUrl && isAdmin && (
                  <button
                    onClick={handleLogoRemove}
                    disabled={isLogoRemoving}
                    className="flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    style={{ color: "#ef4444", background: "transparent" }}
                  >
                    {isLogoRemoving && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {isLogoRemoving ? "Removing..." : "Remove"}
                  </button>
                )}
                <p
                  className="text-center text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  JPG, PNG, WebP. Max 2MB.
                </p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Company Name">
                <TextInput
                  value={displayName}
                  onChange={setName}
                  placeholder={company.name}
                  readOnly={!isAdmin}
                />
              </FormField>
              <FormField
                label="Company ID"
                hint="Unique identifier cannot be changed"
              >
                <TextInput value={company.id} readOnly mono />
              </FormField>
              <FormField label="Slug" hint="Used in URLs and references">
                <TextInput value={company.slug} readOnly mono />
              </FormField>
              <FormField label="Created" hint="When this workspace was set up">
                <TextInput
                  value={new Date(company.createdAt).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" },
                  )}
                  readOnly
                />
              </FormField>
            </div>
          </div>
          {isAdmin && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={updateCompany.isPending || !name.trim()}
                className="flex items-center gap-2 rounded-sm px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-50"
                style={{
                  background: "var(--foreground)",
                  color: "var(--bg-base)",
                }}
              >
                {updateCompany.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saved ? "Saved!" : "Save Changes"}
              </button>
              {updateCompany.isError && (
                <p className="text-[12px]" style={{ color: "#ef4444" }}>
                  {updateCompany.error.message}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Statistics ── */}
        <SectionCard
          title="Operational Statistics"
          sub="Current state of your facility"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Team Members"
              value={summary?.users ?? company._count.users}
              icon={Users}
              color="#0891b2"
            />
            <StatCard
              label="Active Zones"
              value={summary?.activeZones ?? company._count.zones}
              icon={Map}
              color="#059669"
            />
            <StatCard
              label="Inventory Items"
              value={summary?.items ?? company._count.items}
              icon={Package}
              color="#d97706"
            />
            <StatCard
              label="Total Deliveries"
              value={company._count.deliveries}
              icon={Truck}
              color="#6b7280"
            />
          </div>

          {summary && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[
                {
                  label: "Pending",
                  value: summary.deliveries.pending,
                  color: "#f59e0b",
                },
                {
                  label: "Approved",
                  value: summary.deliveries.approved,
                  color: "#0891b2",
                },
                {
                  label: "In Progress",
                  value: summary.deliveries.inProgress,
                  color: "#3b82f6",
                },
                {
                  label: "Completed",
                  value: summary.deliveries.completed,
                  color: "#22c55e",
                },
                {
                  label: "Rejected",
                  value: summary.deliveries.rejected,
                  color: "#ef4444",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-sm p-3 text-center"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-base)",
                  }}
                >
                  <p
                    className="text-[18px] font-bold tabular-nums"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </p>
                  <p
                    className="text-[10px] tracking-wide uppercase"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Organization Settings (Admin only) ── */}
        {isAdmin && (
          <SectionCard
            title="Organization Settings"
            sub="Default behaviors for your workspace"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <FormField
                label="Default Zone Capacity"
                hint="Maximum inventory units per zone (0 = unlimited)"
              >
                <TextInput value="0" readOnly />
              </FormField>
              <FormField
                label="Default Delivery Priority"
                hint="Priority assigned to new delivery requests"
              >
                <select
                  className="w-full rounded-sm border px-3 py-2 text-[13px] outline-none"
                  style={{
                    background: "var(--bg-elevated)",
                    borderColor: "var(--border-base)",
                    color: "var(--text-primary)",
                  }}
                  defaultValue="normal"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </FormField>
              <FormField
                label="Inventory Warning Threshold"
                hint="Alert when stock drops below this percentage"
              >
                <div className="flex items-center gap-2">
                  <TextInput value="20" readOnly />
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    %
                  </span>
                </div>
              </FormField>
            </div>
            <p
              className="mt-4 text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Note: These settings are stored locally. Server-side configuration
              management is available in future updates.
            </p>
          </SectionCard>
        )}

        {/* ── Danger Zone ── */}
        <div
          className="rounded-md"
          style={{
            border: "1px solid rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.04)",
          }}
        >
          <div
            className="border-b px-6 py-4"
            style={{ borderColor: "rgba(239,68,68,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
              <h2
                className="text-[13px] font-semibold"
                style={{ color: "#ef4444" }}
              >
                Danger Zone
              </h2>
            </div>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              These actions are permanent and cannot be undone
            </p>
          </div>
          <div
            className="divide-y p-0"
            style={{ borderColor: "rgba(239,68,68,0.1)" }}
          >
            {/* Leave Company */}
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p
                  className="text-[13px] font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Leave Company
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Remove yourself from {company.name}. You'll need a new
                  invitation to rejoin.
                </p>
              </div>
              <button
                onClick={() => setDangerModal("leave")}
                className="flex flex-shrink-0 items-center gap-2 rounded-sm border px-4 py-2 text-[12px] font-medium transition-colors hover:bg-red-500/10"
                style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Leave
              </button>
            </div>

            {/* Transfer Ownership (admin only) */}
            {isAdmin && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderColor: "rgba(239,68,68,0.1)" }}
              >
                <div>
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Transfer Ownership
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Transfer admin ownership to another member. This will demote
                    your role to Manager.
                  </p>
                </div>
                <button
                  onClick={() => setDangerModal("transfer")}
                  className="flex flex-shrink-0 items-center gap-2 rounded-sm border px-4 py-2 text-[12px] font-medium transition-colors hover:bg-red-500/10"
                  style={{
                    borderColor: "rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Transfer
                </button>
              </div>
            )}

            {/* Delete Company (admin only) */}
            {isAdmin && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderColor: "rgba(239,68,68,0.1)" }}
              >
                <div>
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Delete Company
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Permanently delete {company.name} and all associated zones,
                    inventory, and delivery records.
                  </p>
                </div>
                <button
                  onClick={() => setDangerModal("delete")}
                  className="flex flex-shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-[12px] font-medium transition-colors hover:opacity-90"
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Company
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Danger Modals ── */}
      {dangerModal === "leave" && (
        <DangerModal
          title="Leave Company"
          description={`You will be removed from ${company.name} immediately. All your access to zones, inventory, and deliveries will be revoked.`}
          confirmLabel="Leave Company"
          onConfirm={handleLeave}
          onClose={() => setDangerModal(null)}
        />
      )}
      {dangerModal === "transfer" && (
        <DangerModal
          title="Transfer Ownership"
          description="This feature requires selecting a new admin from the Users page. Go to the Users section and change a member's role to Admin, then your role will be updated."
          confirmLabel="Got it"
          confirmColor="var(--foreground)"
          onConfirm={() => setDangerModal(null)}
          onClose={() => setDangerModal(null)}
        />
      )}
      {dangerModal === "delete" && (
        <DangerModal
          title="Delete Company"
          description={`This will permanently destroy ${company.name} and ALL data including zones, inventory, and delivery history. This cannot be undone.`}
          confirmLabel="Delete Forever"
          confirmText={company.name}
          loading={isCompanyDeleting}
          onConfirm={handleCompanyRemove}
          onClose={() => setDangerModal(null)}
        />
      )}
    </div>
  );
}
