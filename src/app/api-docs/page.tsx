import React from "react";
import DocsClient from "./docs-client";
import { Lock, ShieldAlert, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ApiDocsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  // Token configuration validation
  const validToken = process.env.API_DOCS_TOKEN || "blockmaps-secret-docs-token-2026";
  const isAuthenticated = token === validToken;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 selection:bg-red-500/20 selection:text-red-400">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/40 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/5 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full"></div>

          {/* Icon Badge */}
          <div className="w-14 h-14 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-red-400/90 shadow-inner mb-6">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>

          <h1 className="text-xl font-bold tracking-tight mb-2 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Protected Api Documentations
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            Access to the interactive Swagger specifications is restricted. Please provide a valid documentation token.
          </p>

          {/* Access form */}
          <form method="GET" action="/api-docs" className="w-full flex flex-col gap-4">
            <div className="relative">
              <input
                type="password"
                name="token"
                placeholder="Enter access token..."
                required
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none transition placeholder-zinc-600"
              />
              <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-zinc-600" />
            </div>

            {token && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-left mt-1">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Incorrect token. Check your environment variables config.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm py-3 px-4 rounded-xl shadow-lg shadow-zinc-100/5 active:scale-[0.98] transition cursor-pointer"
            >
              Unlock Documentation
            </button>
          </form>

          <div className="mt-8 border-t border-zinc-800/80 pt-4 w-full text-[11px] text-zinc-500">
            Configure <code className="text-zinc-400 font-mono bg-zinc-950 px-1 py-0.5 rounded">API_DOCS_TOKEN</code> in your environment variables.
          </div>
        </div>
      </div>
    );
  }

  return <DocsClient />;
}
