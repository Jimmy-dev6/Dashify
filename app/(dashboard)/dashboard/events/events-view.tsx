"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";
import { BUILTIN_WEST_AFRICA_PRICING_EVENTS } from "@/lib/pricing/builtin-events-catalog";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

type DbEvent = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  start_date: string;
  end_date: string;
  impact_multiplier: number;
  is_recurring: boolean;
  recurrence_type: string;
};

function recurrenceLabel(ev: DbEvent) {
  if (!ev.is_recurring) return "Non";
  if (ev.recurrence_type === "yearly") return "Oui (annuel)";
  if (/^islamic:\d{1,2}:\d{1,2}$/.test(ev.recurrence_type)) {
    const m = /^islamic:(\d{1,2}):(\d{1,2})$/.exec(ev.recurrence_type);
    return m ? `Islamique (Hijri ${m[1]}/${m[2]})` : "Islamique";
  }
  return ev.recurrence_type || "Oui";
}

export function EventsView() {
  const [rows, setRows] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DbEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/local-events");
      const json = (await res.json()) as { events?: DbEvent[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setRows(json.events ?? []);
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

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(ev: DbEvent) {
    setEditing(ev);
    setModalOpen(true);
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
      const res = await fetch(`/api/local-events/${encodeURIComponent(id)}`, { method: "DELETE" });
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
        title="Événements locaux"
        description="Événements intégrés Afrique de l’Ouest + vos surcharges. Utilisés par le Dynamic Pricing lorsque l’option est activée sur chaque logement."
        actions={
          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400"
          >
            <PlusIcon className="h-4 w-4" />
            Ajouter un événement
          </button>
        }
      />

      <p className="text-sm text-gray-400">
        Règles de tarification :{" "}
        <Link href="/dashboard/pricing" className="font-medium text-teal-400 hover:text-teal-300">
          Dynamic Pricing
        </Link>
      </p>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-950/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Pays</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Impact</th>
              <th className="px-4 py-3">Récurrent</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80">
            {BUILTIN_WEST_AFRICA_PRICING_EVENTS.map((b) => (
              <tr key={b.name} className="bg-gray-950/20 text-gray-400">
                <td className="px-4 py-3 font-medium text-gray-200">{b.name}</td>
                <td className="px-4 py-3">SN</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3 text-xs">{b.notes}</td>
                <td className="px-4 py-3 text-teal-200/90">{b.impact}</td>
                <td className="px-4 py-3 text-xs">Intégré</td>
                <td className="px-4 py-3 text-right text-xs text-gray-600">—</td>
              </tr>
            ))}
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Aucun événement personnalisé. Les lignes du haut sont appliquées automatiquement pour le Sénégal
                  lorsque le logement est en SN et que l’option événements est activée.
                </td>
              </tr>
            ) : (
              rows.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-900/60">
                  <td className="px-4 py-3 font-medium text-white">{ev.name}</td>
                  <td className="px-4 py-3 text-gray-300">{ev.country}</td>
                  <td className="px-4 py-3 text-gray-400">{ev.city ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {ev.start_date} → {ev.end_date}
                  </td>
                  <td className="px-4 py-3 font-medium text-teal-200/90">
                    ×{String(ev.impact_multiplier).replace(".", ",")}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{recurrenceLabel(ev)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      className="mr-2 rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(ev.id)}
                      className="inline-flex items-center rounded-lg border border-red-500/30 p-1.5 text-red-300 hover:bg-red-500/10"
                      aria-label="Supprimer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <EventModal
          key={editing?.id ?? "new"}
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => void load()}
        />
      ) : null}
    </div>
  );
}

function EventModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: DbEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [country, setCountry] = useState(initial?.country ?? "SN");
  const [city, setCity] = useState(initial?.city ?? "");
  const [start, setStart] = useState(initial?.start_date ?? "");
  const [end, setEnd] = useState(initial?.end_date ?? "");
  const [mult, setMult] = useState(initial?.impact_multiplier ?? 1.2);
  const [recurring, setRecurring] = useState(initial?.is_recurring ?? false);
  const [recMode, setRecMode] = useState<"yearly" | "islamic">(() => {
    if (!initial?.is_recurring) return "yearly";
    if (/^islamic:/.test(initial.recurrence_type)) return "islamic";
    return "yearly";
  });
  const [hMonth, setHMonth] = useState(() => {
    const m = initial && /^islamic:(\d{1,2}):(\d{1,2})$/.exec(initial.recurrence_type);
    return m ? Number(m[1]) : 12;
  });
  const [hDay, setHDay] = useState(() => {
    const m = initial && /^islamic:(\d{1,2}):(\d{1,2})$/.exec(initial.recurrence_type);
    return m ? Number(m[2]) : 10;
  });
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setBanner(null);
    const recurrence_type = !recurring
      ? "none"
      : recMode === "yearly"
        ? "yearly"
        : `islamic:${hMonth}:${hDay}`;
    try {
      const payload = {
        name,
        country,
        city: city.trim() || null,
        start_date: start,
        end_date: end,
        impact_multiplier: mult,
        is_recurring: recurring,
        recurrence_type,
      };
      const url = initial ? `/api/local-events/${encodeURIComponent(initial.id)}` : "/api/local-events";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      onSaved();
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
        className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            {initial ? "Modifier l’événement" : "Nouvel événement"}
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
          <label className="grid gap-1 text-xs text-gray-400">
            Nom de l’événement
            <input
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-gray-400">
              Pays
              <input
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
              />
            </label>
            <label className="grid gap-1 text-xs text-gray-400">
              Ville (optionnel)
              <input
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. Dakar"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs text-gray-400">
              Date début
              <input
                type="date"
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs text-gray-400">
              Date fin
              <input
                type="date"
                className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs text-gray-400">
            Multiplicateur de prix (×1,0 à ×2,0)
            <input
              type="number"
              step="0.05"
              min={1}
              max={2}
              className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              value={mult}
              onChange={(e) => setMult(Number(e.target.value))}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-950 text-teal-500"
            />
            Récurrent
          </label>
          {recurring ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3 space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="rec"
                    checked={recMode === "yearly"}
                    onChange={() => setRecMode("yearly")}
                    className="text-teal-500"
                  />
                  Chaque année (même mois/jour civil)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="rec"
                    checked={recMode === "islamic"}
                    onChange={() => setRecMode("islamic")}
                    className="text-teal-500"
                  />
                  Calendrier islamique (Umm al-Qura)
                </label>
              </div>
              {recMode === "islamic" ? (
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                  <label className="grid gap-1">
                    Mois hijri (1–12)
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white"
                      value={hMonth}
                      onChange={(e) => setHMonth(Number(e.target.value))}
                    />
                  </label>
                  <label className="grid gap-1">
                    Jour hijri
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white"
                      value={hDay}
                      onChange={(e) => setHDay(Number(e.target.value))}
                    />
                  </label>
                  <p className="col-span-2 text-[11px] text-gray-500">
                    Ex. Tabaski ≈ 12 / 10, Korité ≈ 10 / 1, Magal ≈ 2 / 18. La durée sur le calendrier grégorien
                    dépend de vos dates début/fin ci-dessus.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
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
              disabled={saving}
              onClick={() => void save()}
              className={cn(
                "rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400",
                saving && "opacity-50",
              )}
            >
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
