import Link from "next/link";

// Long-form sales letter — readability inspired by kingkong.co (tight prose
// width, generous paragraph spacing, multiple inline CTAs, emphasis via
// size+bold rather than color boxes). Palette borrowed from immo-scan.fr:
// dark teal ink, royal blue CTA, gold accent on warnings.

export default function LandingPage() {
  return (
    <main>
      {/* === HERO === */}
      <section className="bg-surface">
        <div className="max-w-prose mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.18em] text-brand mb-6">
            ⚠ Avertissement aux exploitants courte durée
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            N'optimisez pas vos visuels si votre exploitation ne peut pas absorber un pic de demande.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-ink-soft leading-relaxed">
            Ce nouveau dispositif réservé aux exploitants de meublés touristiques
            vous montre comment gagner <strong className="text-ink">15 à 20 points
            de taux d'occupation en moins de 72h</strong>, même si votre annonce
            est déjà optimisée et votre marché saturé.
          </p>
        </div>
      </section>

      {/* === FRUSTRATION === */}
      <Section>
        <p className="text-sm text-ink-muted mb-10">De : <strong className="text-ink">Julian MULLER</strong></p>
        <Para>
          Si vous êtes comme la majorité des investisseurs qui exploitent un ou plusieurs biens en location
          courte durée, vous ne cherchez pas un "bon plan". Vous cherchez du{" "}
          <strong>rendement net mesurable</strong>, une exploitation qui tend vers le passif, et un actif qui
          justifie son emplacement dans votre patrimoine.
        </Para>
        <Para>Le problème, c'est que quand vous regardez vos KPIs en fin de mois, le constat est presque toujours le même :</Para>
        <Pullquote>
          Un taux d'occupation qui stagne entre 58 et 72 %. Un RevPAR en dessous de votre objectif. Un écart
          de revenus de 15 à 30 % avec les top-performers de votre zone.
        </Pullquote>
        <Para>
          Vous avez déjà fait le travail. Pricing dynamique optimisé. Titre et description retravaillés.
          Équipements qui font la différence. Vous avez peut-être même testé une conciergerie ou un revenue manager.
        </Para>
        <Para>
          Et pourtant, votre bien plafonne. <em>Sous-performant par rapport à son potentiel réel.</em>
        </Para>
        <Para>
          Sur 12 mois, ces quelques points manquants représentent plusieurs milliers d'euros de cash-flow
          envolés. Multipliés par le nombre de biens dans votre portefeuille, ça commence à peser dans la
          rentabilité globale du parc.
        </Para>
        <Para>
          Et même si vous avez déjà investi 400 à 600 € chez un photographe immobilier "pro", le résultat
          reste décevant. Pourquoi ?
        </Para>
        <Para className="text-xl md:text-2xl font-semibold text-ink leading-snug">
          Un photographe immobilier classique shoote pour vendre un bien. Pas pour convertir une réservation à
          23h47 sur Airbnb.
        </Para>
        <Para>
          Deux métiers, deux grammaires visuelles, deux objectifs incompatibles. Je le sais parce que j'y suis
          passé. 8 biens. Des années à chercher pourquoi certains tournaient à 92 % sans effort pendant que
          d'autres, mieux placés et mieux équipés, peinaient à 65 %.
        </Para>
      </Section>

      {/* === SOLUTION === */}
      <Section bg="alt">
        <H2>14 mois pour structurer une chose très précise</H2>
        <Para>
          Un <strong>protocole visuel haute conversion</strong>, dédié exclusivement au marché de la location
          courte durée.
        </Para>
        <p className="my-10 text-3xl md:text-5xl font-extrabold text-brand leading-[1.05] tracking-tight">
          REMPLISSAGE MAGNETIC™
        </p>
        <Para>
          À notre connaissance, nous sommes aujourd'hui les seuls en France à le proposer dans ces conditions
          tarifaires.
        </Para>

        <WarningBox>
          <strong>Avant d'aller plus loin :</strong> n'enclenchez ce protocole QUE si votre exploitation peut
          absorber un pic de demande significatif. Nos clients constatent en moyenne{" "}
          <strong>+12 à +22 points de taux d'occupation</strong> dans les 3 semaines qui suivent la remise en
          ligne. Si votre ménage, vos check-ins ou votre stock de linge ne sont pas dimensionnés, vous allez
          vivre des semaines compliquées.
        </WarningBox>

        <Para>
          Vous pouvez préférer construire votre propre protocole. Foncez. Vous pouvez consacrer 4 ans à tester
          11 photographes, étudier les patterns visuels des 1 % les plus performants, croiser les data de
          conversion avec les compositions d'image, et finir par identifier les 7 paramètres qui font basculer
          un visiteur en réservation confirmée.
        </Para>
        <Para className="text-xl md:text-2xl font-semibold text-ink">Ou alors…</Para>
        <Para>
          Vous confiez vos photos actuelles à <strong>Geoffrey</strong>, le photographe spécialisé courte
          durée avec qui nous avons codifié l'intégralité du protocole. Vous lui envoyez vos visuels.
          Il applique REMPLISSAGE MAGNETIC™. Vous recevez vos fichiers haute définition. Vous remettez en
          ligne. Point.
        </Para>

        <H3>Pourquoi à prix coûtant ?</H3>
        <Para>
          Nous développons en parallèle une <strong>IA propriétaire</strong> dédiée à l'analyse visuelle de
          l'immobilier courte durée. Pour entraîner ce modèle, nous avons besoin d'un dataset volumineux de
          photos réelles, traitées selon notre protocole.
        </Para>
        <Para>
          Nous facturons strictement le temps-homme de Geoffrey. Vous bénéficiez d'un service qui devrait
          coûter <strong>400 à 600 € pour 97 €</strong>. Nous enrichissons notre dataset.
        </Para>
        <Para>Échange équitable. Aucune zone d'ombre.</Para>
      </Section>

      {/* === CURIOSITÉ === */}
      <Section>
        <H2>Ce que REMPLISSAGE MAGNETIC™ déclenche concrètement</H2>
        <p className="text-ink-muted mb-8">(et ce que vous trouverez dans la newsletter privée incluse)</p>
        <ul className="space-y-5 text-lg md:text-xl leading-relaxed">
          {[
            "3 paramètres techniques invisibles qui font basculer un visiteur Airbnb en réservation confirmée — même si votre bien est plus cher que la concurrence directe",
            "La grammaire visuelle des 1 % top-performers : ce que font les hôtes à 90 %+ d'occupation que les autres ignorent totalement",
            "Comment l'algorithme Airbnb détecte et favorise certaines compositions d'image (et pénalise discrètement les autres)",
            "Les 5 leviers psychologiques activés en moins de 0,8 seconde, qui décident à eux seuls de 70 % de la conversion",
            "3 raisons paradoxales pour lesquelles une photo \"trop pro\" — typiquement celle d'un photographe immobilier classique — fait chuter votre conversion",
            "Le protocole de remise en ligne qui force un re-ranking de votre annonce dans les 72h",
            "La métrique unique à monitorer pour savoir si vos photos performent (ce n'est pas le taux d'occupation)",
          ].map((item, i) => (
            <li key={i} className="flex gap-4">
              <span className="text-brand font-bold flex-shrink-0 mt-0.5">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* === PREUVE === */}
      <Section bg="alt" wide>
        <H2 center>Les chiffres parlent</H2>
        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-5xl mx-auto">
          <Testimonial
            quote="Bien à Bordeaux, 62 % d'occupation depuis 6 mois malgré un pricing optimisé. 48h après remise en ligne avec les photos retouchées : 81 %. Sur 12 mois projetés, c'est +6 400 € net pour 97 € investis."
            author="Marc D."
            meta="1 bien · Bordeaux centre"
          />
          <Testimonial
            quote="J'exploite 4 biens en région PACA. J'ai testé sur le moins performant. Résultat : +14 points de remplissage en 3 semaines, RevPAR en hausse de 23 %. J'ai immédiatement basculé les 3 autres."
            author="Sophie L."
            meta="4 biens · PACA"
          />
          <Testimonial
            quote="J'avais payé un photographe immobilier 480 € il y a 8 mois. Je pensais que c'était optimisé. Après le passage de Geoffrey : +1 800 € de revenus le mois suivant."
            author="Thomas R."
            meta="2 biens · Lyon"
          />
        </div>
      </Section>

      {/* === AUTORITÉ === */}
      <Section>
        <H2>Qui sommes-nous</H2>
        <Para>
          Je m'appelle <strong>Julian</strong>, je suis le fondateur d'<strong>Immoscan</strong> et le
          co-architecte du protocole REMPLISSAGE MAGNETIC™.
        </Para>
        <Para>
          <strong>20 ans d'investissement immobilier.</strong> 8 biens en exploitation directe en courte
          durée. Plusieurs dizaines de chasses accompagnées. Un portefeuille construit, écorné par les
          erreurs, recalibré par l'expérience.
        </Para>
        <Para>
          Je me suis spécialisé sur la rentabilité opérationnelle de la courte durée — la zone où la majorité
          des investisseurs laissent <strong>20 à 40 % de revenus sur la table sans le savoir</strong>. C'est
          en croisant les données de conversion de centaines d'annonces avec le travail terrain de Geoffrey
          que nous avons identifié, puis codifié, les paramètres visuels qui font réellement la différence.
        </Para>
        <Para>
          Depuis 8 ans, je partage ces analyses avec une communauté privée d'investisseurs sérieux :
          opérations off-market, lives de chasse immobilière, ateliers de structuration financière, retours
          d'expérience sans filtre.
        </Para>
      </Section>

      {/* === CTA + TARIFS === */}
      <Section bg="ink" wide id="pricing">
        <p className="text-xs md:text-sm font-bold uppercase tracking-[0.18em] text-gold mb-4 text-center">
          Reprenez le contrôle de votre taux d'occupation
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white text-center leading-[1.05] tracking-tight">
          Tarifs prix coûtant
        </h2>
        <p className="mt-6 text-center text-white/70 max-w-prose mx-auto text-lg leading-relaxed">
          4 ans de R&D visuelle, exécuté par Geoffrey, livré sous 72h. Vous mesurez l'impact dès la semaine suivante.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-14 max-w-5xl mx-auto">
          <PricingCard
            tier="S"
            price="7 €"
            subtitle="1 photo retouchée"
            features={["Protocole REMPLISSAGE MAGNETIC™", "Livraison sous 48–72h", "Format haute définition"]}
          />
          <PricingCard
            tier="M"
            price="27 €"
            subtitle="5 photos (1 offerte)"
            features={[
              "Protocole REMPLISSAGE MAGNETIC™",
              "Livraison sous 48–72h",
              "Format haute définition",
              "Idéal pour 1 annonce complète",
              "Newsletter privée + bonus inclus",
            ]}
            highlight
          />
          <PricingCard
            tier="L"
            price="97 €"
            subtitle="20 photos (5 offertes)"
            features={[
              "Protocole REMPLISSAGE MAGNETIC™",
              "Livraison sous 48–72h",
              "Format haute définition",
              "Couvre l'intégralité de la galerie Airbnb",
              "Idéal portefeuille multi-bien",
            ]}
          />
        </div>

        <div className="mt-14 rounded-2xl border border-gold/30 bg-gold/10 text-gold p-6 max-w-prose mx-auto">
          <p className="font-bold mb-2 text-base">⚠ Double limitation</p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm leading-relaxed text-gold/90">
            <li>L'offre s'arrête automatiquement dès que notre dataset IA atteint son volume cible.</li>
            <li>Geoffrey est un humain. Ses créneaux partent vite et nous ne les renouvelons pas.</li>
          </ol>
        </div>
      </Section>

      {/* === BONUS === */}
      <Section bg="alt" wide>
        <H2 center>🎁 Bonus inclus</H2>
        <p className="text-center text-ink-muted mb-12 max-w-prose mx-auto">
          Non disponibles ailleurs.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <BonusCard n={1} title="Newsletter Privée Immoscan">
            20 ans d'opérations immobilières condensés. Off-market, lives de chasse, ateliers de financement,
            débriefs sans filtre.
          </BonusCard>
          <BonusCard n={2} title="Les 3 Piliers d'une Annonce qui Sur-Performe">
            Le document qui aligne photos, titre et description pour transformer votre annonce en machine à
            conversion. Exécutable en une après-midi.
          </BonusCard>
          <BonusCard n={3} title="Vaincre la Peur du Sur-Booking">
            Le protocole pour structurer votre exploitation afin que +20 points de remplissage deviennent du
            cash-flow propre — pas un cauchemar logistique.
          </BonusCard>
        </div>
      </Section>

      {/* === GARANTIE === */}
      <Section>
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50 p-8 md:p-10">
          <p className="text-2xl md:text-3xl font-extrabold mb-4">🛡 Garantie béton</p>
          <Para>
            Si vous estimez que les retouches livrées par Geoffrey ne représentent pas le meilleur euro
            investi dans votre exploitation cette année, vous nous envoyez un email.
            {" "}<strong>Remboursement intégral. Sans conditions ni questions.</strong>
          </Para>
          <Para>
            À 27 € pour un service qui en vaut 200, le rapport risque/rendement est asymétrique au point d'en
            être presque gênant. Le seul vrai risque, c'est de continuer à enchaîner les semaines à 65 %
            pendant que vos concurrents directs basculent à 85 %.
          </Para>
        </div>
        <div className="mt-12 text-center">
          <PrimaryCTA size="lg">Voir les formules</PrimaryCTA>
        </div>
      </Section>

      {/* === PS === */}
      <Section bg="alt">
        <Para>Cordialement,</Para>
        <Para><strong>Julian</strong></Para>
        <div className="mt-12 border-l-4 border-brand pl-6">
          <H3>PS</H3>
          <Para>Si vous scannez la fin avant de remonter, voici l'essentiel.</Para>
          <Para>
            Pour <strong>27 €</strong> (vs. 400 à 600 € chez un photographe immobilier classique), Geoffrey
            applique REMPLISSAGE MAGNETIC™ à 5 photos de votre bien. Vous remettez en ligne. Sous 72h, votre
            annonce repasse en re-ranking et l'effet sur le taux d'occupation se mesure dans la semaine.
          </Para>
          <Para>
            C'est, à notre connaissance, le protocole visuel le plus abouti du marché courte durée français.
            Ce sont les paramètres que j'applique sur mes 8 biens en exploitation directe.
          </Para>
          <Para>
            Ce dispositif existe uniquement parce que nous avons besoin de photos réelles pour entraîner notre
            IA propriétaire. <strong>Dès que le dataset est complet, on ferme.</strong> Pas de relance, pas de
            "deuxième chance", pas de prolongation.
          </Para>
          <Para>Garantie satisfait ou remboursé incluse.</Para>
        </div>
        <div className="mt-12 text-center">
          <PrimaryCTA size="lg">Voir les formules</PrimaryCTA>
        </div>
      </Section>

      <footer className="py-10 text-center text-sm text-ink-muted border-t border-black/5">
        © {new Date().getFullYear()} — REMPLISSAGE MAGNETIC™ · Immoscan
      </footer>
    </main>
  );
}

// ============================================================
// Layout primitives
// ============================================================
function Section({
  children,
  bg,
  wide,
  id,
}: {
  children: React.ReactNode;
  bg?: "alt" | "ink";
  wide?: boolean;
  id?: string;
}) {
  const cls =
    bg === "ink" ? "bg-ink text-white" : bg === "alt" ? "bg-surface-alt" : "bg-white";
  const inner = wide ? "max-w-5xl" : "max-w-prose";
  return (
    <section id={id} className={`${cls}`}>
      <div className={`${inner} mx-auto px-6 py-20 md:py-28`}>{children}</div>
    </section>
  );
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      className={`text-3xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-8 ${
        center ? "text-center" : ""
      }`}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl md:text-2xl font-bold mt-12 mb-5 tracking-tight">{children}</h3>;
}

function Para({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-6 text-lg md:text-xl leading-relaxed text-ink-soft ${className ?? ""}`}>{children}</p>;
}

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-8 text-2xl md:text-3xl font-bold text-ink leading-snug tracking-tight">
      {children}
    </p>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-10 rounded-xl border-l-4 border-gold bg-gold-soft px-6 py-5 text-base md:text-lg leading-relaxed text-ink-soft">
      {children}
    </div>
  );
}

function PrimaryCTA({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  // All in-page CTAs scroll back to the tarifs section. Only the per-tier
  // buttons inside PricingCard go directly to Stripe checkout.
  const sizeCls = size === "lg" ? "px-8 py-5 text-lg" : "px-7 py-4 text-base";
  return (
    <div className={className}>
      <a
        href="#pricing"
        className={`inline-flex items-center gap-2 ${sizeCls} bg-brand hover:bg-brand-dark text-white rounded-full font-bold tracking-tight shadow-sm hover:shadow-md transition-all`}
      >
        {children}
        <span aria-hidden>↑</span>
      </a>
    </div>
  );
}

function Testimonial({ quote, author, meta }: { quote: string; author: string; meta: string }) {
  return (
    <figure className="rounded-2xl bg-white border border-black/5 p-7 shadow-sm">
      <blockquote className="text-ink leading-relaxed">« {quote} »</blockquote>
      <figcaption className="mt-5 text-sm">
        <span className="font-bold text-ink">{author}</span>
        <span className="block text-ink-muted">{meta}</span>
      </figcaption>
    </figure>
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
      className={`rounded-2xl p-7 transition relative ${
        highlight
          ? "bg-white text-ink shadow-2xl shadow-black/30 md:-translate-y-3 ring-4 ring-gold"
          : "bg-white/5 text-white border border-white/15"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-ink text-xs font-extrabold tracking-widest uppercase px-3 py-1 rounded-full">
          ⭐ Recommandé
        </span>
      )}
      <p className="text-5xl font-extrabold tracking-tight">{price}</p>
      <p className={`mt-1 ${highlight ? "text-ink-muted" : "text-white/70"}`}>{subtitle}</p>
      <ul className={`mt-7 space-y-2.5 text-sm ${highlight ? "text-ink-soft" : "text-white/90"}`}>
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className={highlight ? "text-brand" : "text-gold"}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={`/api/checkout?tier=${tier}`}
        className={`mt-8 block text-center px-4 py-3.5 rounded-full font-bold tracking-tight transition ${
          highlight
            ? "bg-brand hover:bg-brand-dark text-white"
            : "bg-white hover:bg-white/90 text-ink"
        }`}
      >
        Choisir cette formule
      </Link>
    </div>
  );
}

function BonusCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-7 shadow-sm">
      <p className="text-xs font-extrabold text-brand uppercase tracking-widest mb-3">Bonus #{n}</p>
      <h3 className="text-lg md:text-xl font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-base text-ink-muted leading-relaxed">{children}</p>
    </div>
  );
}
