"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { logOutboundMessage } from "@/lib/inbox/log-message";
import { formatPolicyConditionsBlock, policyFromRow } from "@/lib/policies/format-wa";
import type { PolicyRow } from "@/lib/policies/types";
import { buildWaFromProfile, type ProfileQuoteCtx } from "@/lib/quotes/profile-wa";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { DailyPreviewDay, DayColorTier } from "@/lib/pricing/types";
import { BookingDetailsModal } from "./booking-details-modal";

type Property = {
  id: string;
  name: string;
  base_price: number;
  cleaning_fee: number;
  currency: string;
};

type CalendarEvent = {
  id: string;
  property_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD (exclusive)
  source: "airbnb" | "booking" | "dashify" | "other" | "quote_hold";
  status: "confirmed" | "cancelled" | "pending";
  external_uid: string | null;
  booking_id: string | null;
  quote_id: string | null;
  customer_name: string | null;
};

type Customer = { id: string; name: string; phone: string };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromIsoLocal(s: string) {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDaysLocal(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function mondayIndex(jsDay: number) {
  // jsDay: 0=Sun..6=Sat => Mon=0..Sun=6
  return (jsDay + 6) % 7;
}

function startOfWeekMonday(d: Date) {
  const idx = mondayIndex(d.getDay());
  return addDaysLocal(startOfDayLocal(d), -idx);
}

function monthLabel(year: number, monthIndex: number) {
  const dt = new Date(year, monthIndex, 1);
  return dt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function nightsBetween(checkInIso: string, checkOutIso: string) {
  const a = startOfDayLocal(fromIsoLocal(checkInIso));
  const b = startOfDayLocal(fromIsoLocal(checkOutIso));
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function clampRangeToWeek(
  startIso: string,
  endIso: string,
  weekStart: Date,
  weekEndExclusive: Date,
) {
  const s = startOfDayLocal(fromIsoLocal(startIso));
  const e = startOfDayLocal(fromIsoLocal(endIso));
  const weekStartDay = startOfDayLocal(weekStart);
  const weekEndDay = startOfDayLocal(weekEndExclusive);
  const segStart = s < weekStartDay ? weekStartDay : s;
  const segEnd = e > weekEndDay ? weekEndDay : e;
  if (segStart >= segEnd) return null;
  return { segStart, segEnd };
}

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function calendarDpTierBg(tier?: DayColorTier) {
  switch (tier) {
    case "event_major":
      return "bg-red-950/55";
    case "event_medium":
      return "bg-orange-900/40";
    case "occupancy_high":
      return "bg-emerald-900/35";
    case "last_minute":
      return "bg-sky-950/45";
    case "low_price":
      return "bg-gray-800/55";
    default:
      return "bg-teal-950/40";
  }
}

function sourceStyle(source: CalendarEvent["source"]) {
  switch (source) {
    case "dashify":
      return {
        bg: "bg-teal-500/20",
        ring: "ring-1 ring-teal-400/30",
        text: "text-teal-200",
        dot: "bg-teal-400",
      };
    case "airbnb":
      return {
        bg: "bg-blue-500/20",
        ring: "ring-1 ring-blue-400/30",
        text: "text-blue-200",
        dot: "bg-blue-400",
      };
    case "booking":
      return {
        bg: "bg-purple-500/20",
        ring: "ring-1 ring-purple-400/30",
        text: "text-purple-200",
        dot: "bg-purple-400",
      };
    default:
      return {
        bg: "bg-gray-500/15",
        ring: "ring-1 ring-gray-400/20",
        text: "text-gray-200",
        dot: "bg-gray-400",
      };
  }
}

function normalizeWaPhone(input: string) {
  const digits = input.replace(/[^\d]/g, "");
  return digits;
}

function money(amount: number, currency: string) {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("fr-FR")} ${currency}`;
}

type CalPricePreview = {
  total: number;
  grand_total?: number;
  lines: string[];
  active: boolean;
  fee_lines?: { name: string; amount: number }[];
  supplement_lines?: { name: string; amount: number }[];
  promotion?: { code: string; discountAmount: number } | null;
};

function waExtrasFromPreviewCal(p: CalPricePreview, currency: string): string[] | null {
  const lines: string[] = [];
  if (p.fee_lines?.length) {
    lines.push(
      `🧾 Frais : ${p.fee_lines.map((l) => `${l.name} (${money(l.amount, currency)})`).join(" · ")}`,
    );
  }
  if (p.supplement_lines?.length) {
    lines.push(
      `➕ Suppléments : ${p.supplement_lines.map((l) => `${l.name} (${money(l.amount, currency)})`).join(" · ")}`,
    );
  }
  if (p.promotion && p.promotion.discountAmount > 0) {
    lines.push(`🏷️ Promo ${p.promotion.code} (−${money(p.promotion.discountAmount, currency)})`);
  }
  return lines.length ? lines : null;
}

export function CalendarView({ properties }: { properties: Property[] }) {
  const today = useMemo(() => startOfDayLocal(new Date()), []);
  const initialMonth = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }, []);

  const [month, setMonth] = useState(initialMonth);
  const [propertyId, setPropertyId] = useState<string | null>(
    properties[0]?.id ?? null,
  );
  const property = useMemo(
    () => properties.find((p) => p.id === propertyId) ?? null,
    [properties, propertyId],
  );

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [guests, setGuests] = useState(2);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [quoteCreating, setQuoteCreating] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteSuccessId, setQuoteSuccessId] = useState<string | null>(null);
  const [pricePreview, setPricePreview] = useState<CalPricePreview | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [policyId, setPolicyId] = useState("");
  const [profileWa, setProfileWa] = useState<ProfileQuoteCtx | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [supplementCatalog, setSupplementCatalog] = useState<
    { id: string; name: string; is_optional: boolean; price: number; price_type: string }[]
  >([]);
  const [supplementPick, setSupplementPick] = useState<Record<string, boolean>>({});

  const searchAbortRef = useRef<AbortController | null>(null);

  const monthKey = `${month.year}-${pad2(month.monthIndex + 1)}`;

  const [dpPreview, setDpPreview] = useState<{ active: boolean; days: DailyPreviewDay[] } | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setDpPreview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/pricing/preview?propertyId=${encodeURIComponent(propertyId)}&month=${encodeURIComponent(monthKey)}`,
        );
        const json = (await res.json()) as { active?: boolean; days?: DailyPreviewDay[] };
        if (cancelled) return;
        setDpPreview({ active: Boolean(json.active), days: json.days ?? [] });
      } catch {
        if (!cancelled) setDpPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, monthKey]);

  const dpByDate = useMemo(() => {
    const m = new Map<string, DailyPreviewDay>();
    for (const d of dpPreview?.days ?? []) m.set(d.date, d);
    return m;
  }, [dpPreview]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [profRes, polRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/policies"),
        ]);
        const profJson = (await profRes.json()) as { profile?: Record<string, unknown> };
        const polJson = (await polRes.json()) as { policies?: Record<string, unknown>[] };
        if (cancelled) return;
        if (profRes.ok && profJson.profile) {
          const p = profJson.profile;
          setProfileWa({
            company_name: (p.company_name as string) ?? null,
            company_logo: (p.company_logo as string) ?? null,
            website: (p.website as string) ?? null,
            city: (p.city as string) ?? null,
            country: (p.country as string) ?? null,
            address: (p.address as string) ?? null,
            quote_validity_hours: (p.quote_validity_hours as number) ?? null,
            default_language: (p.default_language as string) ?? null,
            default_currency: (p.default_currency as string) ?? null,
            payment_orange_money: (p.payment_orange_money as string) ?? null,
            payment_wave: (p.payment_wave as string) ?? null,
            payment_free_money: (p.payment_free_money as string) ?? null,
            payment_holder_name: (p.payment_holder_name as string) ?? null,
            payment_instructions_extra: (p.payment_instructions_extra as string) ?? null,
          });
        } else {
          setProfileWa(null);
        }
        if (polRes.ok) {
          const rows = (polJson.policies ?? []).map((r) => policyFromRow(r));
          setPolicies(rows);
          setPolicyId((prev) => {
            if (prev && rows.some((r) => r.id === prev)) return prev;
            const def = rows.find((r) => r.is_default);
            return def?.id ?? rows[0]?.id ?? "";
          });
        } else {
          setPolicies([]);
          setPolicyId("");
        }
      } catch {
        if (!cancelled) {
          setProfileWa(null);
          setPolicies([]);
          setPolicyId("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setLoadingEvents(true);
    setEventsError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/calendar/events?propertyId=${encodeURIComponent(
            propertyId,
          )}&month=${encodeURIComponent(monthKey)}`,
        );
        const json = (await res.json()) as { events?: CalendarEvent[]; error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Erreur chargement calendrier.");
        }
        if (!cancelled) setEvents(json.events ?? []);
      } catch (e) {
        if (!cancelled) setEventsError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, monthKey]);

  useEffect(() => {
    const q = customerQuery.trim();
    if (!panelOpen) return;
    if (!q) {
      setCustomerResults([]);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const t = setTimeout(() => {
      setCustomerLoading(true);
      void (async () => {
        try {
          const res = await fetch(
            `/api/customers/search?q=${encodeURIComponent(q)}&limit=8`,
            { signal: controller.signal },
          );
          const json = (await res.json()) as { customers?: Customer[]; error?: string };
          if (!res.ok) throw new Error(json.error ?? "Erreur recherche clients.");
          setCustomerResults(json.customers ?? []);
        } catch (e) {
          if ((e as { name?: string })?.name === "AbortError") return;
          setCustomerResults([]);
        } finally {
          setCustomerLoading(false);
        }
      })();
    }, 200);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [customerQuery, panelOpen]);

  const gridStart = useMemo(() => {
    const firstOfMonth = new Date(month.year, month.monthIndex, 1);
    return startOfWeekMonday(firstOfMonth);
  }, [month.year, month.monthIndex]);

  const weeks = useMemo(() => {
    const out: Date[][] = [];
    for (let w = 0; w < 6; w++) {
      const weekStart = addDaysLocal(gridStart, w * 7);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) days.push(addDaysLocal(weekStart, i));
      out.push(days);
    }
    return out;
  }, [gridStart]);

  const selection = useMemo(() => {
    if (!selectionStart) return null;
    if (!selectionEnd) return { start: selectionStart, end: null };
    const a = selectionStart;
    const b = selectionEnd;
    if (fromIsoLocal(a) <= fromIsoLocal(b)) return { start: a, end: b };
    return { start: b, end: a };
  }, [selectionStart, selectionEnd]);

  const nights = useMemo(() => {
    if (!selection?.start || !selection?.end) return 0;
    return nightsBetween(selection.start, selection.end);
  }, [selection]);

  const computedTotal = useMemo(() => {
    if (!property) return 0;
    return nights * Number(property.base_price ?? 0) + Number(property.cleaning_fee ?? 0);
  }, [nights, property]);

  const effectiveTotal = pricePreview?.grand_total ?? pricePreview?.total ?? computedTotal;

  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === policyId) ?? null,
    [policies, policyId],
  );

  useEffect(() => {
    if (!property?.id) {
      setSupplementCatalog([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/supplements?propertyId=${encodeURIComponent(property.id)}`);
        const json = (await res.json()) as {
          supplements?: Array<{
            id: string;
            name: string;
            is_optional: boolean;
            price: number;
            price_type: string;
          }>;
        };
        if (!res.ok || cancelled) return;
        const list = json.supplements ?? [];
        setSupplementCatalog(list);
        setSupplementPick((prev) => {
          const next: Record<string, boolean> = {};
          for (const s of list) {
            if (!s.is_optional) next[s.id] = true;
            else next[s.id] = prev[s.id] ?? false;
          }
          return next;
        });
      } catch {
        if (!cancelled) setSupplementCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [property?.id]);

  useEffect(() => {
    if (!property || !selection?.start || !selection?.end || nights < 1) {
      setPricePreview(null);
      return;
    }
    const ac = new AbortController();
    const supIds = Object.entries(supplementPick)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const supQ = supIds.length ? `&supplements=${encodeURIComponent(supIds.join(","))}` : "";
    const promoQ = promoCode.trim() ? `&promoCode=${encodeURIComponent(promoCode.trim())}` : "";
    void (async () => {
      try {
        const res = await fetch(
          `/api/pricing/quote-preview?propertyId=${encodeURIComponent(property.id)}&checkIn=${encodeURIComponent(selection.start)}&checkOut=${encodeURIComponent(selection.end)}&guests=${guests}${promoQ}${supQ}`,
          { signal: ac.signal },
        );
        const json = (await res.json()) as CalPricePreview & { error?: string };
        if (!res.ok) return;
        if (ac.signal.aborted) return;
        setPricePreview({
          total: Number(json.total ?? 0),
          grand_total: json.grand_total != null ? Number(json.grand_total) : undefined,
          lines: Array.isArray(json.lines) ? json.lines : [],
          active: Boolean(json.active),
          fee_lines: json.fee_lines,
          supplement_lines: json.supplement_lines,
          promotion: json.promotion ?? null,
        });
      } catch {
        if (!ac.signal.aborted) setPricePreview(null);
      }
    })();
    return () => ac.abort();
  }, [property, selection?.start, selection?.end, nights, guests, promoCode, supplementPick]);

  const waMessage = useMemo(() => {
    if (!property || !selection?.start || !selection?.end || nights < 1) return "";
    const name = (customerName || customerQuery || "client").trim();
    const lang: "fr" | "en" = profileWa?.default_language?.toLowerCase() === "en" ? "en" : "fr";
    const conditionsBlock =
      selectedPolicy != null
        ? formatPolicyConditionsBlock(selectedPolicy, lang, property.currency ?? "XOF")
        : null;
    const pricingExtrasLines = pricePreview
      ? waExtrasFromPreviewCal(pricePreview, property.currency ?? "XOF")
      : null;
    return buildWaFromProfile(profileWa, {
      customerName: name,
      propertyName: property.name,
      checkIn: selection.start,
      checkOut: selection.end,
      guests,
      total: effectiveTotal,
      propertyCurrency: property.currency,
      quoteValidityHours: selectedPolicy?.quote_expiry_hours ?? null,
      policyConditionsBlock: conditionsBlock,
      pricingExtrasLines,
    });
  }, [
    property,
    selection,
    customerName,
    customerQuery,
    effectiveTotal,
    nights,
    guests,
    profileWa,
    selectedPolicy,
    pricePreview,
  ]);

  const resetPanelState = useCallback(() => {
    setQuoteError(null);
    setQuoteSuccessId(null);
    setCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerQuery("");
    setCustomerResults([]);
    setGuests(2);
    setPromoCode("");
    setSupplementPick({});
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    resetPanelState();
  }, [resetPanelState]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, closePanel]);

  function prevMonth() {
    setMonth((m) => {
      const d = new Date(m.year, m.monthIndex, 1);
      d.setMonth(d.getMonth() - 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  }

  function nextMonth() {
    setMonth((m) => {
      const d = new Date(m.year, m.monthIndex, 1);
      d.setMonth(d.getMonth() + 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  }

  function onDayClick(day: Date) {
    const iso = toIsoLocal(day);
    setQuoteError(null);
    setQuoteSuccessId(null);

    if (!selectionStart || (selectionStart && selectionEnd)) {
      setSelectionStart(iso);
      setSelectionEnd(null);
      setPanelOpen(false);
      return;
    }

    setSelectionEnd(iso);
    setPanelOpen(true);
  }

  function isInMonth(d: Date) {
    return d.getMonth() === month.monthIndex && d.getFullYear() === month.year;
  }

  function inSelectedRange(d: Date) {
    if (!selection?.start) return false;
    const iso = toIsoLocal(d);
    if (!selection.end) return iso === selection.start;
    const a = selection.start;
    const b = selection.end;
    return fromIsoLocal(iso) >= fromIsoLocal(a) && fromIsoLocal(iso) <= fromIsoLocal(b);
  }

  function isSelectionEdge(d: Date) {
    if (!selection?.start) return false;
    const iso = toIsoLocal(d);
    if (!selection.end) return iso === selection.start;
    return iso === selection.start || iso === selection.end;
  }

  const weekSegments = useMemo(() => {
    // Split events per week, then greedy-lane to avoid overlaps.
    type Segment = {
      key: string;
      weekIndex: number;
      startCol: number; // 1..7
      endCol: number; // 1..7 inclusive
      source: CalendarEvent["source"];
      lane: number;
      bookingId: string | null;
      customerName: string | null;
    };

    const segments: Segment[] = [];
    const weekStartDates = weeks.map((w) => w[0]!);

    // On filtre cote client : pas d'affichage des holds (quote_hold) ni des annules.
    const visibleEvents = events.filter(
      (ev) => ev.status !== "cancelled" && ev.source !== "quote_hold",
    );

    for (let wi = 0; wi < weeks.length; wi++) {
      const ws = weekStartDates[wi]!;
      const we = addDaysLocal(ws, 7);
      const weekParts: Array<Omit<Segment, "lane">> = [];
      for (const ev of visibleEvents) {
        const seg = clampRangeToWeek(ev.start_date, ev.end_date, ws, we);
        if (!seg) continue;
        const startIdx = Math.max(0, Math.min(6, mondayIndex(seg.segStart.getDay())));
        // segEnd is exclusive; bar ends at previous day
        const endInclusive = addDaysLocal(seg.segEnd, -1);
        const endIdx = Math.max(0, Math.min(6, mondayIndex(endInclusive.getDay())));
        weekParts.push({
          key: `${ev.id}:${wi}:${toIsoLocal(seg.segStart)}`,
          weekIndex: wi,
          startCol: startIdx + 1,
          endCol: endIdx + 1,
          source: ev.source,
          bookingId: ev.booking_id,
          customerName: ev.customer_name,
        });
      }

      weekParts.sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);

      const lanes: Array<Array<{ startCol: number; endCol: number }>> = [];
      for (const part of weekParts) {
        let lane = 0;
        for (; lane < lanes.length; lane++) {
          const last = lanes[lane]![lanes[lane]!.length - 1]!;
          if (part.startCol > last.endCol) break;
        }
        if (!lanes[lane]) lanes[lane] = [];
        lanes[lane]!.push({ startCol: part.startCol, endCol: part.endCol });
        segments.push({ ...part, lane });
      }
    }

    return segments;
  }, [events, weeks]);

  async function createQuote() {
    if (!property || !selection?.start || !selection?.end) return;
    if (nights < 1) {
      setQuoteError("La date de fin doit être après la date de début (minimum 1 nuit).");
      return;
    }
    setQuoteCreating(true);
    setQuoteError(null);
    setQuoteSuccessId(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn: selection.start,
          checkOut: selection.end,
          guests,
          customerId,
          customerName: customerId ? null : (customerName || customerQuery || "").trim(),
          customerPhone: (customerPhone || "").trim(),
          ...(policyId ? { policyId } : {}),
          ...(promoCode.trim() ? { promoCode: promoCode.trim() } : {}),
          supplementIds: Object.entries(supplementPick)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Impossible de créer le devis.");
      }
      setQuoteSuccessId(json.id ?? "ok");
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuoteCreating(false);
    }
  }

  function openWhatsApp() {
    const phone = normalizeWaPhone(customerPhone);
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    if (!property?.id) return;

    // Prefer logging against the persisted quote (it always has customer_id).
    if (quoteSuccessId && quoteSuccessId !== "ok") {
      void (async () => {
        try {
          const res = await fetch(`/api/quotes/${encodeURIComponent(quoteSuccessId)}`);
          const json = (await res.json()) as {
            quote?: { customer_id: string; property_id: string; wa_message: string };
          };
          const q = json.quote;
          if (!res.ok || !q) return;
          await logOutboundMessage({
            customerId: q.customer_id,
            propertyId: q.property_id,
            platform: "whatsapp",
            content: q.wa_message || waMessage,
          });
        } catch {
          /* ignore */
        }
      })();
      return;
    }

    // Fallback: log with current selection if we have a customer id.
    if (customerId) {
      void logOutboundMessage({
        customerId,
        propertyId: property.id,
        platform: "whatsapp",
        content: waMessage,
      });
    }
  }

  const quoteForm =
    panelOpen && selection?.start && selection?.end ? (
      <div className="max-h-[min(85vh,720px)] overflow-y-auto rounded-2xl border border-gray-700/80 bg-gray-900 shadow-2xl shadow-black/50 ring-1 ring-teal-500/10">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-5 py-4 backdrop-blur">
          <div>
            <div id="calendar-quote-title" className="text-base font-semibold text-white">
              Nouveau devis
            </div>
            <div className="text-xs text-gray-400">
              {property?.name ?? "Logement"} · {nights} nuit{nights > 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-800"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-gray-400">Dates</div>
              <div className="text-xs text-teal-300/90">{nights} nuits</div>
            </div>
            {nights < 1 && (
              <p className="mt-2 text-xs text-amber-200/90">
                Choisissez une date de fin <span className="font-semibold">après</span> le check-in
                (minimum 1 nuit).
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-medium text-gray-500">Check-in</div>
                <div className="mt-1 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-sm text-white">
                  {dayLabel(fromIsoLocal(selection.start))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500">Check-out</div>
                <div className="mt-1 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-sm text-white">
                  {dayLabel(fromIsoLocal(selection.end))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-gray-300">Voyageurs</span>
              <input
                type="number"
                min={1}
                max={50}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950/40 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
              />
            </label>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">Nom du client</span>
                {customerLoading && (
                  <span className="text-[11px] text-gray-500">Recherche…</span>
                )}
              </div>
              <input
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomerId(null);
                  setCustomerName(e.target.value);
                }}
                placeholder="Tapez pour rechercher…"
                className="h-10 rounded-lg border border-gray-800 bg-gray-950/40 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
                autoComplete="off"
              />
              {customerResults.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-lg border border-gray-800 bg-gray-950/90 p-1 shadow-lg">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-200 hover:bg-teal-500/10"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerName(c.name);
                        setCustomerQuery(c.name);
                        setCustomerPhone(c.phone);
                        setCustomerResults([]);
                      }}
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="shrink-0 text-xs text-gray-400">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-gray-300">Téléphone WhatsApp</span>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="ex: 2250700000000"
                className="h-10 rounded-lg border border-gray-800 bg-gray-950/40 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-gray-300">Politique de réservation</span>
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                disabled={policies.length === 0}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950/40 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Aucune (validité selon profil)</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.is_default ? " (défaut)" : ""}
                  </option>
                ))}
              </select>
              {policies.length === 0 && (
                <span className="text-[11px] text-gray-500">
                  Ajoutez des politiques dans{" "}
                  <Link href="/dashboard/policies" className="text-teal-400 underline">
                    Politiques
                  </Link>
                  .
                </span>
              )}
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-gray-300">Code promo</span>
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="ex. DAKAR20"
                className="h-10 rounded-lg border border-gray-800 bg-gray-950/40 px-3 font-mono text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
              />
            </label>

            {supplementCatalog.length > 0 && (
              <div className="grid gap-2 rounded-xl border border-gray-800 bg-gray-950/40 p-3">
                <div className="text-xs font-medium text-gray-400">Suppléments</div>
                <div className="max-h-36 space-y-2 overflow-y-auto">
                  {supplementCatalog.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-start gap-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-gray-600"
                        checked={Boolean(supplementPick[s.id])}
                        disabled={!s.is_optional}
                        onChange={(e) =>
                          setSupplementPick((p) => ({
                            ...p,
                            [s.id]: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        {s.name}
                        {!s.is_optional ? (
                          <span className="text-xs text-teal-400/90"> (inclus)</span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {" "}
                            · {money(s.price, property?.currency ?? "XOF")}{" "}
                            {s.price_type === "per_night"
                              ? "/ nuit"
                              : s.price_type === "per_person"
                                ? "/ pers."
                                : ""}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-400">Prix estimé</div>
                <div className="text-sm font-semibold text-teal-200">
                  {property ? money(effectiveTotal, property.currency ?? "XOF") : "—"}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {property
                  ? pricePreview?.active
                    ? "Tarification dynamique active (voir détail ci-dessous)."
                    : `${nights} × ${money(Number(property.base_price ?? 0), property.currency ?? "XOF")} + frais ménage ${money(
                        Number(property.cleaning_fee ?? 0),
                        property.currency ?? "XOF",
                      )}`
                  : ""}
              </div>
              {pricePreview?.active && pricePreview.lines.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-teal-500/10 pt-3 text-[11px] leading-snug text-gray-300">
                  {pricePreview.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {quoteError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {quoteError}
              </div>
            )}

            {quoteSuccessId && (
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
                Devis créé. Vous pouvez l’envoyer sur WhatsApp.
              </div>
            )}

            <div className="grid gap-2 pt-1">
              <button
                type="button"
                onClick={createQuote}
                disabled={quoteCreating || !property}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400",
                  (quoteCreating || !property) && "opacity-60 hover:bg-teal-500",
                )}
              >
                {quoteCreating ? "Création…" : "Créer le devis"}
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                disabled={!normalizeWaPhone(customerPhone) || !property}
                className={cn(
                  "inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm font-semibold text-gray-100 hover:bg-gray-800",
                  (!normalizeWaPhone(customerPhone) || !property) &&
                    "cursor-not-allowed opacity-50 hover:bg-gray-950",
                )}
              >
                Envoyer sur WhatsApp
              </button>
              <details className="rounded-xl border border-gray-800 bg-gray-950/30 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-gray-300">
                  Aperçu du message
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-400">
                  {waMessage}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="relative">
      <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-950/80 shadow-xl ring-1 ring-gray-800/60">
        <div className="flex flex-col gap-3 border-b border-gray-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-gray-950/40 text-gray-200 hover:bg-gray-800/50"
              aria-label="Mois précédent"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-gray-950/40 text-gray-200 hover:bg-gray-800/50"
              aria-label="Mois suivant"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <div className="ml-1">
              <div className="text-base font-semibold capitalize text-white">
                {monthLabel(month.year, month.monthIndex)}
              </div>
              <div className="text-xs text-gray-400">
                Cliquez 2 dates pour générer un devis
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {properties.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Logement</span>
                <select
                  value={propertyId ?? ""}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setSelectionStart(null);
                    setSelectionEnd(null);
                    setPanelOpen(false);
                  }}
                  className="h-9 rounded-lg border border-gray-800 bg-gray-950/40 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", sourceStyle("dashify").dot)} />
                Dashify
              </span>
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", sourceStyle("airbnb").dot)} />
                Airbnb
              </span>
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", sourceStyle("booking").dot)} />
                Booking
              </span>
            </div>
          </div>
        </div>

        {eventsError && (
          <div className="m-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {eventsError}
          </div>
        )}

        <div className="grid grid-cols-7 gap-px border-t border-gray-800 bg-gray-800/70 text-xs font-medium text-gray-400">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="bg-gray-950/40 px-3 py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="bg-gray-800/70">
          {weeks.map((days, wi) => {
            const segments = weekSegments.filter((s) => s.weekIndex === wi);
            const laneCount = segments.reduce((m, s) => Math.max(m, s.lane + 1), 0);
            const barHeight = 18;
            const barGap = 6;
            const barArea = laneCount ? laneCount * barHeight + (laneCount - 1) * barGap : 0;
            return (
              <div key={wi} className="relative">
                <div
                  className="grid grid-cols-7 gap-px bg-gray-800/70"
                  style={{ paddingTop: barArea ? barArea + 10 : 10 }}
                >
                  {days.map((d) => {
                    const iso = toIsoLocal(d);
                    const past = d < today;
                    const inMonth = isInMonth(d);
                    const selected = inSelectedRange(d);
                    const edge = isSelectionEdge(d);
                    const dpDay = inMonth ? dpByDate.get(iso) : undefined;
                    const dpOn = Boolean(dpPreview?.active && dpDay);
                    return (
                      <button
                        key={iso}
                        type="button"
                        title={dpOn && dpDay?.detail ? dpDay.detail : undefined}
                        onClick={() => onDayClick(d)}
                        className={cn(
                          "group relative min-h-[92px] px-3 py-2 text-left outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-teal-500/40",
                          dpOn ? calendarDpTierBg(dpDay?.color_tier) : "bg-gray-950/40",
                          !inMonth && "bg-gray-950/25",
                          past && "opacity-55 saturate-75",
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className={cn(
                              "text-sm font-semibold",
                              past ? "text-gray-500" : "text-gray-200",
                              !inMonth && "text-gray-600",
                            )}
                          >
                            {d.getDate()}
                          </div>
                          {edge && (
                            <span className="mt-0.5 inline-flex rounded-full bg-teal-400/10 px-2 py-0.5 text-[11px] font-semibold text-teal-200 ring-1 ring-teal-400/30">
                              {iso === selection?.start ? "Début" : "Fin"}
                            </span>
                          )}
                        </div>

                        {dpOn && dpDay ? (
                          <div className="relative z-[1] mt-0.5 text-[10px] font-semibold leading-tight text-white/95">
                            {Math.round(dpDay.price).toLocaleString("fr-FR")}{" "}
                            <span className="font-normal text-white/70">
                              {property?.currency ?? "XOF"}
                            </span>
                          </div>
                        ) : null}

                        {selected && (
                          <div
                            className={cn(
                              "pointer-events-none absolute inset-1 rounded-lg",
                              edge
                                ? "bg-teal-500/18 ring-1 ring-teal-400/35"
                                : "bg-teal-500/10 ring-1 ring-teal-400/20",
                            )}
                          />
                        )}

                        <div className="pointer-events-none mt-4 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent opacity-60" />
                      </button>
                    );
                  })}
                </div>

                {segments.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-2 grid grid-cols-7 gap-px px-0"
                    style={{ height: barArea }}
                  >
                    {segments.map((s) => {
                      const st = sourceStyle(s.source);
                      const isClickable = s.source === "dashify" && s.bookingId !== null;
                      const label =
                        s.source === "dashify"
                          ? (s.customerName ?? "Réservation")
                          : s.source === "airbnb"
                            ? "Airbnb"
                            : s.source === "booking"
                              ? "Booking"
                              : "Blocage";

                      const commonClass = cn(
                        "mx-1 flex items-center rounded-md px-2 text-[11px] font-semibold",
                        st.bg,
                        st.ring,
                        st.text,
                      );
                      const commonStyle = {
                        gridColumn: `${s.startCol} / ${s.endCol + 1}`,
                        marginTop: s.lane * (barHeight + barGap),
                        height: barHeight,
                      };

                      if (isClickable) {
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBookingId(s.bookingId);
                            }}
                            className={cn(
                              commonClass,
                              "cursor-pointer transition-all hover:brightness-125 hover:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
                            )}
                            style={commonStyle}
                            title={`Voir les détails de la réservation${s.customerName ? ` de ${s.customerName}` : ""}`}
                          >
                            <span className={cn("mr-2 h-1.5 w-1.5 shrink-0 rounded-full", st.dot)} />
                            <span className="truncate">{label}</span>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={s.key}
                          className={cn(commonClass, "pointer-events-none")}
                          style={commonStyle}
                        >
                          <span className={cn("mr-2 h-1.5 w-1.5 shrink-0 rounded-full", st.dot)} />
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {dpPreview?.active ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-800 px-4 py-3 text-[10px] text-gray-400">
            <span className="font-medium text-gray-300">Prix dynamiques :</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-red-800/90" /> Très haut (événement)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-orange-700/90" /> Haut
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-teal-800/90" /> Normal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-sky-800/90" /> Last minute / bas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-gray-700/90" /> Occupation basse
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-gray-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-400">
            {loadingEvents ? "Chargement des réservations…" : `${events.length} événements`}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              className="rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 font-semibold text-gray-200 hover:bg-gray-800/50"
              onClick={() => {
                setSelectionStart(null);
                setSelectionEnd(null);
                setPanelOpen(false);
              }}
            >
              Réinitialiser sélection
            </button>
            <Link
              href="/dashboard/quotes"
              className="rounded-lg bg-teal-500 px-3 py-2 font-semibold text-black hover:bg-teal-400"
            >
              Voir les devis
            </Link>
          </div>
        </div>
      </div>

      {!property && properties.length === 0 && (
        <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Aucun logement. Créez une propriété dans{" "}
          <Link href="/dashboard/properties" className="font-semibold text-teal-300 underline">
            Logements
          </Link>{" "}
          pour afficher le calendrier.
        </div>
      )}

      {properties.length === 1 && property && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Calendrier : <span className="font-medium text-gray-400">{property.name}</span>
        </p>
      )}

      {panelOpen && quoteForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-quote-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fermer le panneau"
            onClick={closePanel}
          />
          <div className="relative z-10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {quoteForm}
          </div>
        </div>
      )}

      {/* Modal details reservation (clic sur barre dashify) */}
      <BookingDetailsModal
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onCancelled={() => {
          // Refetch des events : la barre annulee disparaitra du calendrier.
          // On force un refetch en re-settant propertyId a sa propre valeur.
          setSelectedBookingId(null);
          if (propertyId) {
            const current = propertyId;
            setPropertyId(null);
            setTimeout(() => setPropertyId(current), 0);
          }
        }}
      />
    </div>
  );
}

