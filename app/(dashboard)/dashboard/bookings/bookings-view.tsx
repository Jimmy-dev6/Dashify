"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatBubbleLeftRightIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";
import { logOutboundMessage } from "@/lib/inbox/log-message";

type Property = {
  id: string;
  name: string;
  base_price: number;
  cleaning_fee: number;
  currency: string;
};

type BookingListItem = {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total: number;
  status: string;
  created_at: string;
  nights: number;
  customer: { id: string; name: string; phone: string } | null;
  property: { id: string; name: string; currency: string | null } | null; payment_status?: "unpaid" | "partial" | "paid";
};

type Stats = {
  totalBookings: number;
  revenueMonth: number;
  occupancyPct: number;
  daysInMonth: number;
  propertyCountUsed: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function fromIsoLocal(s: string) {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dayLabel(iso: string) {
  return fromIsoLocal(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function money(amount: number, currency = "XOF") {
  return `${Math.round(amount).toLocaleString("fr-FR")} ${currency}`;
}

function normalizeWaPhone(input: string) {
  return input.replace(/[^\d]/g, "");
}

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function statusBadge(status: string) {
  if (status === "cancelled") {
    return "bg-red-500/15 text-red-200 ring-1 ring-red-400/35";
  }
  if (status === "completed") {
    return "bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30";
  }
  return "bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/35";
}

function statusLabel(status: string) {
  if (status === "cancelled") return "Annulée";
  if (status === "completed") return "Terminée";
  return "Confirmée";
}

export function BookingsView({
  properties,
  prefillCustomerId,
}: {
  properties: Property[];
  prefillCustomerId?: string | null;
}) {
  const [month, setMonth] = useState(currentMonthKey);
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newBookingCustomer, setNewBookingCustomer] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

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
          setNewBookingCustomer({
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

  const selected = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ month });
      if (propertyId) qs.set("propertyId", propertyId);
      if (status) qs.set("status", status);
      const res = await fetch(`/api/bookings?${qs.toString()}`);
      const json = (await res.json()) as {
        bookings?: BookingListItem[];
        stats?: Stats;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Erreur chargement.");
      setBookings(json.bookings ?? []);
      setStats(json.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBookings([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [month, propertyId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Réservations"
        description="Suivez vos séjours, revenus et taux d’occupation par mois."
        actions={
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={properties.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
            Nouvelle réservation
          </button>
        }
      />

      {properties.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Ajoutez au moins un logement dans{" "}
          <Link href="/dashboard/properties" className="font-semibold text-teal-300 underline">
            Logements
          </Link>{" "}
          pour créer des réservations.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Réservations (mois)
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : stats?.totalBookings ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-teal-500/15">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Revenus (mois)
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-200">
            {loading ? "—" : money(stats?.revenueMonth ?? 0, "XOF")}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Somme des totaux (confirmées / terminées).</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Taux d’occupation
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : `${stats?.occupancyPct ?? 0} %`}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Nuits réservées / ({stats?.daysInMonth ?? "—"} j ×{" "}
            {stats?.propertyCountUsed ?? 1} logement{(stats?.propertyCountUsed ?? 1) > 1 ? "s" : ""}).
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="grid gap-1 text-xs font-medium text-gray-400">
          Mois
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
          />
        </label>
        <label className="grid min-w-[12rem] flex-1 gap-1 text-xs font-medium text-gray-400">
          Logement
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
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
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
          >
            <option value="">Tous</option>
            <option value="confirmed">Confirmée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && bookings.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-10 text-center">
          <p className="text-sm font-medium text-gray-200">Aucune réservation</p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Aucun séjour ne correspond à ce mois et ces filtres. Créez une réservation ou changez de période.
          </p>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            disabled={properties.length === 0}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
            Nouvelle réservation
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-200">
                {bookings.map((b) => {
                  return (
                    <tr
                      key={b.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-gray-800/40",
                        selectedId === b.id && "bg-teal-500/5",
                      )}
                      onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {b.customer?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{b.property?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {dayLabel(b.check_in)} → {dayLabel(b.check_out)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-gray-300">{b.nights}</td>
                      <td className="px-4 py-3 text-right font-medium text-white tabular-nums">
                        {money(Number(b.total ?? 0), "XOF")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            statusBadge(b.status),
                          )}
                        >
                          {statusLabel(b.status)}
                        </span>
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
        <BookingSidePanel
          booking={selected}
          onClose={() => setSelectedId(null)}
          onCancelled={() => {
            setSelectedId(null);
            void load();
          }}
        />
      )}

      {newOpen && (
        <NewBookingModal
          properties={properties}
          initialCustomer={newBookingCustomer}
          onClose={() => {
            setNewOpen(false);
            setNewBookingCustomer(null);
          }}
          onCreated={() => {
            setNewOpen(false);
            setNewBookingCustomer(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function BookingSidePanel({
  booking,
  onClose,
  onCancelled,
}: {
  booking: BookingListItem;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const cur = booking.property?.currency ?? "XOF";

  const waText = useMemo(() => {
    const name = booking.customer?.name ?? "client";
    const prop = booking.property?.name ?? "votre logement";
    const total = `${Math.round(Number(booking.total ?? 0)).toLocaleString("fr-FR")} XOF`;
    return [
      `Bonjour ${name}, votre réservation pour ${prop} est confirmée !`,
      `📅 Du ${dayLabel(booking.check_in)} au ${dayLabel(booking.check_out)}`,
      `👥 ${booking.guests} voyageurs`,
      `💰 Total : ${total}`,
      `À très bientôt !`,
    ].join("\n");
  }, [booking]);

  async function cancelBooking() {
    if (!confirm("Annuler cette réservation ? Le calendrier sera mis à jour.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Échec annulation.");
      onCancelled();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
    }
  }

  function sendWhatsApp() {
    const phone = normalizeWaPhone(booking.customer?.phone ?? "");
    if (!phone) {
      alert("Numéro client manquant.");
      return;
    }
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(waText)}`,
      "_blank",
      "noopener,noreferrer",
    );
    const cid = booking.customer?.id;
    const pid = booking.property?.id ?? null;
    if (cid) {
      void logOutboundMessage({
        customerId: cid,
        propertyId: pid,
        platform: "whatsapp",
        content: waText,
      });
    }
  }

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
          <h2 className="text-lg font-semibold text-white">Détail réservation</h2>
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
            <div className="mt-1 font-semibold text-white">{booking.customer?.name ?? "—"}</div>
            <div className="text-gray-400">{booking.customer?.phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Logement</div>
            <div className="mt-1 font-medium text-gray-200">{booking.property?.name ?? "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">Check-in</div>
              <div className="mt-1 text-white">{dayLabel(booking.check_in)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Check-out</div>
              <div className="mt-1 text-white">{dayLabel(booking.check_out)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">Nuits</div>
              <div className="mt-1 text-white">{booking.nights}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Voyageurs</div>
              <div className="mt-1 text-white">{booking.guests}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="mt-1 text-lg font-semibold text-teal-200">
              {money(Number(booking.total ?? 0), cur)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                statusBadge(booking.status),
              )}
            >
              {statusLabel(booking.status)}
            </span>
          </div>
        </div>
        <div className="space-y-2 border-t border-gray-800 p-4">
          <button
            type="button"
            {booking.payment_status !== "paid" && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/payment/init", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        bookingId: booking.id,
                        amount: booking.total,
                        customerName: booking.customer?.name || "Client",
                        customerEmail: "",
                        customerPhone: booking.customer?.phone || "",
                      }),
                    });
                    const data = await res.json();
                    if (data.paymentUrl) {
                      window.open(data.paymentUrl, "_blank");
                    } else {
                      alert("Erreur: " + (data.error || "Paiement indisponible"));
                    }
                  } catch (e) {
                    alert("Erreur paiement");
                  }
                }}
                className="rounded-lg bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-400 ring-1 ring-teal-500/20 hover:bg-teal-500/20"
              >
                Payer
              </button>
            )}
            onClick={sendWhatsApp}
            disabled={booking.status === "cancelled"}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800",
              booking.status === "cancelled" && "cursor-not-allowed opacity-50",
            )}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-teal-400" />
            Envoyer confirmation WhatsApp
          </button>
          <button
            type="button"
            onClick={cancelBooking}
            disabled={booking.status === "cancelled" || cancelling}
            className={cn(
              "flex w-full items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/20",
              (booking.status === "cancelled" || cancelling) && "cursor-not-allowed opacity-50",
            )}
          >
            {cancelling ? "Annulation…" : "Annuler la réservation"}
          </button>
        </div>
      </aside>
    </>
  );
}

function NewBookingModal({
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

  useEffect(() => {
    if (!initialCustomer) return;
    setCustomerId(initialCustomer.id);
    setCustomerQuery(initialCustomer.name);
    setCustomerPhone(initialCustomer.phone);
    setCustomerResults([]);
  }, [initialCustomer]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) return 0;
    const a = fromIsoLocal(checkIn);
    const b = fromIsoLocal(checkOut);
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
  }, [checkIn, checkOut]);

  const computedTotal = useMemo(() => {
    if (!property) return 0;
    return nights * Number(property.base_price ?? 0) + Number(property.cleaning_fee ?? 0);
  }, [nights, property]);

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

  async function submit() {
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
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
          total: computedTotal,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; conflicts?: unknown };
      if (res.status === 409) {
        setAvailabilityNote(json.error ?? "Dates indisponibles.");
        setFormError(json.error ?? "Conflit de disponibilité.");
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Création impossible.");
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
            <h2 className="text-lg font-semibold text-white">Nouvelle réservation</h2>
            <p className="text-xs text-gray-400">Vérification des disponibilités avant enregistrement.</p>
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
              placeholder="Nom (autocomplete ou saisie libre)"
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
              placeholder="Téléphone (obligatoire si nouveau client)"
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Total estimé</span>
              <span className="text-base font-semibold text-teal-200">
                {property ? money(computedTotal, property.currency) : "—"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {nights} nuit{nights > 1 ? "s" : ""} × prix + frais de ménage. Un événement{" "}
              <span className="text-teal-400/90">Dashify</span> est ajouté au calendrier automatiquement après
              création.
            </p>
          </div>

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

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !property}
            className="w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Créer la réservation"}
          </button>
        </div>
      </div>
    </div>
  );
}
