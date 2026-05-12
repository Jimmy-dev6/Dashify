import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SITE_URL, SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/site";

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
      "Devis WhatsApp, paiements Mobile Money, calendrier qui ne plante pas. Pour ton Airbnb au Sénégal.",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dashify — Le SaaS des hôtes courte durée",
    description:
      "Devis WhatsApp, paiements Mobile Money, calendrier qui ne plante pas.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <PublicHeader />

      <main>
        {/* === Hero === */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Arrête de bloquer tes dates pour des clients WhatsApp qui ne paient jamais.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-zinc-600 sm:text-xl">
              Dashify automatise tes devis, bloque tes dates seulement quand c&apos;est sérieux, et encaisse en Mobile Money. Pensé pour les hôtes Airbnb, Booking, Vrbo au Sénégal et en Afrique de l&apos;Ouest.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md bg-teal-700 px-6 py-3 text-base font-medium text-white hover:bg-teal-800"
              >
                Demander une démo
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
              >
                Lire le blog
              </Link>
            </div>
          </div>
        </section>

        {/* === Le problème === */}
        <section className="border-b border-zinc-100 bg-zinc-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Le scénario que tu connais trop bien
            </h2>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <li className="rounded-lg border border-zinc-200 bg-white p-6">
                <span className="text-sm font-semibold text-teal-700">Étape 1</span>
                <p className="mt-3 text-base text-zinc-900">Un client WhatsApp te demande une réservation pour le mois prochain.</p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-6">
                <span className="text-sm font-semibold text-teal-700">Étape 2</span>
                <p className="mt-3 text-base text-zinc-900">Tu bloques les dates dans ta tête, et tu attends son virement Wave.</p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-6">
                <span className="text-sm font-semibold text-teal-700">Étape 3</span>
                <p className="mt-3 text-base text-zinc-900">Tu attends. Tu relances. Il ne répond plus.</p>
              </li>
              <li className="rounded-lg border border-zinc-200 bg-white p-6">
                <span className="text-sm font-semibold text-teal-700">Étape 4</span>
                <p className="mt-3 text-base text-zinc-900">Pendant ce temps, tu as refusé 3 autres demandes. Chambre vide.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* === La solution === */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Avec Dashify, ce flux marche tout seul
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-zinc-600">
              Le workflow killer, en 5 étapes. Pas de surprise, pas de date qui dort, pas de chambre vide.
            </p>
            <ol className="mt-12 space-y-6">
              <li className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-semibold text-white">1</span>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Tu crées un devis depuis ton dashboard</h3>
                  <p className="mt-1 text-zinc-600">Les dates sont automatiquement bloquées 48h pour ce client. Ton calendrier ne ment plus.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-semibold text-white">2</span>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Dashify génère un message WhatsApp prêt à envoyer</h3>
                  <p className="mt-1 text-zinc-600">Avec le détail du séjour, le montant, et un lien vers une page de paiement brandée à tes couleurs.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-semibold text-white">3</span>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Le client paie directement sur ton numéro Mobile Money</h3>
                  <p className="mt-1 text-zinc-600">Orange Money, Wave ou Free Money. Pas d&apos;intermédiaire, pas de commission, pas de KYC.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-semibold text-white">4</span>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Tu cliques &quot;J&apos;ai reçu le paiement&quot;</h3>
                  <p className="mt-1 text-zinc-600">La réservation est confirmée, le calendrier verrouillé sur toutes tes plateformes synchronisées.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 text-base font-semibold text-white">5</span>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Pas de paiement à temps ? Les dates redeviennent dispo</h3>
                  <p className="mt-1 text-zinc-600">Automatiquement, sans que tu aies à y penser. Plus de chambre vide à cause d&apos;un fantôme.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* === Features === */}
        <section className="border-b border-zinc-100 bg-zinc-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Pensé pour le terrain ouest-africain
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-zinc-900">Mobile Money natif</h3>
                <p className="mt-2 text-zinc-600">Orange Money, Wave, Free Money. Aucun intermédiaire — l&apos;argent va directement sur ton numéro. Zéro KYC, zéro commission Dashify.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-zinc-900">Channel Manager intégré</h3>
                <p className="mt-2 text-zinc-600">Synchronisation iCal avec Airbnb, Booking.com, Vrbo et Expedia. Plus jamais de double booking entre tes plateformes.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-zinc-900">Calendrier des événements SN</h3>
                <p className="mt-2 text-zinc-600">Tabaski, Magal, Korité, Gamou, CAN, Dakar Rally. Anticipe les pics de demande et ajuste tes tarifs avant les autres.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-zinc-900">WhatsApp comme canal n°1</h3>
                <p className="mt-2 text-zinc-600">Tes clients vivent sur WhatsApp, pas dans les emails. Dashify formate tes messages pour qu&apos;ils soient envoyés en un clic.</p>
              </div>
            </div>
          </div>
        </section>

        {/* === Pour qui === */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Pour qui Dashify est fait
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-8">
                <h3 className="text-xl font-semibold text-zinc-900">Particuliers</h3>
                <p className="mt-1 text-sm text-teal-800">1 à 3 logements</p>
                <p className="mt-4 text-zinc-700">Tu loues ton appart à Yoff ou ta villa à Saly. Tu en as marre de gérer 6 conversations WhatsApp en parallèle avec ton calendrier griffonné sur un carnet.</p>
              </div>
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-8">
                <h3 className="text-xl font-semibold text-zinc-900">Conciergeries &amp; petits pros</h3>
                <p className="mt-1 text-sm text-teal-800">5 à 20 logements</p>
                <p className="mt-4 text-zinc-700">Tu gères les biens de plusieurs propriétaires, tu jongles entre Airbnb, Booking et les demandes directes. Tu as besoin de tracking propre pour ton reporting mensuel.</p>
              </div>
            </div>
          </div>
        </section>

        {/* === Tarifs === */}
        <section className="border-b border-zinc-100 bg-zinc-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Un seul tarif, pas de surprise
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-zinc-600">
              Pas de pourcentage sur tes réservations, pas de frais cachés, pas d&apos;engagement. Tu paies pour ce que tu utilises, point.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="rounded-lg border-2 border-teal-700 bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Tarif unique</p>
                <p className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900">10 000</span>
                  <span className="ml-2 text-base font-medium text-zinc-600">FCFA</span>
                </p>
                <p className="text-sm text-zinc-600">par logement, par mois, TTC</p>
                <ul className="mt-6 space-y-2 text-sm text-zinc-700">
                  <li>• Sans engagement</li>
                  <li>• Mobile Money intégré</li>
                  <li>• Channel Manager iCal</li>
                  <li>• Devis et calendrier illimités</li>
                  <li>• Support WhatsApp direct</li>
                </ul>
              </div>
              <div className="sm:col-span-2 flex flex-col justify-center rounded-lg border border-zinc-200 bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Exemple concret</p>
                <p className="mt-3 text-lg text-zinc-700">
                  Une conciergerie qui gère 10 logements paie <strong className="text-zinc-900">100 000 FCFA par mois</strong>.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  Soit l&apos;équivalent de 1 à 2 réservations perdues par mois à cause d&apos;un client WhatsApp fantôme. Le calcul est vite fait.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* === Ressources === */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Ressources pour les hôtes
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-zinc-600">
              Avant même d&apos;utiliser Dashify, nos guides peuvent déjà te faire gagner du temps.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <Link
                href="/blog"
                className="group rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-teal-300 hover:bg-teal-50/30"
              >
                <h3 className="text-xl font-semibold text-zinc-900 group-hover:text-teal-800">Le blog Dashify</h3>
                <p className="mt-2 text-zinc-600">Guides pratiques sur les paiements Mobile Money, la synchronisation calendrier, les événements qui boostent ta demande, et plus encore.</p>
                <p className="mt-4 text-sm font-medium text-teal-700">Lire les articles →</p>
              </Link>
              <Link
                href="/aide/ical"
                className="group rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-teal-300 hover:bg-teal-50/30"
              >
                <h3 className="text-xl font-semibold text-zinc-900 group-hover:text-teal-800">Guide iCal complet</h3>
                <p className="mt-2 text-zinc-600">Comment connecter Airbnb, Booking, Vrbo et Expedia pour éviter à 100% les doubles réservations. Pas-à-pas, captures incluses.</p>
                <p className="mt-4 text-sm font-medium text-teal-700">Voir le guide →</p>
              </Link>
            </div>
          </div>
        </section>

        {/* === CTA final === */}
        <section className="bg-teal-700">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Prêt à arrêter de bloquer tes dates pour rien ?
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-teal-100">
              Demande une démo de 15 minutes. On regarde ensemble si Dashify peut t&apos;aider, et si oui on te configure ton compte dans la foulée.
            </p>
            <div className="mt-10">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-teal-800 hover:bg-teal-50"
              >
                Demander une démo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}