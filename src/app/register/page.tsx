"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { registerAction } from "@/server/actions/users.action";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await registerAction({
        name,
        email,
        password,
      });

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Failed to create account.");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
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
          href="/login" 
          className="absolute left-8 top-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>

        {/* Auth Container */}
        <div className="mx-auto w-full max-w-[360px]">
          
          {success ? (
            <div className="mb-10 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-logistics-green/10 text-logistics-green">
                <MailCheck className="h-8 w-8" />
              </div>
              <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                Check Your Email
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                We've sent a verification link to <br/>
                <span className="font-medium text-foreground">{email}</span>
              </p>
              
              <div className="mt-8 space-y-3">
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Logo & Header */}
              <div className="mb-10 text-center">
                <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-sm border border-border/80 bg-card shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                    <rect x="0.5" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-cyan)" strokeWidth="1" fill="none" />
                    <rect x="8" y="0.5" width="5.5" height="5.5" stroke="var(--logistics-amber)" strokeWidth="1" fill="none" />
                    <rect x="0.5" y="8" width="5.5" height="5.5" stroke="var(--border)" strokeWidth="1" fill="none" />
                    <rect x="8" y="8" width="5.5" height="5.5" stroke="var(--logistics-green)" strokeWidth="1" fill="none" />
                  </svg>
                </div>
                <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                  Create Account
                </h2>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  Register a new account to access BlockMaps.
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
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 placeholder:text-muted-foreground/40"
                      placeholder="Jane Doe"
                      minLength={2}
                      maxLength={100}
                    />
                  </div>

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
                    <label className="text-[12px] font-medium text-foreground">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 placeholder:text-muted-foreground/40"
                      placeholder="Choose a password"
                      minLength={8}
                      maxLength={100}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                      </>
                    ) : (
                      <>
                        Sign Up <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}

          {!success && (
            <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground transition-colors hover:underline">
               Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
