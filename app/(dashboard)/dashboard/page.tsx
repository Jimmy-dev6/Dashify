import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

export default function DashboardHomePage() {
  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de votre activité de location courte durée. Les chiffres ci-dessous sont des exemples jusqu’au branchement des données."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Logements actifs"
          value="12"
          icon={<BuildingOffice2Icon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-teal-500/10 p-2 text-teal-400 ring-1 ring-teal-500/20"
          trend={{ label: "+2 ce trimestre", positive: true }}
        />
        <StatCard
          title="Réservations (mois)"
          value="28"
          icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-cyan-400/10 p-2 text-cyan-400 ring-1 ring-cyan-400/20"
          hint="dont 6 en attente de paiement"
        />
        <StatCard
          title="Taux d’occupation"
          value="74 %"
          icon={<CalendarDaysIcon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-teal-500/10 p-2 text-teal-400 ring-1 ring-teal-500/20"
          trend={{ label: "+4 pts vs. mois dernier", positive: true }}
        />
        <StatCard
          title="CA estimé (mois)"
          value="4,2 M FCFA"
          icon={<BanknotesIcon className="h-6 w-6" />}
          iconClassName="rounded-lg bg-cyan-400/10 p-2 text-cyan-400 ring-1 ring-cyan-400/20"
          hint="après commissions plateformes"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-white">Accès rapide</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/properties"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-teal-400 hover:bg-teal-500/10"
              >
                Gérer les logements
                <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/calendar"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-teal-400 hover:bg-teal-500/10"
              >
                Voir le calendrier
                <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/quotes?new=1"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-teal-400 hover:bg-teal-500/10"
              >
                Créer un devis
                <span aria-hidden>→</span>
              </Link>
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-6">
          <h2 className="text-sm font-semibold text-white">Prochaines étapes</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            Connectez Supabase pour afficher vos vraies réservations, clients et
            devis. Les indicateurs ci-dessus pourront être alimentés en temps
            réel.
          </p>
        </div>
      </div>
    </div>
  );
}
