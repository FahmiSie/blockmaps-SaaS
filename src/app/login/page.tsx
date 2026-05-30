"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ArrowRight, Loader2, ArrowLeft, Mail } from "lucide-react";
import { resendVerificationAction } from "@/server/actions/users.action";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setIsUnverified(false);
    setResendStatus("idle");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === "EMAIL_NOT_VERIFIED") {
          setIsUnverified(true);
          setError("Your email address is not verified.");
        } else {
          setError("Invalid email or password.");
        }
        setLoading(false);
      } else if (res?.ok) {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus("loading");
    const result = await resendVerificationAction(email);
    if (result.success) {
      setResendStatus("success");
    } else {
      setResendStatus("error");
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      
      {/* ── BACKGROUND GRIDS ── */}
      <div className="pointer-events-none absolute inset-0 grid-dot-bg opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 50% 0%, color-mix(in oklch, var(--logistics-cyan) 6%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-12 lg:px-8">
        
        {/* Back Link */}
        <Link 
          href="/" 
          className="absolute left-8 top-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        {/* Auth Container */}
        <div className="mx-auto w-full max-w-[360px]">
          
          {/* Logo & Header */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-sm border border-border/80 bg-card shadow-sm">
              <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                <rect x="0.5" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-amber)" strokeWidth="1" fill="none" />
                <rect x="8" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-cyan)" strokeWidth="1" fill="none" />
                <rect x="0.5" y="8" width="5.5" height="5.5" stroke="var(--logistics-green)" strokeWidth="1" fill="none" />
                <rect x="8" y="8" width="5.5" height="5.5" stroke="var(--border)" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <h2 className="text-[24px] font-medium tracking-tight text-foreground">
              Sign In
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Welcome back to BlockMaps. Please enter your details.
            </p>
          </div>

          <div className="rounded-sm border border-border bg-card p-6 shadow-xl">
            {error && (
              <div className="mb-6 rounded-sm border border-logistics-red/20 bg-logistics-red/10 px-4 py-3 text-[12px] text-logistics-red">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 placeholder:text-muted-foreground/40"
                  placeholder="example@company.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-foreground">
                    Password
                  </label>
                  <a href="#" className="text-[12px] text-muted-foreground transition hover:text-foreground">
                    Forgot password?
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 placeholder:text-muted-foreground/40"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
              
              {isUnverified && (
                <div className="mt-4 rounded-sm border border-border bg-accent/30 p-4 text-center">
                  <p className="mb-3 text-[13px] text-muted-foreground">
                    You need to verify your email address before you can sign in.
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === "loading" || resendStatus === "success"}
                    className="flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-all hover:bg-accent/50 disabled:opacity-50"
                  >
                    {resendStatus === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : resendStatus === "success" ? (
                      "Verification Email Sent!"
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5" /> Resend Verification Email
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>

            <div className="my-6 flex items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="mx-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
                Or
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex w-full items-center justify-center gap-2.5 rounded-sm border border-border bg-background px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent/40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Don't have an account? {" "}
            <Link href="/register" className="text-foreground transition-colors hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
