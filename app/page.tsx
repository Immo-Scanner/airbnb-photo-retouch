import Link from "next/link";

// Landing page — long-form sales letter (Version 2 du brief).
// Placeholders à remplacer par toi : [Prénom], [Nom], [Date], [Nom du site],
// les 3 témoignages, et les 3 lignes "Ils parlent de nous".

export default function LandingPage() {
  return (
    <main className="bg-white text-slate-900">
      {/* === AVERTISSEMENT (hero) === */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="inline-block text-xs font-bold uppercase tracking-widest text-orange-700 bg-orange-100 px-3 py-1 rounded-full mb-6">
            ⚠️ Avertissement
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            N'optimisez pas les visuels de votre bien courte durée si votre exploitation n'est pas dimensionnée pour absorber un pic de demande
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Ce nouveau dispositif réservé aux exploitants de meublés touristiques vous montre comment gagner
            <strong> 15 à 20 points de taux d'occupation en moins de 72h</strong>, même si votre annonce est déjà
            optimisée et votre marché saturé… en activant le seul levier que la plupart des investisseurs
            professionnels sous-exploitent encore.
          </p>
        </div>
      </section>

      {/* === FRUSTRATION === */}
      <Block>
        <p className="text-sm text-slate-500">Paris, [Date]</p>
        <p className="text-sm text-slate-500 mb-6">De : [Prénom + Nom]</p>

        <P>
          Si vous êtes comme la majorité des investisseurs qui exploitent un ou plusieurs biens en location
          courte durée, vous ne cherchez pas un "bon plan". Vous cherchez du <strong>rendement net mesurable</strong>,
          une exploitation qui tend vers le passif, et un actif qui justifie son emplacement dans votre patrimoine.
        </P>
        <P>
          Le problème, c'est que quand vous regardez vos KPIs en fin de mois, le constat est presque toujours le même :
        </P>
        <P>
          <strong>Un taux d'occupation qui stagne entre 58 et 72%.</strong> Un RevPAR en dessous de votre objectif.
          Un écart de revenus de 15 à 30% avec les top-performers de votre zone.
        </P>
        <P>
          Vous avez déjà fait le travail. Vous avez optimisé le pricing dynamique. Vous avez retravaillé le titre
          et la description. Vous avez ajouté les équipements qui font la différence. Vous avez peut-être même
          testé une conciergerie ou un revenue manager.
        </P>
        <P>
          Et pourtant, votre bien plafonne. Pas catastrophique. Juste… <em>sous-performant par rapport à son potentiel réel.</em>
        </P>
        <P>
          Ce qui est exaspérant, parce que vous savez que sur 12 mois, ces quelques points d'occupation manquants
          représentent plusieurs milliers d'euros de cash-flow envolés. Multipliés par le nombre de biens dans
          votre portefeuille, ça commence à peser dans la rentabilité globale du parc.
        </P>
        <P>
          Et même si vous faites partie des opérateurs sérieux qui ont déjà investi 400 à 600€ chez un photographe
          immobilier "pro", le résultat reste décevant. Pourquoi ?{" "}
          <strong>
            Parce qu'un photographe immobilier classique shoote pour vendre un bien. Pas pour convertir une
            réservation à 23h47 sur Airbnb.
          </strong>{" "}
          Ce sont deux métiers, deux grammaires visuelles, deux objectifs incompatibles.
        </P>
        <P>
          Si je peux vous décrire cette frustration aussi précisément, c'est parce que j'y suis passé.
          8 biens. Des années à chercher pourquoi certains tournaient à 92% sans effort pendant que d'autres,
          mieux placés et mieux équipés, peinaient à 65%.
        </P>
      </Block>

      {/* === SOLUTION === */}
      <Block dark>
        <H2>La solution qu'on a passé 14 mois à structurer</H2>
        <P>
          C'est pour cette raison qu'on a passé les 14 derniers mois à structurer une chose très précise :
        </P>
        <p className="text-2xl md:text-3xl font-bold text-orange-400 my-6">
          Un protocole visuel haute conversion, dédié exclusivement au marché de la location courte durée.
        </p>
        <P>
          On l'a baptisé <strong className="text-white">REMPLISSAGE MAGNETIC™</strong> — et à notre connaissance,
          nous sommes aujourd'hui les seuls en France à le proposer dans ces conditions tarifaires.
        </P>
        <Callout>
          <strong>⚠️ Avant d'aller plus loin, je dois être transparent avec vous :</strong>
          <br />
          N'enclenchez ce protocole QUE si votre exploitation peut absorber un pic de demande significatif.
          Nos clients constatent en moyenne <strong>+12 à +22 points de taux d'occupation</strong> dans les 3
          semaines qui suivent la remise en ligne. Si votre process de ménage, votre gestion des check-ins,
          ou votre stock de linge ne sont pas dimensionnés pour ça, vous allez vivre des semaines compliquées.
          Vous êtes prévenu(e).
        </Callout>
        <P>
          Bien sûr, vous pouvez préférer construire votre propre protocole visuel. Foncez. Vous pouvez —
          comme moi — y consacrer 4 ans, tester 11 photographes, étudier les patterns visuels des 1% les plus
          performants, croiser les data de conversion avec les compositions d'image, et finir par identifier les
          7 paramètres qui font basculer un visiteur en réservation confirmée.
        </P>
        <P>Ou alors…</P>
        <P>
          Vous pouvez confier vos photos actuelles à <strong className="text-white">Geoffrey</strong>, le
          photographe spécialisé courte durée avec qui nous avons codifié l'intégralité du protocole.
          Vous lui envoyez vos visuels. Il applique REMPLISSAGE MAGNETIC™. Vous recevez vos fichiers haute
          définition. Vous remettez en ligne. Point.
        </P>
        <H3>« Pourquoi à prix coûtant ? »</H3>
        <P>
          La réponse est claire et assumée. Nous développons en parallèle une <strong>IA propriétaire</strong>
          {" "}dédiée à l'analyse visuelle de l'immobilier courte durée. Pour entraîner ce modèle, nous avons
          besoin d'un dataset volumineux de photos réelles, traitées selon notre protocole. Nous facturons donc
          strictement le temps-homme de Geoffrey. Vous bénéficiez d'un service qui devrait coûter
          {" "}<strong>400 à 600€ pour 97€</strong>. Nous enrichissons notre dataset.
        </P>
        <P>Échange équitable. Aucune zone d'ombre.</P>
        <P>
          Et vous pouvez constater l'effet dès <strong>48 à 72h</strong> après la remise en ligne sur les plateformes.
        </P>
      </Block>

      {/* === CURIOSITÉ === */}
      <Block>
        <H2>Voici ce que REMPLISSAGE MAGNETIC™ déclenche concrètement</H2>
        <P className="text-slate-600">
          (et de ce que vous trouverez dans la newsletter privée incluse)
        </P>
        <ul className="mt-6 space-y-3 text-slate-700">
          {[
            "3 paramètres techniques invisibles qui font basculer un visiteur Airbnb en réservation confirmée — même si votre bien est plus cher que la concurrence directe",
            "La grammaire visuelle des 1% top-performers : ce que font les hôtes à 90%+ d'occupation que les autres ignorent totalement",
            "Comment l'algorithme Airbnb détecte et favorise certaines compositions d'image (et pénalise discrètement les autres)",
            "Les 5 leviers psychologiques activés à l'œil nu en moins de 0,8 seconde, qui décident à eux seuls de 70% de la conversion",
            "3 raisons paradoxales pour lesquelles une photo \"trop pro\" — typiquement celles d'un photographe immobilier classique — fait chuter votre taux de conversion",
            "Le protocole de remise en ligne qui force un re-ranking de votre annonce dans les 72h",
            "La métrique unique à monitorer pour savoir si vos photos performent (ce n'est pas le taux d'occupation)",
            "Et bien plus encore.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-orange-500 font-bold">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Block>

      {/* === PREUVE === */}
      <Block bg="slate">
        <H2 center>Les chiffres parlent</H2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <Testimonial
            quote="Bien à Bordeaux, 62% d'occupation depuis 6 mois malgré un pricing optimisé. 48h après remise en ligne avec les photos retouchées : 81%. Sur 12 mois projetés, c'est +6 400€ net pour 97€ investis."
            author="[Témoignage #1]"
          />
          <Testimonial
            quote="J'exploite 4 biens en région PACA. J'ai testé sur le moins performant. Résultat : +14 points de remplissage en 3 semaines, RevPAR en hausse de 23%. J'ai immédiatement basculé les 3 autres."
            author="[Témoignage #2]"
          />
          <Testimonial
            quote="J'avais payé un photographe immobilier 480€ il y a 8 mois. Je pensais que c'était optimisé. Après le passage de Geoffrey : +1 800€ de revenus le mois suivant. Le différentiel parle de lui-même."
            author="[Témoignage #3]"
          />
        </div>
      </Block>

      {/* === AUTORITÉ === */}
      <Block>
        <H2>Qui sommes-nous pour vous parler de tout ça ?</H2>
        <P>
          Bonjour, je m'appelle <strong>[Prénom]</strong>, je suis le fondateur de <strong>[nom du site]</strong> et le
          co-architecte du protocole REMPLISSAGE MAGNETIC™.
        </P>
        <P>
          <strong>20 ans d'investissement immobilier.</strong> 8 biens en exploitation directe en courte durée. Plusieurs
          dizaines de chasses accompagnées. Un portefeuille construit, écorné par les erreurs, recalibré par l'expérience.
        </P>
        <P>
          Au cours des dernières années, je me suis spécialisé sur la rentabilité opérationnelle de la courte durée —
          la zone où la majorité des investisseurs laissent <strong>20 à 40% de revenus sur la table sans le savoir</strong>.
          C'est en croisant les données de conversion de centaines d'annonces avec le travail terrain de Geoffrey
          que nous avons identifié, puis codifié, les paramètres visuels qui font réellement la différence.
        </P>
        <P>
          Depuis 8 ans, je partage ces analyses avec une communauté privée d'investisseurs sérieux : opérations
          off-market, lives de chasse immobilière, ateliers de structuration financière, retours d'expérience sans filtre.
        </P>
        <H3>Ils parlent de nous</H3>
        <ul className="space-y-2 text-slate-700">
          <li>✅ [Média / podcast / interview #1]</li>
          <li>✅ [Partenariat institutionnel ou réseau pro #2]</li>
          <li>✅ [Volume de biens accompagnés / communauté #3]</li>
        </ul>
      </Block>

      {/* === CTA + TARIFS === */}
      <section id="pricing" className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-400 mb-4">
            Reprenez le contrôle de votre taux d'occupation — maintenant
          </p>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            REMPLISSAGE MAGNETIC™ — tarifs prix coûtant
          </h2>
          <p className="mt-6 text-slate-300">
            Le concentré opérationnel de 4 ans de R&D visuelle appliquée à la courte durée. Aucune théorie, aucun
            blabla. Un protocole exécuté par Geoffrey, livré sous 72h, dont vous mesurez l'impact dès la semaine
            suivante.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard tier="S" price="7€" subtitle="1 photo retouchée" features={["Protocole REMPLISSAGE MAGNETIC™", "Livraison sous 48-72h", "Format haute définition"]} />
            <PricingCard
              tier="M"
              price="27€"
              subtitle="5 photos retouchées (1 offerte)"
              features={["Protocole REMPLISSAGE MAGNETIC™", "Livraison sous 48-72h", "Format haute définition", "Idéal pour 1 zone d'annonce"]}
            />
            <PricingCard
              tier="L"
              price="97€"
              subtitle="20 photos retouchées (5 offertes)"
              features={[
                "Protocole REMPLISSAGE MAGNETIC™",
                "Livraison sous 48-72h",
                "Format haute définition",
                "Couvre l'intégralité de la galerie Airbnb",
                "Newsletter privée + 2 bonus inclus",
              ]}
              highlight
            />
          </div>

          <div className="mt-12 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-100 p-6">
            <p className="font-bold mb-2">⚠️ Double limitation</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>L'offre s'arrête automatiquement dès que notre dataset IA atteint son volume cible.</li>
              <li>Geoffrey est un humain. Ses créneaux partent vite et nous ne les renouvelons pas.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* === BONUS === */}
      <Block bg="slate">
        <H2 center>🎁 Bonus inclus — non disponibles ailleurs</H2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <BonusCard n={1} title="Newsletter Privée [Nom Site]">
            20 ans d'opérations immobilières condensés dans une newsletter sans filtre. Off-market, lives de chasse,
            ateliers de financement, débriefs d'investisseurs aguerris. Une ressource que la communauté paye
            habituellement à l'année.
          </BonusCard>
          <BonusCard n={2} title="Les 3 Piliers d'une Annonce qui Sur-Performe">
            Le document de référence qui aligne photos, titre et description pour transformer votre annonce en
            machine à conversion. Format direct, exécutable en une après-midi.
          </BonusCard>
          <BonusCard n={3} title="Vaincre la Peur du Sur-Booking">
            Le protocole opérationnel pour structurer votre exploitation afin que +20 points de remplissage
            deviennent du cash-flow propre — pas un cauchemar logistique.
          </BonusCard>
        </div>
      </Block>

      {/* === GARANTIE === */}
      <Block>
        <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-50 p-8">
          <p className="text-2xl md:text-3xl font-bold mb-4">🛡️ Garantie Béton</p>
          <P>
            Si pour une quelconque raison, vous estimez que les retouches livrées par Geoffrey ne représentent pas
            le meilleur euro investi dans votre exploitation cette année, vous nous envoyez un email.
            <strong> Remboursement intégral, sans conditions ni questions.</strong>
          </P>
          <P>
            À 97€ pour un service qui en vaut 500, le rapport risque/rendement est asymétrique au point d'en être
            presque gênant. Le seul vrai risque que vous prenez, c'est celui de continuer à enchaîner les semaines
            à 65% pendant que vos concurrents directs basculent à 85%.
          </P>
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/api/checkout?tier=L"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg shadow-orange-200 transition"
          >
            JE RÉSERVE MES CRÉNEAUX REMPLISSAGE MAGNETIC™
          </Link>
        </div>
      </Block>

      {/* === PS === */}
      <Block bg="slate">
        <P>Cordialement,</P>
        <P>[Prénom]</P>
        <div className="mt-10 border-l-4 border-orange-500 pl-6">
          <H3>PS</H3>
          <P>
            Si vous êtes comme moi et que vous scannez la fin avant de remonter, voici l'essentiel :
          </P>
          <P>
            Pour <strong>97€</strong> (vs. 400 à 600€ chez un photographe immobilier classique), Geoffrey applique
            REMPLISSAGE MAGNETIC™ à 20 photos de votre bien. Vous remettez en ligne. Sous 72h, votre annonce
            repasse en re-ranking et l'effet sur le taux d'occupation se mesure dans la semaine.
          </P>
          <P>
            C'est, à notre connaissance, le protocole visuel le plus abouti du marché courte durée français. Ce sont
            les mêmes paramètres que j'applique sur mes 8 biens en exploitation directe.
          </P>
          <P>
            Ce dispositif existe uniquement parce que nous avons besoin de photos réelles pour entraîner notre IA
            propriétaire. <strong>Dès que le dataset est complet, on ferme.</strong> Pas de relance, pas de "deuxième
            chance", pas de prolongation.
          </P>
          <P>Garantie satisfait ou remboursé incluse.</P>
          <P>Le seul vrai risque que vous prenez :</P>
          <ol className="list-decimal list-inside space-y-1 text-slate-700">
            <li>Rater la fenêtre.</li>
            <li>Ou ne pas être structuré(e) pour absorber le pic de demande qui suivra. À vous de savoir si vous l'êtes.</li>
          </ol>
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/api/checkout?tier=L"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg shadow-orange-200 transition"
          >
            JE RÉSERVE MES CRÉNEAUX REMPLISSAGE MAGNETIC™
          </Link>
        </div>
      </Block>

      <footer className="py-10 text-center text-sm text-slate-500 border-t border-slate-200">
        © {new Date().getFullYear()} — REMPLISSAGE MAGNETIC™
      </footer>
    </main>
  );
}

// ============================================================
// Layout primitives — keep visual rhythm consistent across blocks
// ============================================================
function Block({
  children,
  bg,
  dark,
}: {
  children: React.ReactNode;
  bg?: "slate";
  dark?: boolean;
}) {
  const cls = dark
    ? "bg-slate-900 text-slate-100"
    : bg === "slate"
    ? "bg-slate-50"
    : "bg-white";
  return (
    <section className={`${cls} border-b border-slate-200/50`}>
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">{children}</div>
    </section>
  );
}

function H2({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <h2 className={`text-2xl md:text-4xl font-bold mb-6 ${center ? "text-center" : ""}`}>{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg md:text-xl font-bold mt-10 mb-4">{children}</h3>;
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-4 leading-relaxed ${className ?? ""}`}>{children}</p>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-orange-400/40 bg-orange-500/10 text-orange-100 p-5 text-sm leading-relaxed">
      {children}
    </div>
  );
}

function Testimonial({ quote, author }: { quote: string; author: string }) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <blockquote className="text-slate-700 italic">« {quote} »</blockquote>
      <figcaption className="mt-4 text-sm text-slate-500">— {author}</figcaption>
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
  const baseCls = highlight
    ? "border-orange-400 bg-white text-slate-900 shadow-2xl shadow-orange-500/30 scale-[1.02]"
    : "border-slate-700 bg-slate-800 text-slate-100";
  return (
    <div className={`rounded-2xl p-6 border-2 ${baseCls}`}>
      {highlight && (
        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">⭐ Recommandé</p>
      )}
      <p className="text-4xl font-bold">{price}</p>
      <p className={highlight ? "text-slate-600" : "text-slate-300"}>{subtitle}</p>
      <ul className={`mt-6 space-y-2 text-sm ${highlight ? "text-slate-700" : "text-slate-200"}`}>
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-orange-500">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={`/api/checkout?tier=${tier}`}
        className={`mt-8 block text-center px-4 py-3 rounded-lg font-semibold transition ${
          highlight ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-white hover:bg-slate-100 text-slate-900"
        }`}
      >
        Choisir cette formule
      </Link>
    </div>
  );
}

function BonusCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">Bonus #{n}</p>
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}
