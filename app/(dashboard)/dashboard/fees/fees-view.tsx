"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

type PropertyOpt = { id: string; name: string };

type FeeRow = {
  id: string;
  property_id: string | null;
  name: string;
  type: string;
  amount_type: string;
  amount: number;
  is_mandatory: boolean;
  property?: { id: string; name: string } | { id: string; name: string }[] | null;
};

const FEE_TYPE_LABEL: Record<string, string> = {
  cleaning: "Frais de ménage",
  tourist_tax: "Taxe de séjour",
  other: "Autre",
};

const AMOUNT_TYPE_LABEL: Record<string, string> = {
  fixed: "Fixe (XOF)",
  percent: "% du total hébergement",
  per_night: "Par nuit",
  per_guest: "Par personne",
};

function normProp(p: FeeRow["property"]): { id: string; name: string } | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

function FeeModal({
  properties,
  initial,
  onClose,
  onSaved,
}: {
  properties: PropertyOpt[];
  initial: FeeRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const edit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [propertyId, setPropertyId] = useState<string>(initial?.property_id ?? "");
  const [type, setType] = useState(initial?.type ?? "other");
  const [amountType, setAmountType] = useState(initial?.amount_type ?? "fixed");
  const [amount, setAmount] = useState(String(initial?.amount ?? 0));
  const [mandatory, setMandatory] = useState(initial?.is_mandatory !== false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    const body = {
      name: name.trim(),
      propertyId: propertyId.trim() === "" ? null : propertyId,
      type,
      amountType,
      amount: Number(amount),
      isMandatory: mandatory,
    };
    try {
      const url = edit ? `/api/fees/${initial!.id}` : "/api/fees";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || (!edit && !json.ok)) throw new Error(json.error ?? "Erreur");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">{edit ? "Modifier le frais" : "Nouveau frais"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4 text-sm">
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Nom du frais
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Logement
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Tous les logements</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="cleaning">Frais de ménage</option>
              <option value="tourist_tax">Taxe de séjour</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-gray-400">
              Type de montant
              <select
                value={amountType}
                onChange={(e) => setAmountType(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-2 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="fixed">Fixe XOF</option>
                <option value="percent">% du total</option>
                <option value="per_night">Par nuit</option>
                <option value="per_guest">Par personne</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-400">
              Montant
              <input
                type="number"
                min={0}
                step={amountType === "percent" ? 1 : 1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
            <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="rounded border-gray-600" />
            Obligatoire (sinon optionnel)
          </label>
          {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</div>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeesView({ properties }: { properties: PropertyOpt[] }) {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<FeeRow | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fees");
      const json = (await res.json()) as { fees?: FeeRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setRows(json.fees ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Supprimer ce frais ?")) return;
    try {
      const res = await fetch(`/api/fees/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erreur");
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Frais"
        description="Frais appliqués automatiquement au calcul des devis (taxe de séjour, ménage additionnel, etc.)."
        actions={
          <button
            type="button"
            onClick={() => setModal("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau frais
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40 ring-1 ring-gray-800/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
            <thead className="bg-gray-950/50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Logement</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Obligatoire</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucun frais. Créez-en un pour l’intégration devis.
                  </td>
                </tr>
              ) : (
                rows.map((f) => {
                  const prop = normProp(f.property);
                  return (
                    <tr key={f.id} className="hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-white">{f.name}</td>
                      <td className="px-4 py-3 text-gray-400">{prop?.name ?? "Tous"}</td>
                      <td className="px-4 py-3">{FEE_TYPE_LABEL[f.type] ?? f.type}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {f.amount} {AMOUNT_TYPE_LABEL[f.amount_type] ?? f.amount_type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                            f.is_mandatory ? "bg-teal-500/15 text-teal-200" : "bg-gray-600/30 text-gray-300",
                          )}
                        >
                          {f.is_mandatory ? "Oui" : "Non"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setModal(f)}
                            className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800"
                            title="Éditer"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(f.id)}
                            className="rounded-lg border border-red-500/30 p-1.5 text-red-300 hover:bg-red-500/10"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <FeeModal
          properties={properties}
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
