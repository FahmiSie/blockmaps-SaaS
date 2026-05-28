// src/app/(testing)/example/page.tsx
// Contoh sederhana penggunaan tRPC + Server Action untuk junior dev

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { createItemAction } from "@/server/actions/item.action";

// ─────────────────────────────────────────────────────────────
// Ini adalah contoh page yang menunjukkan:
// 1. tRPC useQuery  → ambil data dari server
// 2. tRPC useMutation → ubah data, auto-refresh
// 3. Server Action  → alternatif mutation tanpa tRPC
// ─────────────────────────────────────────────────────────────

export default function ExamplePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">tRPC + Server Action Example</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Contoh sederhana untuk junior dev — baca komentar di source code!
        </p>
      </div>

      <TrpcQueryExample />
      <TrpcMutationExample />
      <ServerActionExample />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTOH 1: tRPC useQuery
// Gunakan ini untuk MENGAMBIL data dari server.
// Data otomatis di-cache dan bisa di-refetch.
// ─────────────────────────────────────────────────────────────
function TrpcQueryExample() {
  // useQuery memanggil router `zone.list` di server
  // `data` berisi hasil, `isLoading` true saat pertama load
  const { data: zones, isLoading } = api.zone.list.useQuery({
    includeInactive: false,
  });

  return (
    <div className="rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">1. tRPC useQuery</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Panggil: <code className="rounded bg-zinc-100 px-1">api.zone.list.useQuery()</code>
      </p>

      {isLoading && <p className="text-sm text-zinc-400">Loading...</p>}

      {!isLoading && !zones?.length && (
        <p className="text-sm text-zinc-400">
          Belum ada zone. Buat dulu di bawah.
        </p>
      )}

      <ul className="space-y-1">
        {zones?.map((zone) => (
          <li
            key={zone.id}
            className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
          >
            <span className="font-medium">{zone.name}</span>
            <span className="text-xs text-zinc-400">{zone.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTOH 2: tRPC useMutation
// Gunakan ini untuk MENGUBAH data (create/update/delete).
// Setelah berhasil, invalidate query agar data refresh otomatis.
// ─────────────────────────────────────────────────────────────
function TrpcMutationExample() {
  const [name, setName] = useState("");
  const utils = api.useUtils(); // untuk invalidate / refresh query

  // useMutation memanggil router `delivery.create` di server
  const createZone = api.zone.create?.useMutation({
    onSuccess: () => {
      setName("");
      // Setelah berhasil → refresh list zone di atas
      void utils.zone.list.invalidate();
    },
    onError: (err) => {
      alert(`Error: ${err.message}`);
    },
  });

  return (
    <div className="rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">2. tRPC useMutation</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Panggil: <code className="rounded bg-zinc-100 px-1">api.zone.create.useMutation()</code>
        {" "}— list di atas auto-refresh setelah berhasil
      </p>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama zone baru..."
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          onClick={() =>
            createZone?.mutate({
              name,
              type: "STORAGE",
              positionX: 0,
              positionY: 0,
              width: 200,
              height: 150,
            })
          }
          disabled={!name || createZone?.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {createZone?.isPending ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTOH 3: Server Action
// Alternatif dari tRPC mutation — lebih sederhana, tanpa setup.
// Cocok untuk form atau aksi yang tidak perlu optimistic update.
// Kekurangan: tidak auto-invalidate tRPC cache.
// ─────────────────────────────────────────────────────────────
function ServerActionExample() {
  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleCreate() {
    if (!itemName) return;
    setLoading(true);
    setResult(null);

    // Langsung panggil server action — tidak perlu setup apapun
    const res = await createItemAction({
      name: itemName,
      sku: `SKU-${Date.now()}`,
      unit: "pcs",
    });

    setLoading(false);

    if (res.success) {
      setResult(`✓ Item "${itemName}" berhasil dibuat!`);
      setItemName("");
    } else {
      setResult(`✗ Error: ${res.error}`);
    }
  }

  return (
    <div className="rounded-xl border p-5">
      <h2 className="mb-1 font-semibold">3. Server Action</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Panggil: <code className="rounded bg-zinc-100 px-1">await createItemAction({"{}"})</code>
        {" "}— tidak perlu tRPC, langsung async/await
      </p>

      <div className="flex gap-2">
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Nama item baru..."
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          onClick={handleCreate}
          disabled={!itemName || loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>

      {result && (
        <p
          className={`mt-3 text-sm ${result.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}
        >
          {result}
        </p>
      )}

      <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
        <p className="font-medium text-zinc-700">Kapan pakai mana?</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li><strong>useQuery</strong> — ambil data, perlu cache & loading state</li>
          <li><strong>useMutation</strong> — ubah data, perlu invalidate query lain</li>
          <li><strong>Server Action</strong> — form sederhana, tidak perlu invalidate</li>
        </ul>
      </div>
    </div>
  );
}