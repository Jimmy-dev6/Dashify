import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOCALE,
  DEFAULT_OG_IMAGE,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Dashify — Le SaaS des hôtes courte durée en Afrique de l'Ouest",
  description:
    "Devis WhatsApp, paiements Mobile Money, calendrier qui ne plante pas. Le SaaS pensé pour les hôtes Airbnb, Booking, Vrbo au Sénégal et en Afrique de l'Ouest.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: SITE_URL,
    title: "Dashify — Le SaaS des hôtes courte durée en Afrique de l'Ouest",
    description:
      "Devis WhatsApp, paiements Mobile Money, calendrier qui ne plante pas.",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashify — Le SaaS des hôtes courte durée",
    description: "Devis WhatsApp, paiements Mobile Money, calendrier qui ne plante pas.",
    images: [DEFAULT_OG_IMAGE],
  },
};

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`inline-block transition-transform group-hover:translate-x-1 ${className}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M2 8h12M9 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <PublicHeader />

      <main>
        {/* === HERO === */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-700/5 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-orange-700/5 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
            <div className="max-w-4xl">
              <p
                className="mb-8 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-orange-700 opacity-0 animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                <span className="h-px w-8 bg-orange-700" />
                Mobile Money · WhatsApp · Calendrier
              </p>

              <h1
                className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-stone-900 opacity-0 animate-fade-in-up sm:text-6xl lg:text-7xl"
                style={{ animationDelay: "0.2s" }}
              >
                Arrête de bloquer tes dates pour des clients WhatsApp{" "}
                <span className="italic font-medium text-teal-800">qui ne paient jamais.</span>
              </h1>

              <p
                className="mt-8 max-w-2xl text-lg leading-relaxed text-stone-600 opacity-0 animate-fade-in-up sm:text-xl"
                style={{ animationDelay: "0.35s" }}
              >
                Dashify automatise tes devis, bloque tes dates seulement quand c&apos;est sérieux, et encaisse en Mobile Money. Pensé pour les hôtes Airbnb, Booking, Vrbo au Sénégal et en Afrique de l&apos;Ouest.
              </p>

              <div
                className="mt-12 flex flex-col gap-4 opacity-0 animate-fade-in-up sm:flex-row sm:items-center"
                style={{ animationDelay: "0.5s" }}
              >
                <Link
                  href="/contact"
                  className="group inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-7 py-3.5 text-base font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md"
                >
                  Demander une démo
                  <Arrow />
                </Link>
                <Link
                  href="/blog"
                  className="group inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-7 py-3.5 text-base font-medium text-stone-800 transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:text-teal-800 hover:shadow-sm"
                >
                  Lire le blog
                  <Arrow />
                </Link>
              </div>

              <div
                className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-stone-500 opacity-0 animate-fade-in"
                style={{ animationDelay: "0.7s" }}
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-700" />
                  100% Mobile Money
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-700" />
                  0 commission sur tes réservations
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-700" />
                  Pensé à Dakar
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* === LE PROBLÈME === */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700">
                  Le scénario
                </p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                  Tu le connais trop bien.
                </h2>
              </div>
              <div className="lg:col-span-8">
                <ol className="space-y-6">
                  <li className="flex gap-5">
                    <span className="font-display text-3xl font-light italic text-orange-700 sm:text-4xl">01</span>
                    <p className="pt-1 text-lg text-stone-700 sm:text-xl">Un client WhatsApp te demande une réservation pour le mois prochain.</p>
                  </li>
                  <li className="flex gap-5">
                    <span className="font-display text-3xl font-light italic text-orange-700 sm:text-4xl">02</span>
                    <p className="pt-1 text-lg text-stone-700 sm:text-xl">Tu bloques les dates dans ta tête, et tu attends son virement Wave.</p>
                  </li>
                  <li className="flex gap-5">
                    <span className="font-display text-3xl font-light italic text-orange-700 sm:text-4xl">03</span>
                    <p className="pt-1 text-lg text-stone-700 sm:text-xl">Tu attends. Tu relances. Il ne répond plus.</p>
                  </li>
                  <li className="flex gap-5">
                    <span className="font-display text-3xl font-light italic text-orange-700 sm:text-4xl">04</span>
                    <p className="pt-1 text-lg text-stone-700 sm:text-xl">Pendant ce temps, tu as refusé 3 autres demandes. Chambre vide.</p>
                  </li>
                </ol>
                <div className="mt-10 rounded-xl border-l-4 border-orange-700 bg-orange-50/60 px-6 py-5">
                  <p className="font-display text-xl italic text-stone-800 sm:text-2xl">
                    &ldquo;Bloquer ses dates pour un client WhatsApp qui disparaît, c&apos;est perdre deux fois. Le temps, et la résa qu&apos;on aurait pu accepter.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* === LA SOLUTION === */}
        <section className="bg-stone-50">
          <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700">
                Le workflow killer
              </p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                Avec Dashify, ce flux marche{" "}
                <span className="italic font-medium text-teal-800">tout seul.</span>
              </h2>
              <p className="mt-6 text-lg text-stone-600 sm:text-xl">
                Cinq étapes. Pas de surprise, pas de date qui dort, pas de chambre vide.
              </p>
            </div>

            <ol className="relative mt-16 space-y-12 border-l border-dashed border-stone-300 pl-10 sm:pl-12">
              <li className="relative">
                <span className="absolute -left-[3.7rem] flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 font-display text-lg font-semibold text-white sm:-left-[4.2rem]">1</span>
                <h3 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">Tu crées un devis depuis ton dashboard</h3>
                <p className="mt-3 text-lg text-stone-600">Les dates sont automatiquement bloquées 48h pour ce client. Ton calendrier ne ment plus.</p>
              </li>
              <li className="relative">
                <span className="absolute -left-[3.7rem] flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 font-display text-lg font-semibold text-white sm:-left-[4.2rem]">2</span>
                <h3 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">Dashify génère un message WhatsApp prêt à envoyer</h3>
                <p className="mt-3 text-lg text-stone-600">Avec le détail du séjour, le montant, et un lien vers une page de paiement brandée à tes couleurs.</p>
              </li>
              <li className="relative">
                <span className="absolute -left-[3.7rem] flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 font-display text-lg font-semibold text-white sm:-left-[4.2rem]">3</span>
                <h3 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">Le client paie sur ton numéro Mobile Money</h3>
                <p className="mt-3 text-lg text-stone-600">Orange Money, Wave ou Free Money. Pas d&apos;intermédiaire, pas de commission, pas de KYC.</p>
              </li>
              <li className="relative">
                <span className="absolute -left-[3.7rem] flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 font-display text-lg font-semibold text-white sm:-left-[4.2rem]">4</span>
                <h3 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">Tu cliques « J&apos;ai reçu le paiement »</h3>
                <p className="mt-3 text-lg text-stone-600">La réservation est confirmée, le calendrier verrouillé sur toutes tes plateformes synchronisées.</p>
              </li>
              <li className="relative">
                <span className="absolute -left-[3.7rem] flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 font-display text-lg font-semibold text-white sm:-left-[4.2rem]">5</span>
                <h3 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">Pas de paiement à temps ? Les dates redeviennent dispo</h3>
                <p className="mt-3 text-lg text-stone-600">Automatiquement, sans que tu aies à y penser. Plus de chambre vide à cause d&apos;un fantôme.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* === FEATURES === */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700">
                Différenciateurs
              </p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                Pensé pour le terrain{" "}
                <span className="italic font-medium text-teal-800">ouest-africain.</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              <article className="group rounded-2xl border border-stone-200 bg-stone-50 p-8 transition-all hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg">
                <p className="mb-4 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">OM · Wave · Free Money</p>
                <h3 className="font-display text-2xl font-semibold text-stone-900">Mobile Money natif</h3>
                <p className="mt-3 text-stone-600">Aucun intermédiaire — l&apos;argent va directement sur ton numéro. Zéro KYC à imposer à tes clients, zéro commission Dashify sur tes réservations.</p>
              </article>
              <article className="group rounded-2xl border border-stone-200 bg-stone-50 p-8 transition-all hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg">
                <p className="mb-4 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">Airbnb · Booking · Vrbo · Expedia</p>
                <h3 className="font-display text-2xl font-semibold text-stone-900">Channel Manager intégré</h3>
                <p className="mt-3 text-stone-600">Synchronisation iCal sur les 4 plateformes principales. Plus jamais de double booking, plus jamais d&apos;annulation embarrassante.</p>
              </article>
              <article className="group rounded-2xl border border-stone-200 bg-stone-50 p-8 transition-all hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg">
                <p className="mb-4 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">Magal · Tabaski · CAN · Korité</p>
                <h3 className="font-display text-2xl font-semibold text-stone-900">Calendrier des événements SN</h3>
                <p className="mt-3 text-stone-600">Les pics de demande des fêtes locales et événements sportifs sont anticipés dans ton dashboard. Ajuste tes tarifs avant les autres hôtes.</p>
              </article>
              <article className="group rounded-2xl border border-stone-200 bg-stone-50 p-8 transition-all hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg">
                <p className="mb-4 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">Canal n°1 des hôtes ouest-africains</p>
                <h3 className="font-display text-2xl font-semibold text-stone-900">WhatsApp first</h3>
                <p className="mt-3 text-stone-600">Tes clients vivent sur WhatsApp, pas dans les emails. Dashify formate tes messages pour qu&apos;ils soient envoyés en un clic depuis ton téléphone.</p>
              </article>
            </div>
          </div>
        </section>

        {/* === POUR QUI === */}
        <section className="bg-stone-50">
          <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700">
                Cibles
              </p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                Pour qui Dashify est fait.
              </h2>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-2">
              <article className="group relative overflow-hidden rounded-2xl border border-teal-200 bg-white p-10 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-100/50" />
                <p className="relative font-display text-7xl font-bold leading-none text-teal-700 sm:text-8xl">
                  1<span className="text-stone-300">→</span>3
                </p>
                <h3 className="relative mt-6 font-display text-3xl font-semibold text-stone-900">Particuliers</h3>
                <p className="relative mt-1 text-sm font-medium uppercase tracking-wider text-teal-700">logements</p>
                <p className="relative mt-6 text-lg leading-relaxed text-stone-700">Tu loues ton appart à Yoff ou ta villa à Saly. Tu en as marre de gérer 6 conversations WhatsApp en parallèle avec ton calendrier griffonné sur un carnet.</p>
              </article>

              <article className="group relative overflow-hidden rounded-2xl border border-orange-200 bg-white p-10 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-100/50" />
                <p className="relative font-display text-7xl font-bold leading-none text-orange-700 sm:text-8xl">
                  5<span className="text-stone-300">→</span>20
                </p>
                <h3 className="relative mt-6 font-display text-3xl font-semibold text-stone-900">Conciergeries</h3>
                <p className="relative mt-1 text-sm font-medium uppercase tracking-wider text-orange-700">logements</p>
                <p className="relative mt-6 text-lg leading-relaxed text-stone-700">Tu gères les biens de plusieurs propriétaires, tu jongles entre Airbnb, Booking et les demandes directes. Tu as besoin de tracking propre pour ton reporting mensuel.</p>
              </article>
            </div>
          </div>
        </section>

        {/* === TARIFS === */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
            <div className="grid gap-16 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700">
                  Tarification
                </p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                  Un seul tarif,{" "}
                  <span className="italic font-medium text-teal-800">pas de surprise.</span>
                </h2>
                <p className="mt-6 text-lg leading-relaxed text-stone-600">
                  Pas de pourcentage sur tes réservations. Pas de frais cachés. Pas d&apos;engagement. Tu paies pour ce que tu utilises, point.
                </p>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-3xl border-2 border-teal-700 bg-stone-50 p-10 lg:p-12">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-7xl font-black tracking-tight text-stone-900 sm:text-8xl">10 000</span>
                    <span className="text-2xl font-medium text-stone-600">FCFA</span>
                  </div>
                  <p className="mt-2 text-base text-stone-600">par logement, par mois, TTC</p>

                  <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    <li className="flex items-start gap-2 text-base text-stone-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-700" />Sans engagement</li>
                    <li className="flex items-start gap-2 text-base text-stone-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-700" />Mobile Money intégré</li>
                    <li className="flex items-start gap-2 text-base text-stone-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-700" />Channel Manager iCal</li>
                    <li className="flex items-start gap-2 text-base text-stone-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-700" />Devis & calendrier illimités</li>
                    <li className="flex items-start gap-2 text-base text-stone-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-700" />Support WhatsApp direct</li>
                    <li className="flex items-start gap-2 text-base text-stone-700"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-700" />Calendrier événements SN</li>
                  </ul>

                  <div className="mt-8 border-t border-stone-200 pt-6">
                    <p className="text-base leading-relaxed text-stone-700">
                      <span className="font-semibold text-stone-900">Exemple :</span>{" "}une conciergerie de 10 logements paie{" "}
                      <span className="font-display font-semibold italic text-teal-800">100 000 FCFA / mois</span>. Soit l&apos;équivalent de 1 à 2 résas perdues à cause d&apos;un client WhatsApp fantôme.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* === RESSOURCES === */}
        <section className="bg-stone-50">
          <div className="mx-auto max-w-6xl px-6 py-24 lg:py-28">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-700">
                Pour aller plus loin
              </p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                Avant même d&apos;utiliser Dashify,{" "}
                <span className="italic font-medium text-teal-800">on partage déjà.</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              <Link href="/blog" className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 transition-all hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Le blog Dashify</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-stone-900 transition-colors group-hover:text-teal-800 sm:text-3xl">Guides pour hôtes courte durée</h3>
                <p className="mt-3 text-stone-600">Paiements Mobile Money, synchronisation calendrier, événements qui boostent ta demande, et plus encore.</p>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-teal-700">Lire les articles<Arrow /></p>
              </Link>
              <Link href="/aide/ical" className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 transition-all hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg">
                <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Guide complet</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-stone-900 transition-colors group-hover:text-orange-800 sm:text-3xl">Synchronisation iCal pas-à-pas</h3>
                <p className="mt-3 text-stone-600">Connecter Airbnb, Booking, Vrbo et Expedia pour éviter les doubles bookings à 100%. Captures incluses.</p>
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-orange-700">Voir le guide<Arrow /></p>
              </Link>
            </div>
          </div>
        </section>

        {/* === CTA FINAL === */}
        <section className="relative overflow-hidden bg-teal-800">
          <div aria-hidden className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(254,176,57,0.15) 0%, transparent 50%)" }} />
          <div className="relative mx-auto max-w-4xl px-6 py-24 text-center lg:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-teal-200">On y va</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Prêt à arrêter de bloquer tes dates{" "}
              <span className="italic font-medium text-orange-200">pour rien ?</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-teal-100">Demande une démo de 15 minutes. On regarde ensemble si Dashify peut t&apos;aider, et si oui on te configure ton compte dans la foulée.</p>
            <div className="mt-10">
              <Link href="/contact" className="group inline-flex items-center justify-center gap-2 rounded-md bg-white px-8 py-4 text-base font-medium text-teal-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl">
                Demander une démo<Arrow />
              </Link>
            </div>
            <p className="mt-8 font-display text-sm italic text-teal-200">
              Fait à Dakar — pour les hôtes d&apos;Afrique de l&apos;Ouest.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}