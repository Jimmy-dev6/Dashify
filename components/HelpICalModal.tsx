"use client";

import { useState } from "react";

type Platform = "airbnb" | "booking";
type Direction = "import" | "export";

interface HelpICalModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal d'aide iCal Dashify.
 *
 * Utilisation :
 *   const [helpOpen, setHelpOpen] = useState(false);
 *   <button onClick={() => setHelpOpen(true)}>Comment synchroniser ?</button>
 *   <HelpICalModal open={helpOpen} onClose={() => setHelpOpen(false)} />
 */
export default function HelpICalModal({ open, onClose }: HelpICalModalProps) {
  const [platform, setPlatform] = useState<Platform>("airbnb");
  const [direction, setDirection] = useState<Direction>("import");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">
              Synchroniser vos calendriers
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Airbnb et Booking via iCal — guide étape par étape
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Tabs plateforme */}
        <div className="flex border-b border-gray-800 bg-gray-950">
          <TabButton
            active={platform === "airbnb"}
            onClick={() => setPlatform("airbnb")}
          >
            Airbnb
          </TabButton>
          <TabButton
            active={platform === "booking"}
            onClick={() => setPlatform("booking")}
          >
            Booking.com
          </TabButton>
        </div>

        {/* Sous-tabs direction */}
        <div className="flex gap-2 px-6 pt-4 pb-2 bg-gray-900">
          <DirectionPill
            active={direction === "import"}
            onClick={() => setDirection("import")}
            label={`${
              platform === "airbnb" ? "Airbnb" : "Booking"
            } → Dashify`}
            subtitle="Importer les réservations"
          />
          <DirectionPill
            active={direction === "export"}
            onClick={() => setDirection("export")}
            label={`Dashify → ${
              platform === "airbnb" ? "Airbnb" : "Booking"
            }`}
            subtitle="Bloquer les dates externes"
          />
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto max-h-[50vh] px-6 py-4 bg-gray-900">
          <Steps platform={platform} direction={direction} />

          <div className="mt-6 p-4 rounded-lg bg-teal-500/10 border border-teal-500/30">
            <div className="flex items-start gap-3">
              <div className="text-teal-400 text-lg">⏱</div>
              <div>
                <p className="text-sm font-semibold text-teal-300 mb-1">
                  Délai de synchronisation
                </p>
                <p className="text-sm text-gray-300">
                  {getDelay(platform, direction)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-950">
          <a
            href="/Dashify_Guide_iCal_Airbnb_Booking.pdf"
            download
            className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-2 transition"
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
            Télécharger le guide complet (PDF)
          </a>
          <a
            href="/contact"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Ouvrir un ticket →
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-6 py-3 text-sm font-medium transition relative ${
        active ? "text-teal-400" : "text-gray-400 hover:text-gray-200"
      }`}
    >
      {children}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />
      )}
    </button>
  );
}

function DirectionPill({
  active,
  onClick,
  label,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 rounded-lg text-left transition border ${
        active
          ? "bg-teal-500/10 border-teal-500/50 text-white"
          : "bg-gray-800/50 border-gray-800 text-gray-400 hover:bg-gray-800"
      }`}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs mt-0.5 opacity-75">{subtitle}</div>
    </button>
  );
}

