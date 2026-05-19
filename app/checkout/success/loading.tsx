export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface-alt">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mb-6 shadow-sm">
          ✓
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          Paiement reçu
        </h1>
        <p className="text-ink-soft mb-10 text-lg">
          On prépare votre espace personnel<span className="inline-block w-6 text-left animate-pulse">…</span>
        </p>
        <div className="flex justify-center">
          <Spinner />
        </div>
        <p className="mt-10 text-sm text-ink-muted">Ça prend quelques secondes — ne fermez pas l'onglet.</p>
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
