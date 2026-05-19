"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryPhotoButton({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/photos/${photoId}/retry`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `retry failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSubmitting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={retry}
        disabled={submitting}
        className="text-xs font-bold text-brand hover:text-brand-dark disabled:text-ink-muted underline underline-offset-2"
      >
        {submitting ? "Réessai…" : "Réessayer"}
      </button>
      {error && <span className="text-xs text-red-600">— {error}</span>}
    </span>
  );
}
