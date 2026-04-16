import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { deleteProperty } from "./actions";
import { DeleteButton } from "./delete-button";

type PropertyRow = {
  id: string;
  name: string;
  city: string | null;
  base_price: number | null;
  currency: string | null;
};

function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null || amount === undefined) return "—";
  const c = currency ?? "XOF";
  return `${amount.toLocaleString("fr-FR")} ${c}`;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-10 text-center">
      <svg
        className="mx-auto h-16 w-16 text-gray-600"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M4.5 21h15a2 2 0 0 0 2-2V9.5a2 2 0 0 0-.586-1.414l-4.5-4.5A2 2 0 0 0 15 3H4.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 13h10M7 16h10M7 10h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <h2 className="mt-4 text-base font-semibold text-white">
        Aucun logement pour l’instant
      </h2>
      <p className="mt-1 text-sm text-gray-400">
        Créez votre premier logement pour commencer à gérer vos réservations.
      </p>
      <Link
        href="/dashboard/properties/new"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
      >
        <PlusIcon className="h-5 w-5" />
        Nouveau logement
      </Link>
    </div>
  );
}

export default async function DashboardPropertiesPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("properties")
    .select("id,name,city,base_price,currency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error.message}
      </div>
    );
  }

  const properties = (data ?? []) as PropertyRow[];

  return (
    <div>
      <PageHeader
        title="Logements"
        description="Gérez vos propriétés, prix et paramètres de base."
        actions={
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau logement
          </Link>
        }
      />

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {properties.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-white">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {p.city ? p.city : "Ville non renseignée"}
                  </p>
                </div>
                <div className="shrink-0 rounded-lg bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/20">
                  {formatMoney(p.base_price, p.currency)}
                  <span className="ml-1 text-xs font-medium text-cyan-200/80">
                    / nuit
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Link
                  href={`/dashboard/properties/${p.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                >
                  <PencilSquareIcon className="h-5 w-5 text-teal-300" />
                  Éditer
                </Link>
                <DeleteButton
                  action={async () => {
                    "use server";
                    await deleteProperty(p.id);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

