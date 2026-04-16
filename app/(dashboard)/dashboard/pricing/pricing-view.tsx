"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  AMENITY_IDS,
  AMENITY_LABELS,
  type AmenityId,
  computeQualityStars,
  normalizeAmenities,
  starsToQualityMultiplier,
} from "@/lib/pricing/amenities";
import { BUILTIN_WEST_AFRICA_PRICING_EVENTS } from "@/lib/pricing/builtin-events-catalog";
import type { DailyPreviewDay, DayColorTier, PricingRulesRow, SeasonRule } from "@/lib/pricing/types";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function monthKeyNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(key: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { y: Number(m[1]), m0: Number(m[2]) - 1 };
}

function monthLabelFr(key: string) {
  const p = parseMonthKey(key);
  if (!p) return key;
  return new Date(p.y, p.m0, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function addMonthKey(key: string, delta: number) {
  const p = parseMonthKey(key);
  if (!p) return key;
  const d = new Date(p.y, p.m0 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type PropertyRow = {
  id: string;
  name: string;
  base_price: number;
  cleaning_fee: number;
  currency: string;
  city: string | null;
  amenities: unknown;
  neighborhood: string | null;
  competitor_avg_price: number | null;
  quality_score: number | null;
  rules: PricingRulesRow | null;
  stats?: { min: number; max: number; avg: number };
};

function money(n: number, cur: string) {
  return `${Math.round(n).toLocaleString("fr-FR")} ${cur}`;
}

function defaultRulesFromProperty(base: number): Partial<PricingRulesRow> {
  const b = Math.max(0, base);
  return {
    min_price: Math.round(b * 0.65 * 100) / 100,
    max_price: Math.round(b * 1.85 * 100) / 100,
    weekend_multiplier: 1.2,
    lastminute_days: 3,
    lastminute_discount: 0.85,
    high_occupancy_threshold: 80,
    high_occupancy_multiplier: 1.1,
    low_occupancy_threshold: 30,
    low_occupancy_multiplier: 0.9,
    seasons: [],
  };
}

function cellColorTier(t?: DayColorTier) {
  switch (t) {
    case "event_major":
      return "bg-red-900/55 text-red-50 ring-1 ring-red-500/35";
    case "event_medium":
      return "bg-orange-700/30 text-orange-50 ring-1 ring-orange-500/35";
    case "occupancy_high":
      return "bg-emerald-700/28 text-emerald-50 ring-1 ring-emerald-500/35";
    case "last_minute":
      return "bg-sky-800/45 text-sky-50 ring-1 ring-sky-500/35";
    case "low_price":
      return "bg-gray-700/45 text-gray-100 ring-1 ring-gray-600/40";
    default:
      return "bg-teal-900/35 text-teal-50 ring-1 ring-teal-500/25";
  }
}

function PricingPreviewCalendar({
  days,
  monthKey,
  currency,
}: {
  monthKey: string;
  days: DailyPreviewDay[];
  currency: string;
}) {
  const p = parseMonthKey(monthKey);
  if (!p) return null;
  const first = new Date(p.y, p.m0, 1);
  const dim = new Date(p.y, p.m0 + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7;
  const cells: (null | DailyPreviewDay)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (let d = 1; d <= dim; d++) {
    const iso = `${p.y}-${String(p.m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(
      byDate.get(iso) ?? { date: iso, price: 0, tier: "mid" as const },
    );
  }

  const tierBg = (cell: DailyPreviewDay) => {
    if (cell.color_tier) return cellColorTier(cell.color_tier);
    return cell.tier === "high"
      ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500/30"
      : cell.tier === "low"
        ? "bg-sky-600/20 text-sky-100 ring-1 ring-sky-500/35"
        : "bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/30";
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-red-700/80" /> Événement majeur
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-orange-600/80" /> Événement / week-end
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-emerald-600/80" /> Haute occupation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-sky-600/80" /> Last minute
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-gray-600/80" /> Prix bas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-teal-700/80" /> Normal
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          !cell ? (
            <div key={`e-${i}`} className="aspect-square rounded-md bg-transparent" />
          ) : (
            <div
              key={cell.date}
              title={cell.detail ? `${cell.detail}` : undefined}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md p-0.5 text-[10px] leading-tight",
                tierBg(cell),
              )}
            >
              <span className="font-semibold text-white/90">{Number(cell.date.slice(-2))}</span>
              <span className="mt-0.5 scale-90 font-medium opacity-90">
                {Math.round(cell.price).toLocaleString("fr-FR")} {currency}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function RulesModal({
  row,
  monthKey,
  onClose,
  onSaved,
}: {
  row: PropertyRow;
  monthKey: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const base = row.base_price;
  const existing = row.rules;
  const def = defaultRulesFromProperty(base);

  const [minPrice, setMinPrice] = useState(Number(existing?.min_price ?? def.min_price));
  const [maxPrice, setMaxPrice] = useState(Number(existing?.max_price ?? def.max_price));
  const [weekendM, setWeekendM] = useState(Number(existing?.weekend_multiplier ?? def.weekend_multiplier));
  const [lmDays, setLmDays] = useState(Number(existing?.lastminute_days ?? def.lastminute_days));
  const [lmDisc, setLmDisc] = useState(Number(existing?.lastminute_discount ?? def.lastminute_discount));
  const [hiTh, setHiTh] = useState(Number(existing?.high_occupancy_threshold ?? def.high_occupancy_threshold));
  const [hiM, setHiM] = useState(Number(existing?.high_occupancy_multiplier ?? def.high_occupancy_multiplier));
  const [loTh, setLoTh] = useState(Number(existing?.low_occupancy_threshold ?? def.low_occupancy_threshold));
  const [loM, setLoM] = useState(Number(existing?.low_occupancy_multiplier ?? def.low_occupancy_multiplier));
  const [seasons, setSeasons] = useState<SeasonRule[]>(
    (existing?.seasons?.length ? existing.seasons : def.seasons) ?? [],
  );
  const [ls7, setLs7] = useState(Number(existing?.long_stay_7_discount ?? 0.1));
  const [ls14, setLs14] = useState(Number(existing?.long_stay_14_discount ?? 0.15));
  const [ls30, setLs30] = useState(Number(existing?.long_stay_30_discount ?? 0.25));
  const [ebDays, setEbDays] = useState(Number(existing?.early_bird_days ?? 90));
  const [ebMult, setEbMult] = useState(Number(existing?.early_bird_multiplier ?? 1.1));
  const [useLocalEvents, setUseLocalEvents] = useState(Boolean(existing?.use_local_events));
  const amenInit = normalizeAmenities(row.amenities);
  const [amenPick, setAmenPick] = useState(() =>
    Object.fromEntries(AMENITY_IDS.map((id) => [id, amenInit.includes(id)])) as Record<
      AmenityId,
      boolean
    >,
  );
  const [neighborhood, setNeighborhood] = useState(row.neighborhood ?? "");
  const [competitorAvg, setCompetitorAvg] = useState(
    row.competitor_avg_price != null ? String(row.competitor_avg_price) : "",
  );
  const [propCity, setPropCity] = useState(row.city ?? "");
  const [previewMonth, setPreviewMonth] = useState(monthKey);
  const [previewDays, setPreviewDays] = useState<DailyPreviewDay[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/pricing/preview?propertyId=${encodeURIComponent(row.id)}&month=${encodeURIComponent(previewMonth)}`,
      );
      const json = (await res.json()) as { days?: DailyPreviewDay[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur aperçu");
      setPreviewDays(json.days ?? []);
    } catch (e) {
      setPreviewDays([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [row.id, previewMonth]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function saveRules() {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/pricing-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: row.id,
          min_price: minPrice,
          max_price: maxPrice,
          weekend_multiplier: weekendM,
          lastminute_days: lmDays,
          lastminute_discount: lmDisc,
          high_occupancy_threshold: hiTh,
          high_occupancy_multiplier: hiM,
          low_occupancy_threshold: loTh,
          low_occupancy_multiplier: loM,
          seasons,
          long_stay_7_discount: ls7,
          long_stay_14_discount: ls14,
          long_stay_30_discount: ls30,
          early_bird_days: ebDays,
          early_bird_multiplier: ebMult,
          use_local_events: useLocalEvents,
          amenities: AMENITY_IDS.filter((id) => amenPick[id]),
          neighborhood: neighborhood.trim() || null,
          competitor_avg_price: competitorAvg.trim() ? Number(competitorAvg) : null,
          city: propCity.trim() || null,
        }),
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

  function addSeason() {
    const y = new Date().getFullYear();
    setSeasons((s) => [
      ...s,
      { start: `${y}-07-01`, end: `${y}-08-31`, kind: "high" as const, multiplier: 1.5 },
    ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-white">Règles — {row.name}</h2>
            <p className="text-xs text-gray-400">
              Prix de base logement : {money(base, row.currency)} / nuit + ménage{" "}
              {money(row.cleaning_fee, row.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {banner ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {banner}
            </div>
          ) : null}

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Plancher & plafond</h3>
            <p className="mt-1 text-xs text-gray-500">
              Après application des multiplicateurs, le prix par nuit est limité entre min et max.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-gray-400">
                Prix minimum
                <input
                  type="number"
                  min={0}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400">
                Prix maximum
                <input
                  type="number"
                  min={0}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Saisonnalité (JSON visuel)</h3>
            <p className="mt-1 text-xs text-gray-500">
              Haute / basse saison sur plages de dates. Hors plage = période normale (×1).
            </p>
            <div className="mt-3 space-y-3">
              {seasons.map((s, idx) => (
                <div
                  key={`${s.start}-${s.end}-${idx}`}
                  className="grid gap-2 rounded-lg border border-gray-800 bg-gray-900/80 p-3 sm:grid-cols-12 sm:items-end"
                >
                  <label className="grid gap-1 text-xs text-gray-400 sm:col-span-3">
                    Début
                    <input
                      type="date"
                      className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                      value={s.start}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSeasons((prev) => prev.map((x, i) => (i === idx ? { ...x, start: v } : x)));
                      }}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-gray-400 sm:col-span-3">
                    Fin
                    <input
                      type="date"
                      className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                      value={s.end}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSeasons((prev) => prev.map((x, i) => (i === idx ? { ...x, end: v } : x)));
                      }}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-gray-400 sm:col-span-2">
                    Type
                    <select
                      className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                      value={s.kind}
                      onChange={(e) => {
                        const v = e.target.value === "low" ? "low" : "high";
                        setSeasons((prev) => prev.map((x, i) => (i === idx ? { ...x, kind: v } : x)));
                      }}
                    >
                      <option value="high">Haute</option>
                      <option value="low">Basse</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs text-gray-400 sm:col-span-2">
                    ×
                    <input
                      type="number"
                      step="0.05"
                      min={0.1}
                      className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                      value={s.multiplier}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setSeasons((prev) => prev.map((x, i) => (i === idx ? { ...x, multiplier: v } : x)));
                      }}
                    />
                  </label>
                  <div className="sm:col-span-2 sm:flex sm:justify-end">
                    <button
                      type="button"
                      className="mt-2 rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-200 hover:bg-red-500/10 sm:mt-0"
                      onClick={() => setSeasons((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addSeason}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-100 hover:bg-teal-500/20"
              >
                <PlusIcon className="h-4 w-4" /> Ajouter une période
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Week-end (ven. / sam. / dim.)</h3>
            <label className="mt-2 grid gap-1 text-xs text-gray-400">
              Multiplicateur week-end
              <input
                type="number"
                step="0.05"
                min={0.5}
                className="max-w-xs rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                value={weekendM}
                onChange={(e) => setWeekendM(Number(e.target.value))}
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">La semaine (lun–jeu) reste à ×1,0.</p>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Durée de séjour</h3>
            <p className="mt-1 text-xs text-gray-500">
              Réduction appliquée sur le sous-total des nuitées (après multiplicateurs par nuit).
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-xs text-gray-400">
                7 nuits+ (−%)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={0.95}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={ls7}
                  onChange={(e) => setLs7(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400">
                14 nuits+ (−%)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={0.95}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={ls14}
                  onChange={(e) => setLs14(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400">
                30 nuits+ (−%)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={0.95}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={ls30}
                  onChange={(e) => setLs30(Number(e.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Délai de réservation (early bird)</h3>
            <p className="mt-1 text-xs text-gray-500">
              Si l’arrivée est réservée suffisamment à l’avance, multiplicateur sur le sous-total nuitées (après long
              séjour).
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-gray-400">
                Jours minimum avant arrivée
                <input
                  type="number"
                  min={0}
                  max={365}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={ebDays}
                  onChange={(e) => setEbDays(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400">
                Multiplicateur (ex. ×1,1)
                <input
                  type="number"
                  step="0.05"
                  min={1}
                  max={2}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={ebMult}
                  onChange={(e) => setEbMult(Number(e.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Last minute</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-gray-400">
                Jours avant arrivée
                <input
                  type="number"
                  min={0}
                  max={30}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={lmDays}
                  onChange={(e) => setLmDays(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400">
                Multiplicateur (ex. 0,85 = −15 %)
                <input
                  type="number"
                  step="0.01"
                  min={0.1}
                  max={1}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={lmDisc}
                  onChange={(e) => setLmDisc(Number(e.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Occupation du mois (nuits réservées / jours du mois)</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="grid gap-1 text-xs text-gray-400">
                  Seuil haut (%)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                    value={hiTh}
                    onChange={(e) => setHiTh(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-1 text-xs text-gray-400">
                  Multiplicateur si ≥ seuil
                  <input
                    type="number"
                    step="0.05"
                    min={0.5}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                    value={hiM}
                    onChange={(e) => setHiM(Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <label className="grid gap-1 text-xs text-gray-400">
                  Seuil bas (%)
                  <input
                    type="number"
                    min={0}
                    max={99}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                    value={loTh}
                    onChange={(e) => setLoTh(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-1 text-xs text-gray-400">
                  Multiplicateur si ≤ seuil
                  <input
                    type="number"
                    step="0.05"
                    min={0.1}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                    value={loM}
                    onChange={(e) => setLoM(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <h3 className="text-sm font-semibold text-white">Qualité du logement</h3>
            <p className="mt-1 text-xs text-gray-500">
              Équipements et zone : influencent le multiplicateur « qualité » (étoiles 1–5) appliqué chaque nuit.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {AMENITY_IDS.map((id) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={amenPick[id]}
                    onChange={(e) =>
                      setAmenPick((prev) => ({ ...prev, [id]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-600 bg-gray-950 text-teal-500"
                  />
                  {AMENITY_LABELS[id]}
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-teal-500/20 bg-teal-950/20 px-3 py-2 text-xs text-teal-100/90">
              {(() => {
                const picked = AMENITY_IDS.filter((id) => amenPick[id]);
                const st = computeQualityStars(picked);
                const mult = starsToQualityMultiplier(st);
                const labels = ["×0,85", "×0,95", "×1,0", "×1,15", "×1,3"];
                return (
                  <>
                    Score qualité :{" "}
                    <span className="font-semibold text-white">
                      {st} étoile{st > 1 ? "s" : ""}
                    </span>{" "}
                    → multiplicateur <span className="font-semibold">{labels[st - 1]}</span> (
                    {String(mult).replace(".", ",")})
                  </>
                );
              })()}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-gray-400">
                Quartier / zone
                <input
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex. Almadies, Mermoz…"
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400">
                Prix concurrent moyen (XOF, indicatif)
                <input
                  type="number"
                  min={0}
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={competitorAvg}
                  onChange={(e) => setCompetitorAvg(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs text-gray-400 sm:col-span-2">
                Ville (calendrier / événements)
                <input
                  className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  value={propCity}
                  onChange={(e) => setPropCity(e.target.value)}
                  placeholder="Dakar"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Événements locaux (Afrique de l’Ouest)</h3>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={useLocalEvents}
                  onChange={(e) => setUseLocalEvents(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-950 text-teal-500"
                />
                Utiliser les événements locaux
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Intégrés pour le Sénégal (Tabaski, Korité, Magal, vacances scolaires, etc.) + vos événements personnels.
            </p>
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950/40 p-2 text-[11px] text-gray-400">
              {BUILTIN_WEST_AFRICA_PRICING_EVENTS.map((ev) => (
                <li key={ev.name} className="flex justify-between gap-2">
                  <span className="text-gray-200">{ev.name}</span>
                  <span className="shrink-0 text-teal-200/80">{ev.impact}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/events"
              className="mt-3 inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
            >
              Gérer les événements personnalisés →
            </Link>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Aperçu des prix</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800"
                  onClick={() => setPreviewMonth((m) => addMonthKey(m, -1))}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="min-w-[10rem] text-center text-xs font-medium text-gray-300">
                  {monthLabelFr(previewMonth)}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800"
                  onClick={() => setPreviewMonth((m) => addMonthKey(m, 1))}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {previewLoading ? (
              <p className="mt-4 text-sm text-gray-500">Chargement du calendrier…</p>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-[11px] text-gray-500">
                  L’aperçu reflète les règles et la fiche logement <strong className="text-gray-400">déjà enregistrées</strong>
                  . Survolez une case pour le détail du calcul.
                </p>
                <PricingPreviewCalendar
                  days={previewDays}
                  monthKey={previewMonth}
                  currency={row.currency}
                />
              </div>
            )}
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-800 pt-4">
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
              onClick={() => void saveRules()}
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer les règles"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PricingView() {
  const [monthKey, setMonthKey] = useState(monthKeyNow);
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalRow, setModalRow] = useState<PropertyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pricing-rules?withStats=1&month=${encodeURIComponent(monthKey)}`,
      );
      const json = (await res.json()) as { properties?: PropertyRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setRows(json.properties ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(propertyId: string, next: boolean) {
    try {
      const res = await fetch("/api/pricing-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, is_active: next }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  const monthPicker = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800"
          onClick={() => setMonthKey((m) => addMonthKey(m, -1))}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-gray-200">{monthLabelFr(monthKey)}</span>
        <button
          type="button"
          className="rounded-lg border border-gray-700 p-1.5 text-gray-300 hover:bg-gray-800"
          onClick={() => setMonthKey((m) => addMonthKey(m, 1))}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    ),
    [monthKey],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        title="Dynamic Pricing"
        description="Ajustez automatiquement vos tarifs selon la saison, le week-end, l’occupation et le last minute."
        actions={monthPicker}
      />

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-8 text-center text-sm text-gray-400">
          Aucun logement. Créez un logement pour configurer le pricing dynamique.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const st = r.stats ?? { min: r.base_price, max: r.base_price, avg: r.base_price };
            const active = Boolean(r.rules?.is_active);
            return (
              <li
                key={r.id}
                className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900/35 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{r.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>
                      Moy. mois :{" "}
                      <span className="font-medium text-teal-200/90">{money(st.avg, r.currency)}</span>
                    </span>
                    <span>
                      Min : <span className="text-gray-200">{money(st.min, r.currency)}</span>
                    </span>
                    <span>
                      Max : <span className="text-gray-200">{money(st.max, r.currency)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                    <span className="select-none">Actif</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      onClick={() => void toggleActive(r.id, !active)}
                      className={cn(
                        "relative h-7 w-12 rounded-full border transition-colors",
                        active
                          ? "border-teal-500/50 bg-teal-600/40"
                          : "border-gray-600 bg-gray-800",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                          active ? "translate-x-6" : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalRow(r)}
                    className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-100 hover:bg-teal-500/20"
                  >
                    Configurer les règles
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalRow ? (
        <RulesModal
          key={modalRow.id}
          row={modalRow}
          monthKey={monthKey}
          onClose={() => setModalRow(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
