"use client";

import Link from "next/link";

export default function CheckoutSuccessError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        <p className="text-ink-muted text-sm mb-8">
          Pas d'inquiétude : on a tout enregistré et un email arrive d'ici quelques minutes avec le lien
          vers votre espace.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
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
        {error.digest && (
          <p className="mt-8 text-xs text-ink-muted">Code d'erreur : {error.digest}</p>
        )}
      </div>
    </div>
  );
}
