"use client";

import { api } from "@/trpc/react";
import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/utils";
import Image from "next/image";
import {
  User, Bell, Shield, Palette, Sliders,
  Camera, Check, Loader2, Eye, EyeOff, Save,
} from "lucide-react";

/* ─── Tab types ──────────────────────────────────────────── */
type Tab = "profile" | "preferences" | "notifications" | "security" | "appearance";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Sliders },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
];

/* ─── Reusable field row ─────────────────────────────────── */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start gap-8 py-5 border-b" style={{ borderColor: "var(--border-base)" }}>
      <div className="w-48 flex-shrink-0">
        <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        {hint && <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, readOnly, type = "text" }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className="w-full max-w-sm rounded-sm border px-3 py-2 text-[13px] outline-none transition-colors"
      style={{
        background: readOnly ? "var(--bg-overlay)" : "var(--bg-elevated)",
        borderColor: "var(--border-base)",
        color: readOnly ? "var(--text-tertiary)" : "var(--text-primary)",
        cursor: readOnly ? "not-allowed" : undefined,
      }}
      onFocus={e => { if (!readOnly) e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "var(--border-base)"; }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full max-w-sm rounded-sm border px-3 py-2 text-[13px] outline-none"
      style={{ background: "var(--bg-elevated)", borderColor: "var(--border-base)", color: "var(--text-primary)" }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-base)" }}>
      <div>
        <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
        {sub && <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative flex h-5 w-9 items-center rounded-full transition-colors duration-200"
        style={{ background: checked ? "var(--logistics-cyan)" : "var(--bg-overlay)" }}
      >
        <span
          className="absolute h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

/* ─── Profile Tab ────────────────────────────────────────── */
function ProfileTab() {
  const { data: me, isLoading, refetch } = api.user.me.useQuery();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const utils = api.useUtils();

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const updateAvatar = api.user.updateAvatar.useMutation();
  const removeAvatar = api.user.removeAvatar.useMutation();

  function validateImageFile(file: File): string | null {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG, or WebP files are allowed.';
    }
    if (file.size > 2 * 1024 * 1024) {
      return 'File size must be under 2MB.';
    }
    return null;
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await updateAvatar.mutateAsync({ base64 });
      toast.success('Profile photo updated.');
      await utils.user.me.invalidate();
    } catch {
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setIsUploading(true);
    try {
      await removeAvatar.mutateAsync();
      toast.success('Profile photo removed.');
      await utils.user.me.invalidate();
    } catch {
      toast.error('Failed to remove photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) return <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>Loading profile...</div>;

  const displayName = name || me?.name || "";
  const avatarUrl = me?.image ?? null;
  const initials = me?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??';
  const roleBg: Record<string, string> = { ADMIN: "#0891b2", MANAGER: "#f59e0b", OPERATOR: "#6b7280" };

  return (
    <div>
      <Field label="Avatar" hint="Your profile photo">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-[18px] font-bold overflow-hidden"
            style={{ background: "var(--bg-overlay)", color: "var(--text-primary)", border: "2px solid var(--border-base)" }}>
            {avatarUrl ? <Image src={avatarUrl} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : initials}
          </div>
          <input 
            type="file" 
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleAvatarUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-accent/50 disabled:opacity-50"
            style={{ borderColor: "var(--border-base)", color: "var(--text-secondary)" }}>
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {isUploading ? "Uploading..." : "Upload Photo"}
          </button>
          {avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              disabled={isUploading}
              className="px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-red-500/10 disabled:opacity-50 rounded-sm"
              style={{ color: "#ef4444" }}
            >
              Remove
            </button>
          )}
        </div>
      </Field>

      <Field label="Full Name" hint="Your display name across the platform">
        <Input
          value={displayName}
          onChange={setName}
          placeholder={me?.name ?? "Your name"}
        />
      </Field>

      <Field label="Email Address" hint="Used for login cannot be changed here">
        <Input value={me?.email ?? ""} readOnly />
      </Field>

      <Field label="Role" hint="Assigned by your company administrator">
        <div className="flex items-center gap-2">
          <span className="rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: `${roleBg[me?.role ?? "OPERATOR"]}20`, color: roleBg[me?.role ?? "OPERATOR"] }}>
            {me?.role ?? "OPERATOR"}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Contact an admin to change your role</span>
        </div>
      </Field>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => { if (name.trim()) updateProfile.mutate({ name: name.trim() }); }}
          disabled={updateProfile.isPending || !name.trim()}
          className="flex items-center gap-2 rounded-sm px-4 py-2 text-[13px] font-medium transition-all disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--bg-base)" }}
        >
          {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ─── Preferences Tab ────────────────────────────────────── */
function PreferencesTab() {
  const [view, setView] = useState("map");
  const [density, setDensity] = useState("comfortable");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [language, setLanguage] = useState("en");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <Field label="Default Zone View" hint="How zones are displayed on the map page">
        <Select value={view} onChange={setView} options={[
          { value: "map", label: "Map View" },
          { value: "list", label: "List View" },
        ]} />
      </Field>
      <Field label="Table Density" hint="Controls row height in data tables">
        <Select value={density} onChange={setDensity} options={[
          { value: "compact", label: "Compact" },
          { value: "comfortable", label: "Comfortable (Default)" },
          { value: "spacious", label: "Spacious" },
        ]} />
      </Field>
      <Field label="Time Format" hint="How timestamps are displayed">
        <Select value={timeFormat} onChange={setTimeFormat} options={[
          { value: "24h", label: "24-hour (14:30)" },
          { value: "12h", label: "12-hour (2:30 PM)" },
        ]} />
      </Field>
      <Field label="Language" hint="Interface language">
        <Select value={language} onChange={setLanguage} options={[
          { value: "en", label: "English" },
          { value: "id", label: "Bahasa Indonesia" },
        ]} />
      </Field>
      <div className="mt-6">
        <button onClick={handleSave}
          className="flex items-center gap-2 rounded-sm px-4 py-2 text-[13px] font-medium transition-all"
          style={{ background: "var(--foreground)", color: "var(--bg-base)" }}>
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Saved!" : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

/* ─── Notifications Tab ──────────────────────────────────── */
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    deliveryUpdates: true,
    inventoryAlerts: true,
    zoneAlerts: false,
    systemNotifications: true,
  });
  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div>
      <p className="mb-5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
        Control which events trigger notifications for your account.
      </p>
      <Toggle checked={prefs.deliveryUpdates} onChange={() => toggle("deliveryUpdates")}
        label="Delivery Updates" sub="Notify when a delivery is approved, started, or completed" />
      <Toggle checked={prefs.inventoryAlerts} onChange={() => toggle("inventoryAlerts")}
        label="Inventory Alerts" sub="Notify when stock falls below the warning threshold" />
      <Toggle checked={prefs.zoneAlerts} onChange={() => toggle("zoneAlerts")}
        label="Zone Alerts" sub="Notify when a zone is deactivated or has delivery conflicts" />
      <Toggle checked={prefs.systemNotifications} onChange={() => toggle("systemNotifications")}
        label="System Notifications" sub="Platform updates, maintenance windows, and announcements" />
      <p className="mt-6 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        Note: Notification delivery depends on email configuration managed by your company admin.
      </p>
    </div>
  );
}

