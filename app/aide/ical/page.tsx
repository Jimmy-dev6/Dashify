// app/aide/ical/page.tsx
// Page web publique d'aide à la synchronisation iCal.
// URL : https://dashify-plum.vercel.app/aide/ical
//
// À placer dans : app/aide/ical/page.tsx
// Style : dark premium teal, cohérent avec le reste de Dashify.

"use client";

import { useState } from "react";
import Link from "next/link";

type Section = {
  id: string;
  title: string;
};

const SECTIONS: Section[] = [
  { id: "quoi", title: "Qu'est-ce que l'iCal" },
  { id: "limites", title: "Ce que ça fait (et ne fait pas)" },
  { id: "prep", title: "Préparation" },
  { id: "airbnb-import", title: "Airbnb → Dashify" },
  { id: "airbnb-export", title: "Dashify → Airbnb" },
  { id: "booking-import", title: "Booking → Dashify" },
  { id: "booking-export", title: "Dashify → Booking" },
  { id: "delais", title: "Délais de synchronisation" },
  { id: "faq", title: "Questions fréquentes" },
  { id: "problemes", title: "Problèmes courants" },
  { id: "support", title: "Besoin d'aide" },
];

export default function AideICalPage() {
  const [activeSection, setActiveSection] = useState("quoi");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-teal-400">Dashify</span>
            <span className="text-sm text-gray-500">/ Aide</span>
          </Link>
          <a
            href="/Dashify_Guide_iCal_Airbnb_Booking.pdf"
            download
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Télécharger le PDF
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`block px-3 py-2 rounded-lg text-sm transition ${
                  activeSection === s.id
                    ? "bg-teal-500/10 text-teal-300 border-l-2 border-teal-500"
                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Contenu */}
        <main className="prose prose-invert max-w-none">
          <div className="mb-12 pb-10 border-b border-gray-800">
            <h1 className="text-4xl font-bold text-white mb-3">
              Guide de synchronisation iCal
            </h1>
            <p className="text-lg text-gray-400">
              Connectez vos calendriers Airbnb et Booking à Dashify en 10
              minutes pour éliminer les double-réservations.
            </p>
          </div>

          <Section id="quoi" title="1. Qu'est-ce que l'iCal">
            <p>
              L'iCal (ou iCalendar) est un format standard d'échange de
              calendriers utilisé par Airbnb, Booking.com, Google Calendar et la
              plupart des plateformes. Chaque plateforme vous fournit une{" "}
              <b>URL privée</b> se terminant par <code>.ics</code> qui pointe
              vers votre calendrier.
            </p>
            <p>
              Quand vous connectez cette URL à Dashify, nous la consultons
              régulièrement pour savoir quelles dates sont réservées et
              synchroniser l'information avec vos autres plateformes.
            </p>
            <Callout type="tip">
              <b>Pourquoi c'est essentiel ?</b> Sans synchronisation, un client
              peut réserver la même date sur Airbnb et sur Booking → double
              réservation → annulation → client furieux et pénalités de la
              plateforme.
            </Callout>
          </Section>

          <Section id="limites" title="2. Ce que ça fait (et ne fait pas)">
            <div className="grid md:grid-cols-2 gap-4 not-prose">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <h3 className="text-green-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                  L'iCal permet
                </h3>
                <ul className="space-y-2 text-sm text-gray-200">
                  <Bullet color="green">
                    Voir les réservations Airbnb et Booking dans Dashify
                  </Bullet>
                  <Bullet color="green">
                    Bloquer automatiquement les dates réservées sur toutes les
                    plateformes
                  </Bullet>
                  <Bullet color="green">
                    Éviter les double-réservations
                  </Bullet>
                  <Bullet color="green">
                    Gérer plusieurs logements depuis un seul endroit
                  </Bullet>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <h3 className="text-red-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                  L'iCal ne permet pas
                </h3>
                <ul className="space-y-2 text-sm text-gray-200">
                  <Bullet color="red">
                    Transférer les messages avec les clients
                  </Bullet>
                  <Bullet color="red">
                    Modifier les prix Airbnb depuis Dashify
                  </Bullet>
                  <Bullet color="red">
                    Voir les coordonnées complètes des clients
                  </Bullet>
                  <Bullet color="red">
                    Synchroniser photos et descriptions entre plateformes
                  </Bullet>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="prep" title="3. Préparation">
            <p>Avant de commencer, assurez-vous d'avoir :</p>
            <StepsList>
              <StepItem num={1} title="Votre logement créé dans Dashify">
                Allez dans <b>Logements → Nouveau logement</b>. Nom, ville et
                prix de base suffisent.
              </StepItem>
              <StepItem num={2} title="Vos accès hôte Airbnb ou Booking">
                Vous devez pouvoir vous connecter à votre compte hôte.
              </StepItem>
              <StepItem num={3} title="Un ordinateur pour la configuration">
                Les apps mobiles ne donnent pas toujours accès aux liens iCal.
              </StepItem>
              <StepItem num={4} title="15-20 minutes">
                Pour chaque logement et plateforme, comptez 5-10 min de
                configuration.
              </StepItem>
            </StepsList>
            <Callout type="success">
              La configuration est à faire <b>une seule fois</b>. Ensuite tout
              fonctionne automatiquement.
            </Callout>
          </Section>

          <Section id="airbnb-import" title="4. Airbnb → Dashify">
            <p>
              <b>Objectif :</b> faire apparaître les réservations Airbnb dans
              votre calendrier Dashify.
            </p>
            <StepsList>
              <StepItem num={1} title="Connectez-vous à Airbnb en mode hôte">
                airbnb.fr → avatar en haut à droite → <b>Mode hôte</b>.
              </StepItem>
              <StepItem num={2} title="Calendrier du logement">
                Menu <b>Calendrier</b> → sélectionnez le bon logement.
              </StepItem>
              <StepItem num={3} title="Synchroniser les calendriers">
                Panneau de droite → <b>Disponibilité</b> → section{" "}
                <b>Synchroniser les calendriers</b> →{" "}
                <b>Exporter le calendrier</b>.
              </StepItem>
              <StepItem num={4} title="Copiez l'URL .ics">
                Cliquez sur <b>Copier le lien</b>. L'URL ressemble à :
                <pre className="bg-gray-900 border border-gray-800 rounded p-2 mt-2 text-xs overflow-x-auto text-teal-300">
                  https://www.airbnb.fr/calendar/ical/12345678.ics?s=xxxxx
                </pre>
              </StepItem>
              <StepItem num={5} title="Collez dans Dashify">
                Dashify → <b>Channel Manager</b> → <b>Ajouter un channel</b>{" "}
                sur le bon logement → plateforme <b>Airbnb</b> → collez l'URL →{" "}
                <b>Enregistrer</b>.
              </StepItem>
            </StepsList>
            <Callout type="success">
              Les résas Airbnb apparaissent avec un point rose dans votre
              calendrier Dashify (comptez 5-15 min pour la première synchro).
            </Callout>
          </Section>

          <Section id="airbnb-export" title="5. Dashify → Airbnb">
            <Callout type="warning">
              C'est l'étape <b>la plus importante</b>. Sans export Dashify →
              Airbnb, un client Airbnb peut réserver une date déjà prise par un
              autre canal.
            </Callout>
            <StepsList>
              <StepItem num={1} title="URL Dashify">
                Dashify → <b>Channel Manager</b> → <b>Ajouter un channel</b>{" "}
                → <b>Exporter vers plateforme externe</b>. Copiez l'URL.
              </StepItem>
              <StepItem num={2} title="Airbnb → Disponibilité">
                Même chemin que pour l'export, mais cherchez{" "}
                <b>Importer un calendrier</b>.
              </StepItem>
              <StepItem num={3} title="Collez l'URL Dashify">
                <b>Lien :</b> URL Dashify · <b>Nom :</b> « Dashify »
              </StepItem>
              <StepItem num={4} title="Validez et testez">
                Créez une résa test dans Dashify, attendez 15-30 min,
                vérifiez dans Airbnb.
              </StepItem>
            </StepsList>
          </Section>

          <Section id="booking-import" title="6. Booking → Dashify">
            <StepsList>
              <StepItem num={1} title="Extranet Booking">
                admin.booking.com → connexion hôte.
              </StepItem>
              <StepItem num={2} title="Ouvrez le calendrier">
                <b>Tarifs et disponibilité</b> → <b>Calendrier</b>.
              </StepItem>
              <StepItem num={3} title="Synchroniser les calendriers">
                En haut à droite → <b>Synchroniser les calendriers</b>.
              </StepItem>
              <StepItem num={4} title="Copiez l'URL du bon type de chambre">
                <span className="text-amber-400 text-sm">
                  ⚠ Chaque type de chambre a son propre iCal. Si vous en avez
                  3, vous aurez 3 URLs distinctes.
                </span>
              </StepItem>
              <StepItem num={5} title="Collez dans Dashify">
                Dashify → <b>Channel Manager</b> →{" "}
                <b>Ajouter un channel</b> → plateforme <b>Booking.com</b> →
                URL → <b>Enregistrer</b>.
              </StepItem>
            </StepsList>
          </Section>

          <Section id="booking-export" title="7. Dashify → Booking">
            <Callout type="warning">
              Booking n'accepte qu'un seul connecteur externe à la fois. Si
              vous utilisez déjà Lodgify, Hostaway, etc., désactivez-le avant.
            </Callout>
            <StepsList>
              <StepItem num={1} title="URL Dashify">
                Dashify → <b>Channel Manager</b> →{" "}
                <b>Ajouter un channel</b> → <b>Exporter</b>. Copiez l'URL.
              </StepItem>
              <StepItem num={2} title="Extranet Booking → Calendrier">
                <b>Tarifs et disponibilité</b> → <b>Calendrier</b> →{" "}
                <b>Synchroniser les calendriers</b>.
              </StepItem>
              <StepItem num={3} title="Importer un calendrier externe">
                Section <b>Importer un calendrier externe</b> → sélectionnez
                le type de chambre → collez l'URL Dashify → Nom « Dashify ».
              </StepItem>
              <StepItem num={4} title="Confirmez">
                Les résas Dashify bloqueront désormais les dates Booking.
              </StepItem>
            </StepsList>
          </Section>

          <Section id="delais" title="8. Délais de synchronisation">
            <p>
              L'iCal n'est <b>pas instantané</b>. Voici les délais réels :
            </p>
            <div className="not-prose overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-500 text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">
                      Sens de synchro
                    </th>
                    <th className="px-4 py-3 text-left">Délai typique</th>
                    <th className="px-4 py-3 text-left rounded-tr-lg">
                      Délai max
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Row cells={["Dashify interne", "Instantané", "—"]} />
                  <Row cells={["Airbnb → Dashify", "5-15 min", "30 min"]} />
                  <Row cells={["Dashify → Airbnb", "2-3 heures", "4 heures"]} />
                  <Row cells={["Booking → Dashify", "15-30 min", "1 heure"]} />
                  <Row cells={["Dashify → Booking", "30 min - 2h", "3 heures"]} />
                </tbody>
              </table>
            </div>
            <Callout type="warning">
              <b>Conséquence :</b> entre 2 synchros, une double-réservation
              reste théoriquement possible. Pour réduire ce risque : Instant
              Book activé, tampon d'un jour entre résas dans vos Politiques.
            </Callout>
          </Section>

          <Section id="faq" title="9. Questions fréquentes">
            <FAQ q="L'iCal est-il gratuit ?">
              Oui. Airbnb et Booking fournissent les URLs iCal gratuitement.
              Dashify n'ajoute aucun frais.
            </FAQ>
            <FAQ q="Dois-je refaire la config chaque mois ?">
              Non. Une seule configuration suffit. Tout se synchronise
              automatiquement après.
            </FAQ>
            <FAQ q="Que se passe-t-il si j'annule une résa Airbnb ?">
              La date est libérée dans Airbnb → Dashify la voit libre (15-30
              min) → Booking la voit libre (30 min - 2h). Total : 1 à 3h max.
            </FAQ>
            <FAQ q="Puis-je utiliser d'autres plateformes (Vrbo, Expedia) ?">
              Oui. Dashify accepte toute URL iCal standard. Même procédure.
            </FAQ>
            <FAQ q="Les clients voient-ils les autres résas ?">
              Non. L'iCal transmet seulement les dates (libre/réservé), pas les
              noms, montants ou détails.
            </FAQ>
            <FAQ q="Les prix se synchronisent-ils via iCal ?">
              Non. Seules les dates sont synchronisées. Les prix restent gérés
              séparément sur chaque plateforme.
            </FAQ>
          </Section>

          <Section id="problemes" title="10. Problèmes courants">
            <Problem q="Les résas Airbnb n'apparaissent pas dans Dashify">
              1. Vérifiez l'URL collée (pas d'espace).<br />
              2. Patientez 30 min.<br />
              3. Forcez un refresh : <b>Channel Manager → Tout synchroniser</b>
              .<br />
              4. Si rien ne marche, ouvrez un ticket.
            </Problem>
            <Problem q="Airbnb dit « URL invalide »">
              Vérifiez que l'URL commence par <code>https://</code> et finit
              par <code>.ics</code>. Régénérez si besoin.
            </Problem>
            <Problem q="Double-réservation malgré la synchro">
              Cause : fenêtre de latence iCal (30 min - 2h). Solutions :
              Instant Book, tampon d'un jour dans vos Politiques.
            </Problem>
            <Problem q="Résa annulée encore bloquée">
              Patientez 1h puis forcez la synchro manuelle dans Channel
              Manager.
            </Problem>
            <Problem q="Dates décalées d'un jour">
              Problème de fuseau. Vérifiez que votre profil est réglé sur{" "}
              <b>Africa/Dakar (UTC+0)</b>.
            </Problem>
          </Section>

          <Section id="support" title="11. Besoin d'aide">
            <p>
              Si vous êtes bloqué après avoir suivi ce guide, ouvrez un ticket.
              Notre équipe répond sous 24h ouvrées.
            </p>
            <div className="not-prose mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 px-6 py-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition shadow-lg shadow-teal-500/20"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3 5l7 7 7-7M3 5v10a2 2 0 002 2h10a2 2 0 002-2V5M3 5h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Ouvrir un ticket de support
              </Link>
            </div>
            <Callout type="info">
              <b>Pour accélérer le traitement de votre ticket, indiquez :</b>
              <br />• le nom du logement concerné
              <br />• la plateforme problématique (Airbnb, Booking, ou les deux)
              <br />• un screenshot de l'erreur si possible
              <br />• ce que vous avez déjà essayé
            </Callout>
          </Section>

          <div className="mt-16 pt-10 border-t border-gray-800 text-center">
            <p className="text-teal-400 font-semibold text-lg mb-2">
              Merci d'utiliser Dashify 🇸🇳
            </p>
            <p className="text-sm text-gray-500">
              Notre mission : simplifier la vie des hôtes d'Afrique de l'Ouest.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2 className="text-2xl font-bold text-teal-400 mb-4 pb-2 border-b border-gray-800">
        {title}
      </h2>
      <div className="text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "warning" | "success" | "tip";
  children: React.ReactNode;
}) {
  const colors = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-200",
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-100",
    success: "bg-green-500/10 border-green-500/30 text-green-100",
    tip: "bg-teal-500/10 border-teal-500/30 text-teal-100",
  };
  const icons = {
    info: "ℹ",
    warning: "⚠",
    success: "✓",
    tip: "💡",
  };
  return (
    <div
      className={`not-prose my-4 p-4 rounded-lg border ${colors[type]} flex gap-3`}
    >
      <div className="text-xl flex-shrink-0">{icons[type]}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function StepsList({ children }: { children: React.ReactNode }) {
  return <div className="not-prose my-4 space-y-4">{children}</div>;
}

function StepItem({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-teal-500 text-white font-bold flex items-center justify-center">
        {num}
      </div>
      <div className="flex-1 pt-1">
        <p className="font-semibold text-white mb-1">{title}</p>
        <div className="text-sm text-gray-400 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Bullet({
  color,
  children,
}: {
  color: "green" | "red";
  children: React.ReactNode;
}) {
  const c = color === "green" ? "text-green-400" : "text-red-400";
  const sym = color === "green" ? "✓" : "✗";
  return (
    <li className="flex gap-2">
      <span className={`${c} font-bold flex-shrink-0`}>{sym}</span>
      <span>{children}</span>
    </li>
  );
}

function Row({ cells }: { cells: string[] }) {
  return (
    <tr className="even:bg-gray-900/50">
      {cells.map((c, i) => (
        <td key={i} className="px-4 py-3 border-b border-gray-800">
          {c}
        </td>
      ))}
    </tr>
  );
}

function FAQ({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="not-prose border-b border-gray-800 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-left"
      >
        <span className="font-medium text-white">{q}</span>
        <span className={`text-teal-400 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="mt-3 text-sm text-gray-400 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

function Problem({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <div className="not-prose mb-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <p className="font-semibold text-white mb-2">{q}</p>
      <div className="text-sm text-gray-400 leading-relaxed">{children}</div>
    </div>
  );
}
