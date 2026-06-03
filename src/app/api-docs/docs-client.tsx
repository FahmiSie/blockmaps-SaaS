"use client";

import React, { useState, useMemo } from "react";
import { endpoints, type Endpoint } from "./data";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Globe, 
  Layers,
  Terminal,
  ExternalLink,
  Info
} from "lucide-react";

export default function DocsClient() {
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("All");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique modules
  const modules = useMemo(() => {
    const mods = new Set<string>();
    endpoints.forEach(e => mods.add(e.module));
    return ["All", ...Array.from(mods)];
  }, []);

  // Filter endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter(e => {
      const matchesSearch = 
        e.path.toLowerCase().includes(search.toLowerCase()) ||
        e.summary.toLowerCase().includes(search.toLowerCase()) ||
        (e.description ?? "").toLowerCase().includes(search.toLowerCase());
      
      const matchesModule = selectedModule === "All" || e.module === selectedModule;
      
      return matchesSearch && matchesModule;
    });
  }, [search, selectedModule]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const newExpanded: Record<string, boolean> = {};
    filteredEndpoints.forEach(e => {
      newExpanded[e.id] = true;
    });
    setExpandedIds(newExpanded);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper styles for HTTP methods
  const getMethodBadgeClass = (method: 'GET' | 'POST') => {
    if (method === 'GET') {
      return "bg-blue-900/40 text-blue-400 border border-blue-800/60 font-bold px-3 py-1 rounded text-sm min-w-[70px] text-center";
    }
    return "bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 font-bold px-3 py-1 rounded text-sm min-w-[70px] text-center";
  };

  const getMethodPanelClass = (method: 'GET' | 'POST') => {
    if (method === 'GET') {
      return "border-blue-900/40 bg-zinc-900/40 hover:bg-zinc-900/60";
    }
    return "border-emerald-900/40 bg-zinc-900/40 hover:bg-zinc-900/60";
  };

  // Helper styles for security badges
  const getSecurityBadge = (security?: string) => {
    if (!security || security === 'Public') {
      return (
        <span className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">
          <Globe className="w-3 h-3 text-zinc-400" />
          Public
        </span>
      );
    }

    let color = "bg-purple-950/40 text-purple-400 border-purple-800/50";
    if (security === 'adminProcedure') {
      color = "bg-red-950/40 text-red-400 border-red-800/50";
    } else if (security === 'managerProcedure') {
      color = "bg-amber-950/40 text-amber-400 border-amber-800/50";
    } else if (security === 'operatorProcedure') {
      color = "bg-sky-950/40 text-sky-400 border-sky-800/50";
    } else if (security === 'protectedProcedure') {
      color = "bg-indigo-950/40 text-indigo-400 border-indigo-800/50";
    }

    return (
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${color}`}>
        <Lock className="w-3 h-3" />
        {security}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      
      {/* ── HEADER ── */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-lg shadow-emerald-500/5">
            B
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Blockmaps API Swagger Docs
            </h1>
            <p className="text-xs text-zinc-400">
              Interactive OpenAPI / tRPC Specifications Explorer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={expandAll}
            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
          >
            Expand All
          </button>
          <button 
            onClick={collapseAll}
            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
          >
            Collapse All
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* ── SIDEBAR FILTERS ── */}
        <aside className="w-full lg:w-64 border-r border-zinc-800 p-6 flex flex-col gap-6 bg-zinc-900/20">
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Search API
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search path, summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 pl-9 text-sm focus:outline-none focus:border-emerald-500 transition placeholder-zinc-500"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Filter Modules
            </h2>
            <div className="flex flex-col gap-1">
              {modules.map(mod => (
                <button
                  key={mod}
                  onClick={() => setSelectedModule(mod)}
                  className={`w-full text-left text-sm px-3 py-2 rounded transition flex items-center justify-between ${
                    selectedModule === mod 
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 font-medium" 
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  <span>{mod}</span>
                  {selectedModule === mod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-800 pt-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>tRPC Integration</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                tRPC endpoints accept queries via GET (json search param) and mutations via POST with body: 
                <code className="text-emerald-400 font-mono block mt-1 bg-zinc-950 p-1 rounded border border-zinc-800/80">
                  {"{ \"json\": payload }"}
                </code>
              </p>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENTS ── */}
        <main className="flex-1 p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto max-w-5xl">
          
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="text-sm text-zinc-400">
              Showing <span className="font-semibold text-zinc-200">{filteredEndpoints.length}</span> endpoints
            </div>
          </div>

          {filteredEndpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-lg">
              <Terminal className="w-10 h-10 text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm">No matching API endpoints found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredEndpoints.map((ep) => {
                const isExpanded = !!expandedIds[ep.id];
                const prefix = ep.module === "REST API" ? "" : "/api/trpc/";
                const fullPath = `${prefix}${ep.path}`;

                return (
                  <div
                    key={ep.id}
                    className={`border rounded-lg transition-all duration-200 overflow-hidden shadow-md shadow-black/20 ${getMethodPanelClass(ep.method)}`}
                  >
                    {/* ── CARD HEADER ── */}
                    <div
                      onClick={() => toggleExpand(ep.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={getMethodBadgeClass(ep.method)}>
                          {ep.method}
                        </span>
                        <code className="font-mono text-sm font-semibold text-zinc-200 tracking-tight break-all">
                          {fullPath}
                        </code>
                        <span className="text-xs text-zinc-400 font-medium">
                          {ep.summary}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {getSecurityBadge(ep.security)}
                        <span className="text-xs bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                          {ep.module}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* ── CARD EXPANDED DETAILS ── */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-6">
                        {/* Description */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                            Description
                          </h4>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {ep.description}
                          </p>
                        </div>

                        {/* Parameters / Input Schema */}
                        {ep.parameters && ep.parameters.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                              Parameters & Request Schema
                            </h4>
                            <div className="flex flex-col gap-4">
                              {/* Params Table */}
                              <div className="overflow-x-auto border border-zinc-800 rounded">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold">
                                      <th className="p-3">Name</th>
                                      <th className="p-3">In</th>
                                      <th className="p-3">Type</th>
                                      <th className="p-3">Required</th>
                                      <th className="p-3">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                                    {ep.parameters.map((p, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-900/40">
                                        <td className="p-3 font-mono font-bold text-emerald-400">{p.name}</td>
                                        <td className="p-3 font-mono text-zinc-400">{p.in}</td>
                                        <td className="p-3 font-mono text-zinc-400">{p.type}</td>
                                        <td className="p-3">
                                          {p.required ? (
                                            <span className="text-red-400 font-semibold">Yes</span>
                                          ) : (
                                            <span className="text-zinc-500">No</span>
                                          )}
                                        </td>
                                        <td className="p-3">{p.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Parameter Payload JSON Schema */}
                              {ep.parameters.map((p, idx) => p.schema && (
                                <div key={idx} className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                                    <span>Payload Schema for `{p.name}`:</span>
                                    <button
                                      onClick={() => handleCopy(p.schema || "", `${ep.id}-req-${idx}`)}
                                      className="text-zinc-400 hover:text-emerald-400 transition flex items-center gap-1 cursor-pointer"
                                    >
                                      {copiedId === `${ep.id}-req-${idx}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="bg-zinc-900/80 border border-zinc-800 p-4 rounded text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed max-h-[300px]">
                                    {p.schema}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Responses */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                            Responses
                          </h4>
                          <div className="flex flex-col gap-4">
                            {ep.responses.map((resp, idx) => (
                              <div key={idx} className="border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
                                {/* Code Header */}
                                <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                                      String(resp.code).startsWith('2') 
                                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/40" 
                                        : "bg-red-950 text-red-400 border border-red-800/40"
                                    }`}>
                                      {resp.code}
                                    </span>
                                    <span className="text-xs text-zinc-300 font-medium">
                                      {resp.description}
                                    </span>
                                  </div>

                                  {resp.schema && (
                                    <button
                                      onClick={() => handleCopy(resp.schema || "", `${ep.id}-res-${idx}`)}
                                      className="text-zinc-400 hover:text-emerald-400 transition flex items-center gap-1 text-xs cursor-pointer"
                                    >
                                      {copiedId === `${ep.id}-res-${idx}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>Copy Schema</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                {/* Schema Body */}
                                {resp.schema && (
                                  <pre className="p-4 text-xs font-mono overflow-x-auto text-sky-300 bg-zinc-950/60 leading-relaxed max-h-[300px]">
                                    {resp.schema}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-800 bg-zinc-900 py-6 px-6 text-center text-xs text-zinc-500">
        Blockmaps SaaS System Documentation | Generated in 2026.
      </footer>
    </div>
  );
}
