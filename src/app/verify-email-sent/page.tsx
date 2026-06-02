"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { resendVerificationEmailAction } from "@/server/actions/users.action";
import { toast } from "sonner";

function VerifyEmailSentContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email) {
      toast.error("Email address not found.");
      return;
    }
    
    setLoading(true);
    const res = await resendVerificationEmailAction(email);
    setLoading(false);

    if (res.success) {
      toast.success("Verification email resent successfully.");
    } else {
      toast.error(res.error || "Failed to resend email.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground selection:bg-foreground selection:text-background animate-in fade-in duration-700">
      
      {/* ── BACKGROUND GRIDS ── */}
      <div className="pointer-events-none absolute inset-0 grid-dot-bg opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, color-mix(in oklch, var(--logistics-cyan) 6%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Card Container */}
        <div className="rounded-md border border-border bg-card p-8 shadow-xl">
          
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border/80 bg-background shadow-sm">
              <Mail className="h-7 w-7 text-foreground" />
            </div>
            <h1 className="text-[24px] font-medium tracking-tight text-foreground">
              Check Your Email
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              We've sent a verification link to your email address{email ? ` (${email})` : ""}. Please open your inbox and click the verification link to activate your BlockMaps account. After verification, you can sign in and access your workspace.
            </p>
          </div>

          <div className="mb-8 rounded-sm border border-border bg-background/50 p-5">
            <ul className="space-y-3 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-logistics-green" />
                <span>Verification email sent</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-logistics-green" />
                <span>Check Inbox</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-logistics-green" />
                <span>Check Spam/Junk folder</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-logistics-green" />
                <span>Verification link may take a few minutes to arrive</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
            >
              Open Gmail <ArrowRight className="h-3.5 w-3.5" />
            </a>
            
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </Link>
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center">
            <h3 className="mb-2 text-[13px] font-medium text-foreground">Didn't receive the email?</h3>
            <ul className="mx-auto mb-4 w-fit text-[12px] text-muted-foreground leading-relaxed text-left list-disc">
              <li>Wait a few minutes.</li>
              <li>Check Spam/Junk folder.</li>
              <li>Contact your administrator if the problem persists.</li>
            </ul>
            
            <button 
              onClick={handleResend}
              disabled={loading || !email}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2 text-[12px] font-medium text-muted-foreground transition-all hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyEmailSentContent />
    </Suspense>
  );
}
