import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-sm font-medium text-orange-600 mb-4 uppercase tracking-wide">
            ⚠️ N'optimisez pas vos visuels si votre opérationnel ne tient pas la demande
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
            Vos photos Airbnb,<br />
            retouchées comme un pro<br />
            <span className="text-orange-500">en 48h</span>.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Geoffrey, photographe immobilier spécialisé location courte durée,
            retouche vos photos pour booster votre taux d'occupation.
            Une cliente est passée de <strong>62 % à 81 % d'occupation en 48h</strong> juste après mise à jour de ses photos.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            90 % des hôtes négligent ce levier. Pas vous.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="#pricing"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Voir les tarifs
            </Link>
            <Link
              href="/login"
              className="border border-slate-300 hover:bg-slate-50 text-slate-900 px-6 py-3 rounded-lg font-semibold transition"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">Tarifs</h2>
          <p className="text-center text-slate-600 mb-12">Pas d'abonnement. Vous payez ce que vous envoyez.</p>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard tier="S" price="7€" subtitle="1 photo" features={["Retouche pro", "Livraison 48h", "Format haute déf"]} />
            <PricingCard
              tier="M"
              price="27€"
              subtitle="5 photos (4 + 1 offerte)"
              features={["Retouche pro sur les 5", "Livraison 48h", "Format haute déf", "Recommandé pour 1 annonce"]}
            />
            <PricingCard
              tier="L"
              price="97€"
              subtitle="20 photos (15 + 5 offertes)"
              features={[
                "Retouche pro sur les 20",
                "Livraison 48h",
                "Format haute déf",
                "Newsletter privée offerte",
                "Idéal portefeuille multi-bien",
              ]}
              highlight
            />
          </div>

          <p className="text-center text-sm text-slate-500 mt-10">
            Bonus inclus dès aujourd'hui : accès à ma newsletter privée — 20 ans
            de retours d'expérience sur la location courte durée.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Step n={1} title="Vous payez">
              Choisissez votre formule, payez en ligne par carte (paiement sécurisé Stripe).
            </Step>
            <Step n={2} title="Vous uploadez">
              Drag & drop de vos photos sur votre espace personnel sécurisé.
            </Step>
            <Step n={3} title="Vous recevez tout sous 48h">
              Geoffrey retouche tout à la main et vous renvoie les photos haute définition.
            </Step>
          </div>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} — Geoffrey · Retouche photo location courte durée
      </footer>
    </main>
  );
}

function PricingCard({
  tier,
  price,
  subtitle,
  features,
  highlight,
}: {
  tier: "S" | "M" | "L";
  price: string;
  subtitle: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 border ${
        highlight ? "border-orange-500 bg-orange-50/40 shadow-lg shadow-orange-100" : "border-slate-200 bg-white"
      }`}
    >
      {highlight && (
        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">⭐ Recommandé</p>
      )}
      <p className="text-4xl font-bold">{price}</p>
      <p className="text-slate-600 mt-1">{subtitle}</p>
      <ul className="mt-6 space-y-2 text-sm text-slate-700">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-orange-500">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={`/login?tier=${tier}`}
        className={`mt-8 block text-center px-4 py-3 rounded-lg font-semibold transition ${
          highlight
            ? "bg-orange-500 hover:bg-orange-600 text-white"
            : "border border-slate-300 hover:bg-slate-50 text-slate-900"
        }`}
      >
        Choisir cette formule
      </Link>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xl mb-4">
        {n}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{children}</p>
    </div>
  );
}