/* ─── Security Tab ──────────────────────────────────────── */
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters.'),
  confirmPassword: z.string().min(1, 'Please confirm your new password.'),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password.',
    path: ['newPassword'],
  }
);

type PasswordFormValues = z.infer<typeof passwordSchema>;

function SecurityTab() {
  const { data: me } = api.user.me.useQuery();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePassword = api.user.changePassword.useMutation();

  async function onSubmit() {
    form.handleSubmit(async (values) => {
      setIsSubmitting(true);
      try {
        await changePassword.mutateAsync({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        toast.success('Password changed successfully.');
        form.reset();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to change password.';
        if (message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('wrong')) {
          form.setError('currentPassword', { message: 'Current password is incorrect.' });
        } else {
          toast.error(message);
        }
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <div>
      <div className="mb-6 rounded-md p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)" }}>
        <p className="mb-1 text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>Current Session</p>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Logged in as <span style={{ color: "var(--text-secondary)" }}>{me?.email}</span>
        </p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Member since {me?.createdAt ? new Date(me.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
        </p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-md p-6">
        <h2 className="text-[18px] font-semibold text-[var(--text-primary)] mb-1">
          Change Password
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          Update your account password securely.
        </p>

        <div className="space-y-4 max-w-sm">
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[var(--text-primary)]">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                {...form.register('currentPassword')}
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:border-[var(--border-strong)] h-9 rounded-md px-3 pr-9 outline-none transition-colors"
              />
              <button onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" type="button">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.currentPassword && <p className="text-[12px] text-red-400">{form.formState.errors.currentPassword.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[var(--text-primary)]">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                {...form.register('newPassword')}
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:border-[var(--border-strong)] h-9 rounded-md px-3 pr-9 outline-none transition-colors"
              />
              <button onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" type="button">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.newPassword ? <p className="text-[12px] text-red-400">{form.formState.errors.newPassword.message}</p> : <p className="text-[12px] text-[var(--text-secondary)]">Must be at least 8 characters.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-[var(--text-primary)]">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                {...form.register('confirmPassword')}
                className="w-full bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:border-[var(--border-strong)] h-9 rounded-md px-3 pr-9 outline-none transition-colors"
              />
              <button onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" type="button">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && <p className="text-[12px] text-red-400">{form.formState.errors.confirmPassword.message}</p>}
          </div>

          <button onClick={onSubmit}
            disabled={isSubmitting}
            className="mt-2 flex h-9 items-center justify-center gap-2 rounded-sm px-4 text-[14px] font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--foreground)", color: "var(--bg-base)" }}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Appearance Tab ─────────────────────────────────────── */
function AppearanceTab() {
  const [compact, setCompact] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div>
      <div className="mb-6 rounded-md p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)" }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border-base)" }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Dark Industrial Theme</p>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>BlockMaps uses a fixed dark theme optimized for warehouse operators</p>
          </div>
          <span className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ background: "rgba(8,145,178,0.12)", color: "#0891b2" }}>Active</span>
        </div>
      </div>

      <Toggle checked={compact} onChange={setCompact}
        label="Compact Layout" sub="Reduce padding and spacing across all views" />
      <Toggle checked={reducedMotion} onChange={setReducedMotion}
        label="Reduced Motion" sub="Disable animations and transitions" />

      <p className="mt-6 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        Additional appearance customization options will be available in a future update.
      </p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export function SettingsClient() {
  const [tab, setTab] = useState<Tab>("profile");

  const TabContent = {
    profile: <ProfileTab />,
    preferences: <PreferencesTab />,
    notifications: <NotificationsTab />,
    security: <SecurityTab />,
    appearance: <AppearanceTab />,
  }[tab];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 border-b px-8 py-4"
        style={{ background: "var(--bg-base)", borderColor: "var(--border-base)" }}>
        <h1 className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Manage your personal account and preferences</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar Tabs ── */}
        <nav className="w-52 flex-shrink-0 border-r p-4" style={{ borderColor: "var(--border-base)" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="mb-0.5 flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium transition-colors text-left"
                style={{
                  background: active ? "var(--bg-overlay)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  borderLeft: active ? "2px solid var(--logistics-cyan)" : "2px solid transparent",
                }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {TabContent}
        </div>
      </div>
    </div>
  );
}