function Step({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 text-white font-bold text-sm flex items-center justify-center">
        {num}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-semibold text-white mb-1">{title}</p>
        <div className="text-sm text-gray-400 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// CONTENU PAR SCÉNARIO
// ============================================================

function Steps({
  platform,
  direction,
}: {
  platform: Platform;
  direction: Direction;
}) {
  if (platform === "airbnb" && direction === "import") {
    return (
      <>
        <Step num={1} title="Connectez-vous à Airbnb en mode hôte">
          Rendez-vous sur <b>airbnb.fr</b>, cliquez sur votre avatar en haut à
          droite → <b>Mode hôte</b>.
        </Step>
        <Step num={2} title="Ouvrez le calendrier du logement concerné">
          Menu <b>Calendrier</b> → sélectionnez le logement à synchroniser.
        </Step>
        <Step num={3} title="Accédez à la synchronisation">
          À droite : <b>Disponibilité</b> → section{" "}
          <b>Synchroniser les calendriers</b> → <b>Exporter le calendrier</b>.
        </Step>
        <Step num={4} title="Copiez l'URL qui se termine par .ics">
          Cliquez sur <b>Copier le lien</b>. Cette URL est privée, ne la
          partagez jamais.
        </Step>
        <Step num={5} title="Collez-la dans Dashify">
          Dashify → <b>Channel Manager</b> → <b>Ajouter un channel</b> sur le
          bon logement → choisissez <b>Airbnb</b> → collez l'URL → Enregistrer.
        </Step>
      </>
    );
  }

  if (platform === "airbnb" && direction === "export") {
    return (
      <>
        <Step num={1} title="Récupérez l'URL Dashify">
          Dashify → <b>Channel Manager</b> → <b>Ajouter un channel</b> →{" "}
          <b>Exporter vers plateforme externe</b>. Copiez l'URL générée.
        </Step>
        <Step num={2} title="Dans Airbnb, allez sur Calendrier → Disponibilité">
          Même chemin que pour l'export, mais cherchez{" "}
          <b>Importer un calendrier</b>.
        </Step>
        <Step num={3} title="Collez l'URL Dashify">
          <b>Lien :</b> URL Dashify copiée<br />
          <b>Nom :</b> « Dashify »
        </Step>
        <Step num={4} title="Validez">
          Vos réservations Dashify bloqueront désormais les dates dans Airbnb.
          <br />
          <span className="text-amber-400 text-xs">
            ⚠ Test recommandé : créez une résa test, attendez 15 min, vérifiez
            dans Airbnb.
          </span>
        </Step>
      </>
    );
  }

  if (platform === "booking" && direction === "import") {
    return (
      <>
        <Step num={1} title="Connectez-vous à l'extranet Booking.com">
          Rendez-vous sur <b>admin.booking.com</b>.
        </Step>
        <Step num={2} title="Ouvrez le calendrier">
          Menu <b>Tarifs et disponibilité</b> → <b>Calendrier</b>.
        </Step>
        <Step num={3} title="Cliquez sur « Synchroniser les calendriers »">
          En haut à droite du calendrier. Booking affiche une liste d'URLs par
          type de chambre.
        </Step>
        <Step num={4} title="Copiez l'URL correspondant au bon logement">
          <span className="text-amber-400 text-xs">
            ⚠ Chaque type de chambre a son propre iCal. Si vous avez 3 types,
            vous aurez 3 URLs distinctes à connecter à 3 logements Dashify.
          </span>
        </Step>
        <Step num={5} title="Collez-la dans Dashify">
          Dashify → <b>Channel Manager</b> → <b>Ajouter un channel</b> →
          choisissez <b>Booking.com</b> → collez l'URL → Enregistrer.
        </Step>
      </>
    );
  }

  // booking + export
  return (
    <>
      <Step num={1} title="Récupérez l'URL Dashify">
        Dashify → <b>Channel Manager</b> → <b>Ajouter un channel</b> →{" "}
        <b>Exporter</b>. Copiez l'URL générée.
      </Step>
      <Step num={2} title="Dans Booking, ouvrez le calendrier">
        Extranet → <b>Tarifs et disponibilité</b> → <b>Calendrier</b> →{" "}
        <b>Synchroniser les calendriers</b>.
      </Step>
      <Step num={3} title="Importez un calendrier externe">
        Section <b>Importer un calendrier externe</b> → sélectionnez le type de
        chambre → collez l'URL Dashify → <b>Nom :</b> « Dashify ».
      </Step>
      <Step num={4} title="Confirmez">
        <span className="text-amber-400 text-xs">
          ⚠ Désactivez d'abord tout autre connecteur (Lodgify, Hostaway) —
          Booking n'accepte qu'un import externe à la fois.
        </span>
      </Step>
    </>
  );
}

function getDelay(platform: Platform, direction: Direction): string {
  if (direction === "import") {
    return platform === "airbnb"
      ? "Les réservations Airbnb apparaissent dans Dashify sous 5 à 15 minutes. La première synchro peut prendre jusqu'à 30 min."
      : "Les réservations Booking apparaissent dans Dashify sous 15 à 30 minutes.";
  }
  return platform === "airbnb"
    ? "Les réservations Dashify bloquent les dates dans Airbnb sous 2 à 3 heures."
    : "Les réservations Dashify bloquent les dates dans Booking sous 30 minutes à 2 heures.";
}
