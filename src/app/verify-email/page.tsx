"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, MailCheck, AlertCircle } from "lucide-react";
import { verifyEmailAction, resendVerificationAction } from "@/server/actions/users.action";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "expired" | "already_verified" | "error"
  >("loading");
  
  const [errorMessage, setErrorMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found in URL.");
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyEmailAction(token);
        
        if (result.success) {
          setStatus("success");
        } else {
          if (result.error === "Email is already verified.") {
            setStatus("already_verified");
          } else if (result.error === "Verification link has expired.") {
            setStatus("expired");
          } else {
            setStatus("error");
            setErrorMessage(result.error);
          }
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage("An unexpected error occurred during verification.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      <div className="pointer-events-none absolute inset-0 grid-dot-bg opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, color-mix(in oklch, var(--logistics-cyan) 6%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-[360px] text-center">
          
          {status === "loading" && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <Loader2 className="mb-6 h-12 w-12 animate-spin text-muted-foreground" />
              <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                Verifying Email
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-logistics-green/10 text-logistics-green">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                Email Verified
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                Your account is now active and ready to use.
              </p>
              
              <Link
                href="/login"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
              >
                Continue to Sign In
              </Link>
            </div>
          )}

          {status === "already_verified" && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-logistics-cyan/10 text-logistics-cyan">
                <MailCheck className="h-8 w-8" />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                Email Already Verified
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                Your email address has already been verified.
              </p>
              
              <Link
                href="/login"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-logistics-amber/10 text-logistics-amber">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                Verification Link Expired
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                Your verification link has expired. Please request a new one by signing in.
              </p>
              
              <Link
                href="/login"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-logistics-red/10 text-logistics-red">
                <XCircle className="h-8 w-8" />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                Verification Failed
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                {errorMessage}
              </p>
              
              <Link
                href="/login"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
              >
                Go to Sign In
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
