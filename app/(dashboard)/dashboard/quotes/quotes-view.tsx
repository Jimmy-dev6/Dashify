"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatPolicyConditionsBlock, policyFromRow } from "@/lib/policies/format-wa";
import type { PolicyRow } from "@/lib/policies/types";
import { buildWaFromProfile, type ProfileQuoteCtx } from "@/lib/quotes/profile-wa";
import { dayLabelFr, formatMoneyFr, nightsBetween } from "@/lib/quotes/wa-message";
import { logOutboundMessage } from "@/lib/inbox/log-message";

type Property = {
  id: string;
  name: string;
  base_price: number;
  cleaning_fee: number;
  currency: string;
};

export type QuoteListItem = {
  id: string;
  property_id: string;
  customer_id: string;
  policy_id?: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total: number;
  wa_message: string;
  status: string;
  expires_at: string;
  created_at: string;
  nights: number;
  property: { name: string; currency: string } | null;
  customer: { name: string; phone: string } | null;
};

type Stats = {
  totalThisMonth: number;
  acceptedThisMonth: number;
  acceptedAmountXof: number;
  conversionPct: number;
};

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function normalizeWaPhone(input: string) {
  return input.replace(/[^\d]/g, "");
}

function money(amount: number, currency = "XOF") {
  return formatMoneyFr(amount, currency);
}

type PricePreviewJson = {
  total?: number;
  grand_total?: number;
  lines?: string[];
  active?: boolean;
  fee_lines?: { name: string; amount: number }[];
  supplement_lines?: { name: string; amount: number }[];
  promotion?: { code: string; discountAmount: number } | null;
};

