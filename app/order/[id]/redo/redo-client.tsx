"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface RedoCandidate {
  id: string;
  filename: string;
  previewUrl: string | null;
}

interface Selection {
  checked: boolean;
  comment: string;
}

export function RedoClient({
  orderId,
  redoToken,
  candidates,
}: {
  orderId: string;
  redoToken: string;
  candidates: RedoCandidate[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, Selection>>(() =>
    Object.fromEntries(candidates.map((c) => [c.id, { checked: false, comment: "" }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => Object.values(state).filter((s) => s.checked).length,
    [state]
  );

  function toggle(id: string) {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  }

  function setComment(id: string, comment: string) {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], comment } }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const selections = Object.entries(state)
        .filter(([, s]) => s.checked)
        .map(([source_photo_id, s]) => ({ source_photo_id, comment: s.comment.trim() || null }));
      const res = await fetch(`/api/orders/${orderId}/redo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections, redoToken }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `submit failed (${res.status})`);
      }
      router.push(`/order/${orderId}/redo/sent`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {candidates.map((c) => {
          const s = state[c.id];
          return (
            <div
              key={c.id}
              className={`rounded-2xl border-2 bg-white p-3 transition ${
                s.checked ? "border-brand shadow-md" : "border-black/5"
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={() => toggle(c.id)}
                  className="mt-1.5 w-5 h-5 accent-brand cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate mb-2">{c.filename}</p>
                  {c.previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.previewUrl}
                      alt={c.filename}
                      className="rounded-lg w-full aspect-[4/3] object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="rounded-lg w-full aspect-[4/3] bg-slate-100 flex items-center justify-center text-xs text-ink-muted">
                      Aperçu indisponible
                    </div>
                  )}
                </div>
              </label>
              {s.checked && (
                <textarea
                  value={s.comment}
                  onChange={(e) => setComment(c.id, e.target.value)}
                  placeholder="Ex : tonds la pelouse, enlève la voiture, pièce plus chaleureuse…"
                  rows={2}
                  className="mt-3 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between gap-4 sticky bottom-4 bg-white/80 backdrop-blur p-4 rounded-2xl border border-black/5 shadow-lg">
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{selectedCount}</strong> photo
          {selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""}
        </p>
        <button
          onClick={submit}
          disabled={selectedCount === 0 || submitting}
          className="bg-brand hover:bg-brand-dark disabled:bg-slate-200 disabled:text-slate-400 text-white px-7 py-3.5 rounded-full font-bold tracking-tight transition shadow-sm"
        >
          {submitting ? "Envoi…" : "Demander la retouche →"}
        </button>
      </div>
    </>
  );
}
