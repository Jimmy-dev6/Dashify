"use client";

import Link from "next/link";

// Événements locaux Sénégal avec dates 2026-2027 (approximatives pour Hijri)
// Sources : calendrier islamique Umm al-Qura, calendriers officiels SN
type Event = {
  name: string;
  date: string; // YYYY-MM-DD
  impact: number; // multiplicateur ×1.x
  emoji: string;
  tags: string[];
};

const EVENTS: Event[] = [
  { name: "Fête nationale du Sénégal", date: "2026-04-04", impact: 1.2, emoji: "🇸🇳", tags: ["National"] },
  { name: "Korité (Aïd el-Fitr)", date: "2026-04-20", impact: 1.4, emoji: "🌙", tags: ["Religieux"] },
  { name: "Tabaski (Aïd el-Kébir)", date: "2026-06-27", impact: 1.5, emoji: "🐏", tags: ["Religieux"] },
  { name: "Vacances scolaires été", date: "2026-07-15", impact: 1.2, emoji: "☀️", tags: ["Tourisme"] },
  { name: "Gamou de Tivaouane", date: "2026-09-04", impact: 1.4, emoji: "✨", tags: ["Religieux"] },
  { name: "Magal de Touba", date: "2026-08-15", impact: 1.6, emoji: "🕌", tags: ["Religieux"] },
  { name: "Vacances fin d'année", date: "2026-12-20", impact: 1.2, emoji: "🎄", tags: ["Tourisme"] },
  { name: "Nouvel An", date: "2027-01-01", impact: 1.5, emoji: "🎉", tags: ["International"] },
  { name: "Dakar Rally", date: "2027-01-04", impact: 1.4, emoji: "🏁", tags: ["Sport"] },
  { name: "CAN (Coupe d'Afrique)", date: "2027-01-15", impact: 1.3, emoji: "⚽", tags: ["Sport"] },
];

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

export function UpcomingEvents() {
  // Filtre les événements à venir (positifs + jour J) + sort par date + garde 3 premiers
  const upcoming = EVENTS.filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Prochains événements</h2>
          <p className="text-xs text-gray-400">Sénégal · Impact sur vos prix</p>
        </div>
        <Link
          href="/dashboard/events"
          className="text-xs font-medium text-teal-400 hover:text-teal-300"
        >
          Voir tout →
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Aucun événement à venir</p>
        ) : (
          upcoming.map((e) => {
            const days = daysUntil(e.date);
            const isClose = days <= 30;
            return (
              <div
                key={e.name + e.date}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-lg ring-1 ring-gray-700">
                  {e.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{e.name}</p>
                    <span className="inline-flex shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold text-teal-300 ring-1 ring-teal-500/30">
                      ×{e.impact.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {formatDate(e.date)} ·{" "}
                    <span className={isClose ? "font-semibold text-amber-400" : "text-gray-500"}>
                      {days === 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `Dans ${days} jours`}
                    </span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}