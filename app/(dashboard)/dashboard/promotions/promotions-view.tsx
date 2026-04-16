"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

type PromoRow = {
  id: string;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  min_nights: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

function fmtDiscount(r: PromoRow) {
  if (r.discount_type === "fixed") return `${Math.round(r.discount_value).toLocaleString("fr-FR")} XOF`;
  return `${r.discount_value} %`;
}

function fmtValidity(r: PromoRow) {
  const a = r.valid_from ? String(r.valid_from).slice(0, 10) : "—";
  const b = r.valid_until ? String(r.valid_until).slice(0, 10) : "—";
  return `${a} → ${b}`;
}

function PromoModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PromoRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const edit = Boolean(initial);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [discountType, setDiscountType] = useState(initial?.discount_type ?? "percent");
  const [discountValue, setDiscountValue] = useState(String(initial?.discount_value ?? 10));
  const [minNights, setMinNights] = useState(String(initial?.min_nights ?? 1));
  const [maxUses, setMaxUses] = useState(initial?.max_uses != null ? String(initial.max_uses) : "");
  const [validFrom, setValidFrom] = useState(initial?.valid_from ? String(initial.valid_from).slice(0, 10) : "");
  const [validUntil, setValidUntil] = useState(initial?.valid_until ? String(initial.valid_until).slice(0, 10) : "");
  const [active, setActive] = useState(initial?.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setErr(null);
    const body = {
      code: code.trim(),
      name: name.trim(),
      discountType,
      discountValue: Number(discountValue),
      minNights: Number(minNights),
      maxUses: maxUses.trim() === "" ? null : Number(maxUses),
      validFrom: validFrom.trim() || null,
      validUntil: validUntil.trim() || null,
      isActive: active,
    };
    try {
      const url = edit ? `/api/promotions/${initial!.id}` : "/api/promotions";
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
          <h2 className="text-lg font-semibold text-white">{edit ? "Modifier la promotion" : "Nouvelle promotion"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4 text-sm">
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Code promo
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DAKAR20"
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 font-mono text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Nom interne
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-gray-400">
              Réduction
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-2 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="percent">Pourcentage</option>
                <option value="fixed">Montant fixe XOF</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-400">
              Valeur
              <input
                type="number"
                min={0}
                step={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Nuits minimum
            <input
              type="number"
              min={1}
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Max utilisations (vide = illimité)
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-gray-400">
              Valide du
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-2 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-400">
              Au
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-2 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-gray-600" />
            Promotion active
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

export function PromotionsView() {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<PromoRow | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/promotions");
      const json = (await res.json()) as { promotions?: PromoRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setRows(json.promotions ?? []);
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
    if (!confirm("Supprimer cette promotion ?")) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
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
        title="Promotions"
        description="Codes promo appliqués sur le total devis (hébergement + frais + suppléments)."
        actions={
          <button
            type="button"
            onClick={() => setModal("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Nouvelle promotion
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
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Réduction</th>
                <th className="px-4 py-3 text-center">Utilisations</th>
                <th className="px-4 py-3">Validité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Aucune promotion.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono font-semibold text-teal-200">{r.code}</td>
                    <td className="px-4 py-3 text-white">{r.name}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtDiscount(r)}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-400">
                      {r.uses_count}
                      {r.max_uses != null ? ` / ${r.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtValidity(r)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          r.is_active ? "bg-emerald-500/15 text-emerald-200" : "bg-gray-600/30 text-gray-400",
                        )}
                      >
                        {r.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setModal(r)}
                          className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(r.id)}
                          className="rounded-lg border border-red-500/30 p-1.5 text-red-300 hover:bg-red-500/10"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <PromoModal
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
