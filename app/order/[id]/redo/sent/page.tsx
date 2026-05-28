export default function RedoSentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface-alt">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mb-6">
          ✓
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Demande envoyée</h1>
        <p className="text-ink-soft text-base leading-relaxed mb-2">
          Geoffrey a bien reçu vos instructions. Vous recevrez un email avec les photos retouchées
          d'ici 2 jours ouvrés.
        </p>
        <p className="text-ink-muted text-sm">
          Vous pouvez fermer cet onglet.
        </p>
      </div>
    </div>
  );
}
