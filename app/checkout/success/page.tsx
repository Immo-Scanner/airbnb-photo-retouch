"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Stripe success_url landing. Renders the reassuring loader immediately, then
 * fires POST /api/checkout/complete from the client. The route handler does
 * the Stripe + DB work and sets the order cookie via response headers (only
 * Route Handlers can mutate cookies in Next 15). On success → redirect to the
 * upload page. On failure → inline error UI with contact link.
 */
function CheckoutSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setErrored(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/checkout/complete?session_id=${encodeURIComponent(sessionId)}`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`complete failed: ${res.status}`);
        const { orderId } = (await res.json()) as { orderId?: string };
        if (cancelled) return;
        if (!orderId) throw new Error("missing orderId");
        router.replace(`/order/${orderId}/upload`);
      } catch {
        if (!cancelled) setErrored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (errored) return <ErrorView />;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface-alt">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mb-6 shadow-sm">
          ✓
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Paiement reçu</h1>
        <p className="text-ink-soft mb-10 text-lg">
          On prépare votre espace personnel
          <span className="inline-block w-6 text-left animate-pulse">…</span>
        </p>
        <div className="flex justify-center">
          <Spinner />
        </div>
        <p className="mt-10 text-sm text-ink-muted">Ça prend quelques secondes — ne fermez pas l'onglet.</p>
      </div>
    </div>
  );
}

function ErrorView() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface-alt">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-4xl mb-6">
          !
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Hmm, quelque chose a coincé</h1>
        <p className="text-ink-soft mb-2">
          Votre paiement a été reçu, mais on n'a pas pu finaliser la création de votre espace.
        </p>
        <p className="text-ink-muted text-sm mb-2">
          Pas d'inquiétude : on a tout enregistré et un email arrive d'ici quelques minutes avec le lien
          vers votre espace.
        </p>
        <p className="text-ink-muted text-sm mb-8">
          Si rien n'arrive sous 10 min, écrivez-nous à{" "}
          <a href="mailto:contact@immo-scan.fr" className="text-brand font-semibold hover:underline">
            contact@immo-scan.fr
          </a>{" "}
          — on règle ça rapidement.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-full bg-brand hover:bg-brand-dark text-white font-bold tracking-tight transition"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-full border border-ink/15 hover:bg-ink/5 text-ink font-bold tracking-tight transition"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-10 w-10 text-brand" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessInner />
    </Suspense>
  );
}