function waExtrasFromPreview(p: PricePreviewJson, currency: string): string[] | null {
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

function quoteStatusBadge(status: string) {
  if (status === "draft") return "bg-gray-500/15 text-gray-200 ring-1 ring-gray-500/35";
  if (status === "sent") return "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/35";
  if (status === "accepted") return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35";
  if (status === "refused") return "bg-red-500/15 text-red-200 ring-1 ring-red-400/35";
  if (status === "expired") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/40";
  return "bg-gray-600/20 text-gray-300 ring-1 ring-gray-600/30";
}

function quoteStatusLabel(status: string) {
  if (status === "draft") return "Brouillon";
  if (status === "sent") return "Envoyé";
  if (status === "accepted") return "Accepté";
  if (status === "refused") return "Refusé";
  if (status === "expired") return "Expiré";
  return status;
}

export function QuotesView({
  properties,
  initialQuoteId,
  initialNewModal,
  prefillCustomerId,
}: {
  properties: Property[];
  initialQuoteId: string | null;
  initialNewModal: boolean;
  prefillCustomerId?: string | null;
}) {
  const router = useRouter();
  const [filterProperty, setFilterProperty] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QuoteListItem | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [modalInitialCustomer, setModalInitialCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const urlQuoteLoaded = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filterProperty) qs.set("propertyId", filterProperty);
      if (filterStatus) qs.set("status", filterStatus);
      const res = await fetch(`/api/quotes?${qs.toString()}`);
      const json = (await res.json()) as {
        quotes?: QuoteListItem[];
        stats?: Stats;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Erreur chargement.");
      setQuotes(json.quotes ?? []);
      setStats(json.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setQuotes([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filterProperty, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialNewModal) return;
    setNewOpen(true);
  }, [initialNewModal]);

  useEffect(() => {
    if (!prefillCustomerId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/clients/${prefillCustomerId}`);
        const json = (await res.json()) as {
          customer?: { id: string; name: string; phone: string };
          error?: string;
        };
        if (!res.ok || !json.customer) return;
        if (!cancelled) {
          setModalInitialCustomer({
            id: json.customer.id,
            name: json.customer.name,
            phone: json.customer.phone,
          });
          setNewOpen(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefillCustomerId]);

  useEffect(() => {
    if (!initialQuoteId || urlQuoteLoaded.current) return;
    urlQuoteLoaded.current = true;
    void (async () => {
      try {
        const res = await fetch(`/api/quotes/${initialQuoteId}`);
        const json = (await res.json()) as { quote?: QuoteListItem; error?: string };
        if (res.ok && json.quote) setSelected(json.quote);
      } catch {
        /* ignore */
      }
    })();
  }, [initialQuoteId]);

  const clearUrlParams = useCallback(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("quote") || u.searchParams.get("new") || u.searchParams.get("customerId")) {
      router.replace("/dashboard/quotes");
    }
  }, [router]);

  const refreshSelectedAfterUpdate = useCallback(
    async (quoteId: string) => {
      await load();
      try {
        const res = await fetch(`/api/quotes/${quoteId}`);
        const json = (await res.json()) as { quote?: QuoteListItem };
        if (res.ok && json.quote) {
          setSelected((prev) => (prev?.id === quoteId ? json.quote! : prev));
        }
      } catch {
        /* ignore */
      }
    },
    [load],
  );

  const deleteQuote = useCallback(
    async (id: string) => {
      if (!confirm("Supprimer ce devis ?")) return;
      try {
        const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Suppression impossible.");
        setSelected((prev) => (prev?.id === id ? null : prev));
        clearUrlParams();
        void load();
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      }
    },
    [load, clearUrlParams],
  );

  const convertQuote = useCallback(
    async (quoteId: string) => {
      if (!confirm("Créer la réservation et bloquer les dates au calendrier ?")) return;
      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromAcceptedQuote: true, quoteId }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Conversion impossible.");
        router.push("/dashboard/bookings");
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      }
    },
    [router],
  );

  const sendQuoteWhatsApp = useCallback(
    async (q: QuoteListItem, markSent: boolean) => {
      const phone = normalizeWaPhone(q.customer?.phone ?? "");
      if (!phone) {
        alert("Numéro client manquant ou invalide pour WhatsApp.");
        return;
      }
      if (markSent && q.status === "draft") {
        try {
          const res = await fetch(`/api/quotes/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "sent" }),
          });
          const json = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !json.ok) throw new Error(json.error ?? "Mise à jour impossible.");
        } catch (e) {
          alert(e instanceof Error ? e.message : String(e));
          return;
        }
      }
      const text = q.wa_message || "";
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      void logOutboundMessage({
        customerId: q.customer_id,
        propertyId: q.property_id,
        platform: "whatsapp",
        content: text,
      });
      void load();
      setSelected((prev) =>
        prev && prev.id === q.id
          ? { ...prev, status: markSent && prev.status === "draft" ? "sent" : prev.status }
          : prev,
      );
    },
    [load],
  );

  return (
    <div>
      <PageHeader
        title="Devis"
        description="Créez des propositions, envoyez-les sur WhatsApp et convertissez les acceptations en réservations."
        actions={
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={properties.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau devis
          </button>
        }
      />

      {properties.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Ajoutez au moins un logement dans{" "}
          <Link href="/dashboard/properties" className="font-semibold text-teal-300 underline">
            Logements
          </Link>{" "}
          pour créer des devis.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Devis ce mois
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : stats?.totalThisMonth ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-teal-500/10">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Acceptés (créés ce mois)
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-200">
            {loading ? "—" : stats?.acceptedThisMonth ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Montant acceptés (XOF)
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : money(stats?.acceptedAmountXof ?? 0, "XOF")}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Taux de conversion
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : `${stats?.conversionPct ?? 0} %`}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Acceptés / devis créés sur le mois en cours.</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="grid min-w-[12rem] flex-1 gap-1 text-xs font-medium text-gray-400">
          Logement
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
          >
            <option value="">Tous</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[10rem] gap-1 text-xs font-medium text-gray-400">
          Statut
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
          >
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="accepted">Accepté</option>
            <option value="refused">Refusé</option>
            <option value="expired">Expiré</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && quotes.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-10 text-center">
          <p className="text-sm font-medium text-gray-200">Aucun devis</p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Aucun devis ne correspond à ces filtres. Créez un premier devis pour le suivre ici.
          </p>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={properties.length === 0}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau devis
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40 shadow-sm ring-1 ring-gray-800/50">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
              <thead className="bg-gray-950/50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Logement</th>
                  <th className="px-4 py-3">Séjour</th>
                  <th className="px-4 py-3 text-center">Nuits</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-200">
                {quotes.map((q) => {
                  const cur = q.property?.currency ?? "XOF";
                  return (
                    <tr
                      key={q.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-gray-800/40",
                        selected?.id === q.id && "bg-teal-500/5",
                      )}
                      onClick={() => setSelected(q)}
                    >
                      <td className="px-4 py-3 font-medium text-white">{q.customer?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-300">{q.property?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {dayLabelFr(q.check_in)} → {dayLabelFr(q.check_out)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-gray-300">{q.nights}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                        {money(q.total, cur)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            quoteStatusBadge(q.status),
                          )}
                        >
                          {quoteStatusLabel(q.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {(q.status === "draft" || q.status === "sent") && (
                            <button
                              type="button"
                              onClick={() => sendQuoteWhatsApp(q, true)}
                              className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs font-semibold text-teal-200 hover:bg-gray-800"
                            >
                              WhatsApp
                            </button>
                          )}
                          {q.status === "accepted" && (
                            <button
                              type="button"
                              onClick={() => void convertQuote(q.id)}
                              className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-2 py-1 text-xs font-semibold text-teal-200 hover:bg-teal-500/25"
                            >
                              Réservation
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void deleteQuote(q.id)}
                            className="rounded-lg border border-red-500/35 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <QuoteSidePanel
          quote={selected}
          onClose={() => {
            setSelected(null);
            clearUrlParams();
          }}
          onUpdated={() => refreshSelectedAfterUpdate(selected.id)}
          onDeleted={() => {
            setSelected(null);
            clearUrlParams();
            void load();
          }}
        />
      )}

      {newOpen && (
        <NewQuoteModal
          properties={properties}
          initialCustomer={modalInitialCustomer}
          onClose={() => {
            setNewOpen(false);
            setModalInitialCustomer(null);
            clearUrlParams();
          }}
          onCreated={() => {
            setNewOpen(false);
            setModalInitialCustomer(null);
            clearUrlParams();
            void load();
          }}
        />
      )}
    </div>
  );
}

function NewQuoteModal({
  properties,
  initialCustomer,
  onClose,
  onCreated,
}: {
  properties: Property[];
  initialCustomer?: { id: string; name: string; phone: string } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const property = useMemo(
    () => properties.find((p) => p.id === propertyId) ?? null,
    [properties, propertyId],
  );

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerResults, setCustomerResults] = useState<
    { id: string; name: string; phone: string }[]
  >([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [availabilityNote, setAvailabilityNote] = useState<string | null>(null);
  const [profileWa, setProfileWa] = useState<ProfileQuoteCtx | null>(null);
  const [pricePreview, setPricePreview] = useState<{
    total: number;
    grand_total?: number;
    lines: string[];
    active: boolean;
    fee_lines?: { name: string; amount: number }[];
    supplement_lines?: { name: string; amount: number }[];
    promotion?: { code: string; discountAmount: number } | null;
  } | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [policyId, setPolicyId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [supplementCatalog, setSupplementCatalog] = useState<
    { id: string; name: string; is_optional: boolean; price: number; price_type: string }[]
  >([]);
  const [supplementPick, setSupplementPick] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/policies");
        const json = (await res.json()) as { policies?: Record<string, unknown>[]; error?: string };
        if (!res.ok || cancelled) return;
        const rows = (json.policies ?? []).map((r) => policyFromRow(r));
        setPolicies(rows);
        setPolicyId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          const def = rows.find((r) => r.is_default);
          return def?.id ?? rows[0]?.id ?? "";
        });
      } catch {
        if (!cancelled) {
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
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/profile");
        const json = (await res.json()) as { profile?: Record<string, unknown> };
        if (!res.ok || cancelled || !json.profile) return;
        const p = json.profile;
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
        });
      } catch {
        if (!cancelled) setProfileWa(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialCustomer) return;
    setCustomerId(initialCustomer.id);
    setCustomerQuery(initialCustomer.name);
    setCustomerPhone(initialCustomer.phone);
    setCustomerResults([]);
  }, [initialCustomer]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) return 0;
    return nightsBetween(checkIn, checkOut);
  }, [checkIn, checkOut]);

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
    if (!property || !checkIn || !checkOut || nights < 1) {
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
          `/api/pricing/quote-preview?propertyId=${encodeURIComponent(property.id)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}${promoQ}${supQ}`,
          { signal: ac.signal },
        );
        const json = (await res.json()) as PricePreviewJson;
        if (!res.ok || ac.signal.aborted) return;
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
  }, [property, checkIn, checkOut, nights, guests, promoCode, supplementPick]);

  const waPreview = useMemo(() => {
    if (!property || !checkIn || !checkOut || nights < 1) return "";
    const name = (customerId ? customerQuery : customerQuery.trim()) || "client";
    const lang: "fr" | "en" = profileWa?.default_language?.toLowerCase() === "en" ? "en" : "fr";
    const conditionsBlock =
      selectedPolicy != null
        ? formatPolicyConditionsBlock(selectedPolicy, lang, property.currency)
        : null;
    const pricingExtrasLines = pricePreview
      ? waExtrasFromPreview(pricePreview, property.currency)
      : null;
    return buildWaFromProfile(profileWa, {
      customerName: name,
      propertyName: property.name,
      checkIn,
      checkOut,
      guests,
      total: effectiveTotal,
      propertyCurrency: property.currency,
      quoteValidityHours: selectedPolicy?.quote_expiry_hours ?? null,
      policyConditionsBlock: conditionsBlock,
      pricingExtrasLines,
    });
  }, [
    property,
    checkIn,
    checkOut,
    nights,
    guests,
    effectiveTotal,
    customerId,
    customerQuery,
    profileWa,
    selectedPolicy,
    pricePreview,
  ]);

  useEffect(() => {
    const q = customerQuery.trim();
    if (!q) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(() => {
      setCustomerLoading(true);
      void (async () => {
        try {
          const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}&limit=8`);
          const json = (await res.json()) as { customers?: typeof customerResults; error?: string };
          if (!res.ok) throw new Error(json.error ?? "Erreur");
          setCustomerResults(json.customers ?? []);
        } catch {
          setCustomerResults([]);
        } finally {
          setCustomerLoading(false);
        }
      })();
    }, 200);
    return () => clearTimeout(t);
  }, [customerQuery]);

  async function createQuote(andWhatsApp: boolean) {
    setFormError(null);
    setAvailabilityNote(null);
    if (!propertyId || !checkIn || !checkOut) {
      setFormError("Renseignez logement et dates.");
      return;
    }
    if (nights < 1) {
      setFormError("La date de fin doit être après le check-in.");
      return;
    }
    const name = customerQuery.trim();
    const phone = customerPhone.trim();
    if (!customerId && (!name || !phone)) {
      setFormError("Client : recherchez un client ou saisissez nom + téléphone.");
      return;
    }
    if (andWhatsApp) {
      const digits = normalizeWaPhone(phone);
      if (!digits) {
        setFormError("Téléphone requis pour envoyer sur WhatsApp.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          checkIn,
          checkOut,
          guests,
          customerId,
          customerName: customerId ? null : name,
          customerPhone: customerId ? null : phone,
          ...(policyId ? { policyId } : {}),
          ...(promoCode.trim() ? { promoCode: promoCode.trim() } : {}),
          supplementIds: Object.entries(supplementPick)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (res.status === 409) {
        setAvailabilityNote(json.error ?? "Dates indisponibles.");
        setFormError(json.error ?? "Conflit de disponibilité.");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Création impossible.");
      const newId = json.id;
      if (andWhatsApp && newId) {
        const detail = (await fetch(`/api/quotes/${newId}`).then((r) =>
          r.json(),
        )) as { quote?: QuoteListItem };
        const q = detail.quote;
        const waPhone = normalizeWaPhone(customerId ? customerPhone : phone);
        if (q && waPhone) {
          await fetch(`/api/quotes/${newId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "sent" }),
          });
          window.open(
            `https://wa.me/${waPhone}?text=${encodeURIComponent(q.wa_message)}`,
            "_blank",
            "noopener,noreferrer",
          );
          if (customerId) {
            void logOutboundMessage({
              customerId,
              propertyId,
              platform: "whatsapp",
              content: q.wa_message,
            });
          }
        }
      }
      onCreated();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Nouveau devis</h2>
            <p className="text-xs text-gray-400">
              Tarif = nuits × prix + ménage ; si le dynamic pricing est actif, le total est recalculé
              automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="grid gap-1.5 text-xs font-medium text-gray-400">
            Logement
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs font-medium text-gray-400">
              Check-in
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-gray-400">
              Check-out
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-xs font-medium text-gray-400">
            Voyageurs
            <input
              type="number"
              min={1}
              max={50}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-gray-400">
            Politique de réservation
            <select
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              disabled={policies.length === 0}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
              <span className="text-[11px] font-normal text-gray-500">
                Créez une politique dans{" "}
                <Link href="/dashboard/policies" className="text-teal-400 underline">
                  Politiques
                </Link>
                .
              </span>
            )}
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-gray-400">
            Code promo
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="ex. DAKAR20"
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 font-mono text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>

          {supplementCatalog.length > 0 && (
            <div className="grid gap-2 rounded-xl border border-gray-800 bg-gray-950/40 p-3">
              <div className="text-xs font-medium text-gray-400">Suppléments</div>
              <div className="max-h-40 space-y-2 overflow-y-auto">
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

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-gray-400">
              <span>Client</span>
              {customerLoading && <span className="text-gray-500">Recherche…</span>}
            </div>
            <input
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setCustomerId(null);
              }}
              placeholder="Nom (autocomplete)"
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
            {customerResults.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-1">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-teal-500/10"
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerQuery(c.name);
                      setCustomerPhone(c.phone);
                      setCustomerResults([]);
                    }}
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="shrink-0 text-xs text-gray-500">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Téléphone (+225… si nouveau client)"
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Total estimé</span>
              <span className="text-base font-semibold text-teal-200">
                {property ? money(effectiveTotal, property.currency) : "—"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {pricePreview?.active
                ? "Tarification dynamique active."
                : `${nights} nuit${nights > 1 ? "s" : ""} × prix + frais de ménage.`}
            </p>
            {pricePreview?.active && pricePreview.lines.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-teal-500/10 pt-3 text-[11px] leading-snug text-gray-300">
                {pricePreview.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>

          {waPreview && (
            <div className="grid gap-1.5">
              <div className="text-xs font-medium text-gray-400">Aperçu WhatsApp</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs leading-relaxed text-gray-300">
                {waPreview}
              </pre>
            </div>
          )}

          {availabilityNote && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {availabilityNote}
            </div>
          )}
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void createQuote(false)}
              disabled={submitting || !property}
              className="flex-1 rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Créer le devis"}
            </button>
            <button
              type="button"
              onClick={() => void createQuote(true)}
              disabled={submitting || !property}
              className="flex-1 rounded-lg border border-teal-500/50 bg-teal-500/10 py-2.5 text-sm font-semibold text-teal-200 hover:bg-teal-500/20 disabled:opacity-50"
            >
              {submitting ? "…" : "Créer et envoyer WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuoteSidePanel({
  quote,
  onClose,
  onUpdated,
  onDeleted,
}: {
  quote: QuoteListItem;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [patching, setPatching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const cur = quote.property?.currency ?? "XOF";

  async function patchStatus(status: "accepted" | "refused") {
    setPatching(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Échec.");
      await onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setPatching(false);
    }
  }

  async function sendWhatsApp(markSent: boolean) {
    const phone = normalizeWaPhone(quote.customer?.phone ?? "");
    if (!phone) {
      alert("Numéro client manquant.");
      return;
    }
    if (markSent && quote.status === "draft") {
      setPatching(true);
      try {
        const res = await fetch(`/api/quotes/${quote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent" }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Échec.");
        await onUpdated();
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
        setPatching(false);
        return;
      }
      setPatching(false);
    }
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(quote.wa_message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    void logOutboundMessage({
      customerId: quote.customer_id,
      propertyId: quote.property_id,
      platform: "whatsapp",
      content: quote.wa_message,
    });
  }

  async function convertBooking() {
    if (!confirm("Créer la réservation à partir de ce devis accepté ?")) return;
    setConverting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAcceptedQuote: true, quoteId: quote.id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Impossible de créer la réservation.");
      router.push("/dashboard/bookings");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setConverting(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer ce devis ?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Suppression impossible.");
      onDeleted();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  }

  const canWa = quote.status === "draft" || quote.status === "sent";

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-label="Fermer le panneau"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Détail devis</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Client</div>
            <div className="mt-1 font-semibold text-white">{quote.customer?.name ?? "—"}</div>
            <div className="text-gray-400">{quote.customer?.phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Logement</div>
            <div className="mt-1 font-medium text-gray-200">{quote.property?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Check-in</div>
            <div className="mt-1 text-white">{dayLabelFr(quote.check_in)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Check-out</div>
            <div className="mt-1 text-white">{dayLabelFr(quote.check_out)}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">Nuits</div>
              <div className="mt-1 text-white">{quote.nights}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Voyageurs</div>
              <div className="mt-1 text-white">{quote.guests}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="mt-1 text-lg font-semibold text-teal-200">{money(quote.total, cur)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Expire</div>
            <div className="mt-1 text-gray-300">
              {quote.expires_at ? new Date(quote.expires_at).toLocaleString("fr-FR") : "—"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                quoteStatusBadge(quote.status),
              )}
            >
              {quoteStatusLabel(quote.status)}
            </span>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400">Message WhatsApp</div>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-900 p-3 text-xs leading-relaxed text-gray-300">
              {quote.wa_message}
            </pre>
          </div>
        </div>
        <div className="space-y-2 border-t border-gray-800 p-4">
          {canWa && (
            <button
              type="button"
              onClick={() => void sendWhatsApp(quote.status === "draft")}
              disabled={patching}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-teal-400" />
              Envoyer sur WhatsApp
            </button>
          )}
          {quote.status !== "accepted" && quote.status !== "refused" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void patchStatus("accepted")}
                disabled={patching}
                className="rounded-lg bg-emerald-600/90 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Accepté
              </button>
              <button
                type="button"
                onClick={() => void patchStatus("refused")}
                disabled={patching}
                className="rounded-lg border border-red-500/40 bg-red-500/10 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                Refusé
              </button>
            </div>
          )}
          {quote.status === "accepted" && (
            <button
              type="button"
              onClick={() => void convertBooking()}
              disabled={converting}
              className="flex w-full items-center justify-center rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
            >
              {converting ? "Création…" : "Convertir en réservation"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
          >
            <TrashIcon className="h-5 w-5" />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </aside>
    </>
  );
}
