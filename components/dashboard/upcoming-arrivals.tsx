"use client";

import Link from "next/link";

type Arrival = {
  id: string;
  check_in: string;
  check_out: string;
  total: number;
  customer: { id: string; name: string } | null;
  property: { id: string; name: string } | null;
};

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
    month: "short",
  });
}

function nights(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split("-").map(Number);
  const [y2, m2, d2] = checkOut.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function countdownLabel(days: number): { text: string; color: string } {
  if (days === 0) return { text: "Aujourd'hui", color: "bg-teal-500/20 text-teal-300 ring-teal-500/30" };
  if (days === 1) return { text: "Demain", color: "bg-amber-500/20 text-amber-300 ring-amber-500/30" };
  if (days <= 7) return { text: `Dans ${days}j`, color: "bg-blue-500/20 text-blue-300 ring-blue-500/30" };
  return { text: `Dans ${days}j`, color: "bg-gray-700/50 text-gray-300 ring-gray-600/40" };
}

export function UpcomingArrivals({ arrivals, loading }: { arrivals: Arrival[]; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Prochaines arrivées</h2>
          <p className="text-xs text-gray-400">3 prochains check-ins</p>
        </div>
        <Link
          href="/dashboard/bookings"
          className="text-xs font-medium text-teal-400 hover:text-teal-300"
        >
          Voir tout →
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Chargement…</p>
        ) : arrivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path
                d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-sm text-gray-400">Aucune arrivée prévue</p>
            <p className="text-xs text-gray-500">Vos prochaines réservations apparaîtront ici</p>
          </div>
        ) : (
          arrivals.map((a) => {
            const days = daysUntil(a.check_in);
            const { text, color } = countdownLabel(days);
            const n = nights(a.check_in, a.check_out);
            const customerName = a.customer?.name ?? "Client";
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-300 ring-1 ring-teal-400/30">
                  {initials(customerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">{customerName}</p>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${color}`}
                    >
                      {text}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {a.property?.name ?? "Logement"} · {formatDate(a.check_in)} → {formatDate(a.check_out)} · {n}n
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