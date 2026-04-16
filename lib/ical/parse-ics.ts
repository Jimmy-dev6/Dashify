import ICAL from "ical.js";

export type ParsedIcalEvent = {
  uid: string;
  /** Inclusive start date YYYY-MM-DD */
  start: string;
  /** Exclusive end date YYYY-MM-DD (half-open range [start, end)) */
  endExclusive: string;
  cancelledInFeed: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timeToIsoDate(t: { year: number; month: number; day: number }): string {
  return `${t.year}-${pad2(t.month)}-${pad2(t.day)}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = pad2(dt.getUTCMonth() + 1);
  const dd = pad2(dt.getUTCDate());
  return `${yy}-${mm}-${dd}`;
}

/**
 * Parse un flux ICS : événements all-day ou datetimes (dates normalisées en UTC calendaire).
 */
export function parseIcsEvents(icsText: string): ParsedIcalEvent[] {
  const jcal = ICAL.parse(icsText);
  const root = new ICAL.Component(jcal);
  const vevents = root.getAllSubcomponents("vevent");
  const byUid = new Map<string, ParsedIcalEvent>();

  for (const ve of vevents) {
    if (ve.hasProperty("rrule")) {
      continue;
    }
    try {
      const ev = new ICAL.Event(ve);
      const uid = String(ev.uid ?? "").trim();
      if (!uid) continue;

      const statusRaw = ve.getFirstPropertyValue("status");
      const status =
        typeof statusRaw === "string"
          ? statusRaw.toUpperCase()
          : String(statusRaw ?? "").toUpperCase();
      const cancelledInFeed = status === "CANCELLED";

      const st = ev.startDate;
      if (!st) continue;

      let startIso: string;
      let endExclusiveIso: string;

      if (st.isDate) {
        startIso = timeToIsoDate(st);
        const en = ev.endDate;
        if (en && en.isDate) {
          endExclusiveIso = timeToIsoDate(en);
        } else {
          endExclusiveIso = addDaysIso(startIso, 1);
        }
      } else {
        const sd = st.toJSDate();
        startIso = sd.toISOString().slice(0, 10);
        const en = ev.endDate;
        if (en) {
          const ed = en.toJSDate();
          endExclusiveIso = ed.toISOString().slice(0, 10);
        } else {
          endExclusiveIso = addDaysIso(startIso, 1);
        }
      }

      if (startIso >= endExclusiveIso) {
        endExclusiveIso = addDaysIso(startIso, 1);
      }

      byUid.set(uid, {
        uid,
        start: startIso,
        endExclusive: endExclusiveIso,
        cancelledInFeed,
      });
    } catch {
      /* ignore malformed blocks */
    }
  }

  return Array.from(byUid.values());
}
