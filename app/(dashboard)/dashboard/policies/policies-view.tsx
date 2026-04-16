"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PencilSquareIcon,
  PlusIcon,
  StarIcon as StarOutlineIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatPolicyTableSummary, policyFromRow } from "@/lib/policies/format-wa";
import type { CancellationType, DepositType, PaymentLeg, PolicyRow } from "@/lib/policies/types";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

type PolicyApiRow = Record<string, unknown>;

function rowToPolicy(row: PolicyApiRow): PolicyRow {
  return policyFromRow(row);
}

function PolicyModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PolicyRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [paymentMode, setPaymentMode] = useState<"single" | "split">(() => {
    const legs = initial?.payment_schedule;
    if (Array.isArray(legs) && legs.length > 1) return "split";
    return "single";
  });
  const [pctBooking, setPctBooking] = useState(() => {
    const legs = initial?.payment_schedule;
    if (!Array.isArray(legs) || legs.length === 0) return 100;
    const atBook = legs.find((l: PaymentLeg) => l.at_booking);
    return Math.round(Number((atBook as PaymentLeg | undefined)?.percent ?? 100));
  });
  const [daysSecond, setDaysSecond] = useState(() => {
    const legs = initial?.payment_schedule;
    if (!Array.isArray(legs) || legs.length < 2) return 7;
    const notBook = legs.find((l: PaymentLeg) => !l.at_booking) as PaymentLeg | undefined;
    return Math.round(Number(notBook?.days_before_checkin ?? 7));
  });
  const [cancelType, setCancelType] = useState<CancellationType>(
    initial?.cancellation_type ?? "non_refundable",
  );
  const [cancelDays, setCancelDays] = useState(initial?.cancellation_days ?? 7);
  const [cancelPct, setCancelPct] = useState(initial?.cancellation_percent ?? 50);
  const [depositType, setDepositType] = useState<DepositType>(initial?.deposit_type ?? "none");
  const [depositValue, setDepositValue] = useState(Number(initial?.deposit_value ?? 0));
  const [expiryPreset, setExpiryPreset] = useState<"24" | "48" | "72" | "custom">(() => {
    const h = initial?.quote_expiry_hours ?? 48;
    if (h === 24) return "24";
    if (h === 48) return "48";
    if (h === 72) return "72";
    return "custom";
  });
  const [expiryCustom, setExpiryCustom] = useState(
    initial?.quote_expiry_hours && ![24, 48, 72].includes(initial.quote_expiry_hours)
      ? initial.quote_expiry_hours
      : 48,
  );
  const [setDefault, setSetDefault] = useState(Boolean(initial?.is_default));
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  function buildSchedule(): PaymentLeg[] {
    if (paymentMode === "single") {
      return [{ percent: 100, at_booking: true }];
    }
    const a = Math.min(100, Math.max(1, Math.round(pctBooking)));
    const b = 100 - a;
    return [
      { percent: a, at_booking: true },
      { percent: b, at_booking: false, days_before_checkin: Math.max(1, Math.round(daysSecond)) },
    ];
  }

  function quoteExpiryHours(): number {
    if (expiryPreset === "custom") return Math.min(168, Math.max(1, Math.round(expiryCustom)));
    return Number(expiryPreset);
  }

  async function submit() {
    setSaving(true);
    setBanner(null);
    const schedule = buildSchedule();
    const body: Record<string, unknown> = {
      name: name.trim(),
      is_default: setDefault,
      payment_schedule: schedule,
      cancellation_type: cancelType,
      cancellation_days: cancelType === "non_refundable" ? 0 : Math.max(0, Math.round(cancelDays)),
      cancellation_percent:
        cancelType === "moderate"
          ? Math.min(100, Math.max(0, Math.round(cancelPct)))
          : cancelType === "flexible"
            ? 100
            : 0,
      deposit_type: depositType,
      deposit_value: depositType === "none" ? 0 : Number(depositValue),
      quote_expiry_hours: quoteExpiryHours(),
    };

    try {
      const url = isEdit ? `/api/policies/${initial!.id}` : "/api/policies";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      await onSaved();
      onClose();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Modifier la politique" : "Créer une politique"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {banner ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {banner}
            </div>
          ) : null}

          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Nom interne
            <input
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flexible, Stricte…"
            />
          </label>

          <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="text-xs font-semibold text-white">Planification du paiement</div>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMode === "single"}
                  onChange={() => setPaymentMode("single")}
                />
                1 paiement : 100% à la réservation
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMode === "split"}
                  onChange={() => setPaymentMode("split")}
                />
                2 paiements
              </label>
            </div>
            {paymentMode === "split" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs text-gray-500">
                  % à la réservation
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                    value={pctBooking}
                    onChange={(e) => setPctBooking(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-1 text-xs text-gray-500">
                  Jours avant arrivée (2ᵉ paiement)
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                    value={daysSecond}
                    onChange={(e) => setDaysSecond(Number(e.target.value))}
                  />
                </label>
                <p className="sm:col-span-2 text-[11px] text-gray-500">
                  Solde avant arrivée : <span className="font-medium text-teal-200/90">{100 - Math.min(99, Math.max(1, pctBooking))}%</span>
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="text-xs font-semibold text-white">Annulation</div>
            <select
              className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={cancelType}
              onChange={(e) => setCancelType(e.target.value as CancellationType)}
            >
              <option value="non_refundable">Non remboursable</option>
              <option value="flexible">Flexible (100% remboursable)</option>
              <option value="moderate">Modérée (50% remboursable par défaut)</option>
            </select>
            {cancelType !== "non_refundable" ? (
              <label className="mt-3 grid gap-1 text-xs text-gray-500">
                Délai minimum avant l’arrivée (jours)
                <input
                  type="number"
                  min={0}
                  max={365}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={cancelDays}
                  onChange={(e) => setCancelDays(Number(e.target.value))}
                />
              </label>
            ) : null}
            {cancelType === "moderate" ? (
              <label className="mt-2 grid gap-1 text-xs text-gray-500">
                % remboursable si dans le délai
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={cancelPct}
                  onChange={(e) => setCancelPct(Number(e.target.value))}
                />
              </label>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="text-xs font-semibold text-white">Caution</div>
            <select
              className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={depositType}
              onChange={(e) => setDepositType(e.target.value as DepositType)}
            >
              <option value="none">Aucune caution</option>
              <option value="fixed">Montant fixe (XOF)</option>
              <option value="percent">% du montant total</option>
            </select>
            {depositType !== "none" ? (
              <label className="mt-3 grid gap-1 text-xs text-gray-500">
                {depositType === "fixed" ? "Montant (XOF)" : "Pourcentage"}
                <input
                  type="number"
                  min={0}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={depositValue}
                  onChange={(e) => setDepositValue(Number(e.target.value))}
                />
              </label>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="text-xs font-semibold text-white">Expiration du devis</div>
            <select
              className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={expiryPreset}
              onChange={(e) => setExpiryPreset(e.target.value as typeof expiryPreset)}
            >
              <option value="24">24 h</option>
              <option value="48">48 h</option>
              <option value="72">72 h</option>
              <option value="custom">Personnalisé</option>
            </select>
            {expiryPreset === "custom" ? (
              <label className="mt-3 grid gap-1 text-xs text-gray-500">
                Heures (1–168)
                <input
                  type="number"
                  min={1}
                  max={168}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={expiryCustom}
                  onChange={(e) => setExpiryCustom(Number(e.target.value))}
                />
              </label>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={setDefault}
              onChange={(e) => setSetDefault(e.target.checked)}
            />
            Définir comme politique par défaut
          </label>

          <div className="flex justify-end gap-2 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void submit()}
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PoliciesView() {
  const [rows, setRows] = useState<PolicyApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<PolicyRow | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/policies");
      const json = (await res.json()) as { policies?: PolicyApiRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setRows(json.policies ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setDefaultStar(id: string) {
    try {
      const res = await fetch(`/api/policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette politique ?")) return;
    try {
      const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        title="Politiques de réservation"
        description="Paiement, annulation, caution et durée de validité des devis — réutilisables sur vos offres."
        actions={
          <button
            type="button"
            onClick={() => setModal("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Créer une politique
          </button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/35">
          <table className="min-w-full divide-y divide-gray-800 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Défaut</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3">Annulation</th>
                <th className="px-4 py-3">Caution</th>
                <th className="px-4 py-3">Expiration devis</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Aucune politique. Créez-en une pour l’associer aux devis.
                  </td>
                </tr>
              ) : (
                rows.map((raw) => {
                  const p = rowToPolicy(raw);
                  const s = formatPolicyTableSummary(p);
                  const def = Boolean(raw.is_default);
                  return (
                    <tr key={p.id} className="text-gray-200">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          title={def ? "Politique par défaut" : "Définir par défaut"}
                          disabled={def}
                          onClick={() => void setDefaultStar(p.id)}
                          className={cn(
                            "rounded-lg p-1.5",
                            def
                              ? "cursor-default text-amber-400"
                              : "text-gray-500 hover:bg-gray-800 hover:text-amber-300/90",
                          )}
                        >
                          {def ? (
                            <StarSolidIcon className="h-5 w-5" />
                          ) : (
                            <StarOutlineIcon className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                      <td className="max-w-[200px] px-4 py-3 text-xs text-gray-400">{s.payment}</td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-gray-400">{s.cancellation}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{s.deposit}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{s.quoteExpiry}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setModal(p)}
                            className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
                            title="Éditer"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(p.id)}
                            className="rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10"
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
      )}

      {modal === "new" ? (
        <PolicyModal initial={null} onClose={() => setModal(null)} onSaved={load} />
      ) : modal ? (
        <PolicyModal initial={modal} onClose={() => setModal(null)} onSaved={load} />
      ) : null}
    </div>
  );
}
