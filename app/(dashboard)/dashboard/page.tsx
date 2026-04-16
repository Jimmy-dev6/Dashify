"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface DashStats {
  bookings: number;
  revenue: number;
  clients: number;
  pendingQuotes: number;
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    Promise.all([
      fetch(`/api/bookings?month=${month}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/quotes").then((r) => r.json()),
    ])
      .then(([b, c, q]) => {
        const bookings = b.bookings ?? [];
        setStats({
          bookings: bookings.length,
          revenue: bookings.reduce((s: number, x: { total?: number }) => s + (x.total ?? 0), 0),
          clients: (c.clients ?? []).length,
          pendingQuotes: (q.quotes ?? []).filter((x: { status: string }) => x.status === "draft" || x.status === "sent").length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-SN", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue en temps réel de votre activité de location courte durée."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Réservations (mois)"
          value={loading ? "…" : String(stats?.bookings ?? 0)}
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-cyan-400/10 p-2 text-cyan-400 ring-1 ring-cyan-400/20"
          hint="ce mois"
        />
        <StatCard
          title="CA (mois)"
          value={loading ? "…" : fmt(stats?.revenue ?? 0)}
          icon={<BanknotesIcon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-cyan-400/10 p-2 text-cyan-400 ring-1 ring-cyan-400/20"
          hint="après commissions"
        />
        <StatCard
          title="Clients"
          value={loading ? "…" : String(stats?.clients ?? 0)}
          icon={<UserGroupIcon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-teal-500/10 p-2 text-teal-400 ring-1 ring-teal-500/20"
          hint="total"
        />
        <StatCard
          title="Devis en attente"
          value={loading ? "…" : String(stats?.pendingQuotes ?? 0)}
          icon={<BuildingOffice2Icon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-teal-500/10 p-2 text-teal-400 ring-1 ring-teal-500/20"
          hint="brouillon ou envoyé"
        />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-white">Accès rapide</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { href: "/dashboard/properties", label: "Gérer les logements" },
              { href: "/dashboard/calendar", label: "Voir le calendrier" },
              { href: "/dashboard/quotes", label: "Créer un devis" },
              { href: "/dashboard/bookings", label: "Réservations du mois" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex items-center justify-between rounded-lg px-3 py-2 text-teal-400 hover:bg-teal-500/10">
                  {l.label}
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-6">
          <h2 className="text-sm font-semibold text-white">Activité récente</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {loading ? "Chargement…" : `${stats?.bookings ?? 0} réservation(s) ce mois · ${stats?.pendingQuotes ?? 0} devis en attente`}
          </p>
        </div>
      </div>
    </div>
  );
}