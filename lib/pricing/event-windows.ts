import { toGregorian } from "hijri-converter";

export type PriceEventWindow = {
  start_date: string;
  end_date: string;
  impact_multiplier: number;
  name: string;
  country: string | null;
  city: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(gy: number, gm: number, gd: number) {
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  return toIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function isoBetween(iso: string, start: string, end: string) {
  return iso >= start && iso <= end;
}

/** 10 Dhu al-Hijjah (Aïd el-Kébir / Tabaski) — fenêtre ~4 jours. */
export function tabaskiWindowGregorian(civilYear: number): PriceEventWindow | null {
  for (let hy = civilYear - 630; hy <= civilYear - 570; hy++) {
    try {
      const g = toGregorian(hy, 12, 10);
      if (g.gy === civilYear) {
        const start = toIso(g.gy, g.gm, g.gd);
        return {
          start_date: start,
          end_date: addDaysIso(start, 3),
          impact_multiplier: 1.5,
          name: "Tabaski (Aïd el-Kébir)",
          country: "SN",
          city: null,
        };
      }
    } catch {
      /* hy hors plage Umm al-Qura */
    }
  }
  return null;
}

/** 1 Shawwal (Korité / Aïd el-Fitr) — fenêtre ~3 jours. */
export function koriteWindowGregorian(civilYear: number): PriceEventWindow | null {
  for (let hy = civilYear - 630; hy <= civilYear - 570; hy++) {
    try {
      const g = toGregorian(hy, 10, 1);
      if (g.gy === civilYear) {
        const start = toIso(g.gy, g.gm, g.gd);
        return {
          start_date: start,
          end_date: addDaysIso(start, 2),
          impact_multiplier: 1.4,
          name: "Korité (Aïd el-Fitr)",
          country: "SN",
          city: null,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 18 Safar — Magal de Touba (surcoût surtout région Touba / zone Dakar-Thiès). */
export function magalToubaWindowGregorian(civilYear: number): PriceEventWindow | null {
  for (let hy = civilYear - 630; hy <= civilYear - 570; hy++) {
    try {
      const g = toGregorian(hy, 2, 18);
      if (g.gy === civilYear) {
        const start = toIso(g.gy, g.gm, g.gd);
        return {
          start_date: start,
          end_date: addDaysIso(start, 1),
          impact_multiplier: 1.6,
          name: "Magal de Touba",
          country: "SN",
          city: null,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 12 Rabi' al-thani — Gamou de Tivaouane. */
export function gamouTivaouaneWindowGregorian(civilYear: number): PriceEventWindow | null {
  for (let hy = civilYear - 630; hy <= civilYear - 570; hy++) {
    try {
      const g = toGregorian(hy, 4, 12);
      if (g.gy === civilYear) {
        const start = toIso(g.gy, g.gm, g.gd);
        return {
          start_date: start,
          end_date: addDaysIso(start, 1),
          impact_multiplier: 1.4,
          name: "Gamou de Tivaouane",
          country: "SN",
          city: null,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function fixedWindow(
  civilYear: number,
  sm: number,
  sd: number,
  em: number,
  ed: number,
  mult: number,
  name: string,
): PriceEventWindow {
  const start = `${civilYear}-${pad2(sm)}-${pad2(sd)}`;
  const end = `${civilYear}-${pad2(em)}-${pad2(ed)}`;
  return {
    start_date: start,
    end_date: end,
    impact_multiplier: mult,
    name,
    country: "SN",
    city: null,
  };
}

/** Événements solaires récurrents + islamiques (SN). */
export function builtinWestAfricaWindows(
  civilYear: number,
  propertyCity: string | null,
  propertyCountry: string | null,
): PriceEventWindow[] {
  const cc = (propertyCountry ?? "SN").toUpperCase();
  if (cc !== "SN" && cc !== "") return [];

  const out: PriceEventWindow[] = [];
  const t = tabaskiWindowGregorian(civilYear);
  if (t) out.push(t);
  const k = koriteWindowGregorian(civilYear);
  if (k) out.push(k);
  const m = magalToubaWindowGregorian(civilYear);
  if (m) {
    const city = (propertyCity ?? "").toLowerCase();
    if (
      city.includes("touba") ||
      city.includes("dakar") ||
      city.includes("thiès") ||
      city.includes("thies") ||
      city.includes("tivaouane")
    ) {
      out.push(m);
    }
  }

  const gtv = gamouTivaouaneWindowGregorian(civilYear);
  if (gtv) {
    const city = (propertyCity ?? "").toLowerCase();
    if (
      city.includes("tivaouane") ||
      city.includes("dakar") ||
      city.includes("thiès") ||
      city.includes("thies") ||
      city.includes("touba")
    ) {
      out.push(gtv);
    }
  }

  out.push(fixedWindow(civilYear, 1, 1, 1, 18, 1.4, "Dakar Rally"));
  out.push(fixedWindow(civilYear, 1, 10, 2, 8, 1.3, "CAN (Coupe d'Afrique)"));

  out.push(fixedWindow(civilYear, 1, 1, 1, 2, 1.5, "Nouvel An"));
  out.push(fixedWindow(civilYear, 4, 4, 4, 4, 1.2, "Fête nationale (4 avril)"));
  out.push({
    start_date: `${civilYear}-12-20`,
    end_date: `${civilYear + 1}-01-06`,
    impact_multiplier: 1.2,
    name: "Vacances scolaires (fin année)",
    country: "SN",
    city: null,
  });
  out.push(fixedWindow(civilYear, 7, 15, 9, 15, 1.2, "Vacances scolaires (été)"));

  return out;
}

export type DbLocalEvent = {
  start_date: string;
  end_date: string;
  impact_multiplier: number;
  name: string;
  country: string | null;
  city: string | null;
  is_recurring?: boolean;
  recurrence_type?: string | null;
};

function hijriRecurringWindowForCivilYear(
  civilYear: number,
  hijriMonth: number,
  hijriDay: number,
  extraEndDays: number,
  mult: number,
  name: string,
  country: string | null,
  city: string | null,
): PriceEventWindow | null {
  for (let hy = civilYear - 630; hy <= civilYear - 570; hy++) {
    try {
      const g = toGregorian(hy, hijriMonth, hijriDay);
      if (g.gy === civilYear) {
        const start = toIso(g.gy, g.gm, g.gd);
        return {
          start_date: start,
          end_date: addDaysIso(start, extraEndDays),
          impact_multiplier: mult,
          name,
          country,
          city,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Étend les événements utilisateur (récurrents année civile) sur une année donnée. */
export function expandUserEventForYear(
  ev: DbLocalEvent,
  civilYear: number,
): PriceEventWindow | null {
  const rt = (ev.recurrence_type ?? "none").toLowerCase();
  const islamicMd = /^islamic:(\d{1,2}):(\d{1,2})$/.exec(rt);
  if (ev.is_recurring && islamicMd) {
    const hm = Number(islamicMd[1]);
    const hd = Number(islamicMd[2]);
    const [sy, sm, sd] = String(ev.start_date).slice(0, 10).split("-").map(Number);
    const [ey, em, ed] = String(ev.end_date).slice(0, 10).split("-").map(Number);
    const dur = Math.max(
      0,
      Math.round(
        (new Date(ey!, em! - 1, ed!).getTime() - new Date(sy!, sm! - 1, sd!).getTime()) / 86400000,
      ),
    );
    const w = hijriRecurringWindowForCivilYear(
      civilYear,
      hm,
      hd,
      dur,
      ev.impact_multiplier,
      ev.name,
      ev.country,
      ev.city,
    );
    if (w) return w;
    return null;
  }
  if (ev.is_recurring && rt === "yearly") {
    const [sy, sm, sd] = String(ev.start_date).slice(0, 10).split("-").map(Number);
    const [ey, em, ed] = String(ev.end_date).slice(0, 10).split("-").map(Number);
    const dur = Math.max(
      0,
      Math.round(
        (new Date(ey!, em! - 1, ed!).getTime() - new Date(sy!, sm! - 1, sd!).getTime()) / (86400000),
      ),
    );
    const ns = `${civilYear}-${pad2(sm!)}-${pad2(sd!)}`;
    const ne = addDaysIso(ns, dur);
    return {
      start_date: ns,
      end_date: ne,
      impact_multiplier: ev.impact_multiplier,
      name: ev.name,
      country: ev.country,
      city: ev.city,
    };
  }
  return {
    start_date: String(ev.start_date).slice(0, 10),
    end_date: String(ev.end_date).slice(0, 10),
    impact_multiplier: ev.impact_multiplier,
    name: ev.name,
    country: ev.country,
    city: ev.city,
  };
}

export function eventMatchesProperty(ev: PriceEventWindow, propertyCountry: string | null, propertyCity: string | null) {
  if (ev.country && propertyCountry) {
    if (ev.country.toUpperCase() !== propertyCountry.toUpperCase()) return false;
  }
  if (ev.city && propertyCity) {
    const ec = ev.city.toLowerCase().trim();
    const pc = propertyCity.toLowerCase().trim();
    if (!pc.includes(ec) && ec !== pc) return false;
  }
  return true;
}

export function multiplierForNight(
  nightIso: string,
  events: PriceEventWindow[],
  propertyCountry: string | null,
  propertyCity: string | null,
): { mult: number; parts: { name: string; mult: number }[] } {
  let mult = 1;
  const parts: { name: string; mult: number }[] = [];
  for (const ev of events) {
    if (!isoBetween(nightIso, ev.start_date, ev.end_date)) continue;
    if (!eventMatchesProperty(ev, propertyCountry, propertyCity)) continue;
    mult *= ev.impact_multiplier;
    parts.push({ name: ev.name, mult: ev.impact_multiplier });
  }
  return { mult, parts };
}

function rowToDbLocalEvent(raw: Record<string, unknown>): DbLocalEvent {
  return {
    start_date: String(raw.start_date ?? "").slice(0, 10),
    end_date: String(raw.end_date ?? "").slice(0, 10),
    impact_multiplier: Number(raw.impact_multiplier ?? 1),
    name: String(raw.name ?? ""),
    country: raw.country != null ? String(raw.country) : null,
    city: raw.city != null ? String(raw.city) : null,
    is_recurring: Boolean(raw.is_recurring),
    recurrence_type: raw.recurrence_type != null ? String(raw.recurrence_type) : "none",
  };
}

/** Fusionne événements intégrés SN + événements utilisateur sur les années demandées. */
export function mergeAllEventWindows(
  years: number[],
  propertyCity: string | null,
  propertyCountry: string | null,
  useBuiltin: boolean,
  userRows: Record<string, unknown>[],
): PriceEventWindow[] {
  const out: PriceEventWindow[] = [];
  const seen = new Set<string>();
  const push = (w: PriceEventWindow) => {
    const k = `${w.name}:${w.start_date}:${w.end_date}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(w);
  };

  for (const y of years) {
    if (useBuiltin) {
      for (const w of builtinWestAfricaWindows(y, propertyCity, propertyCountry)) push(w);
    }
  }

  for (const raw of userRows) {
    const ev = rowToDbLocalEvent(raw);
    const rt = (ev.recurrence_type ?? "").toLowerCase();
    const yearly = ev.is_recurring && rt === "yearly";
    const islamicRecurring = ev.is_recurring && /^islamic:\d{1,2}:\d{1,2}$/.test(rt);
    if (yearly || islamicRecurring) {
      for (const y of years) {
        const w = expandUserEventForYear(ev, y);
        if (w) push(w);
      }
    } else {
      push({
        start_date: ev.start_date,
        end_date: ev.end_date,
        impact_multiplier: ev.impact_multiplier,
        name: ev.name,
        country: ev.country,
        city: ev.city,
      });
    }
  }

  return out;
}
