"use client";

import { useState } from "react";

export function GenerateRedoLinkButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ready"; url: string; copied: boolean }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function generate() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/generate-redo-link`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      setState({ kind: "ready", url, copied: false });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Erreur" });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setState({ kind: "ready", url, copied: true });
      setTimeout(() => setState((s) => (s.kind === "ready" ? { ...s, copied: false } : s)), 1500);
    } catch {
      // no-op
    }
  }

  if (state.kind === "ready") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => copy(state.url)}
          className="text-brand font-semibold hover:underline text-xs"
          title={state.url}
        >
          {state.copied ? "✓ copié" : "Copier lien redo"}
        </button>
        <a
          href={state.url}
          target="_blank"
          rel="noopener"
          className="text-ink-muted hover:underline text-xs"
        >
          ouvrir ↗
        </a>
        <button
          onClick={generate}
          className="text-ink-muted hover:text-ink text-xs"
          title="Générer un autre lien (l'ancien reste valable jusqu'à utilisation)"
        >
          +
        </button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <button
        onClick={generate}
        className="text-red-600 font-semibold hover:underline text-xs"
        title={state.message}
      >
        ✗ retry
      </button>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={state.kind === "loading"}
      className="text-ink-soft font-semibold hover:underline text-xs disabled:text-ink-muted"
    >
      {state.kind === "loading" ? "Génération…" : "Générer lien redo"}
    </button>
  );
}
