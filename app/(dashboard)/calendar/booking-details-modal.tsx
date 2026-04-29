"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  XMarkIcon,
  CheckBadgeIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

type BookingDetails = {
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    guests: number;
    total: number;
    status: string;
    source: string;
    nights: number;
    created_at: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  property: {
    id: string;
    name: string;
    cover_image_url: string | null;
    currency: string;
  } | null;
  quote: {
    id: string;
    payment_reference: string | null;
    payment_method_used: string | null;
    payment_confirmed_at: string | null;
    sent_at: string | null;
  } | null;
};

type Props = {
  bookingId: string | null;
  onClose: () => void;
  onCancelled?: () => void;
};

function fromIsoLocal(s: string): Date {
  const parts = s.split("-").map((x) => Number(x));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function formatDate(iso: string): string {
  return fromIsoLocal(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(amount: number, currency: string): string {
  const rounded = Math.round(amount);
  return rounded.toLocaleString("fr-FR") + " " + currency;
}

function paymentMethodLabel(method: string | null): string {
  if (method === "orange_money") return "Orange Money";
  if (method === "wave") return "Wave";
  if (method === "free_money") return "Free Money";
  if (method === "other") return "Autre";
  return "-";
}

type SourceBadge = { label: string; className: string };

function sourceBadge(source: string): SourceBadge {
  if (source === "direct") {
    return {
      label: "Directe (Dashify)",
      className: "bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30",
    };
  }
  if (source === "airbnb") {
    return {
      label: "Airbnb",
      className: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/30",
    };
  }
  if (source === "booking") {
    return {
      label: "Booking.com",
      className: "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/30",
    };
  }
  if (source === "vrbo") {
    return {
      label: "Vrbo",
      className: "bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-400/30",
    };
  }
  if (source === "manual") {
    return {
      label: "Saisie manuelle",
      className: "bg-gray-500/15 text-gray-200 ring-1 ring-gray-400/30",
    };
  }
  return {
    label: source,
    className: "bg-gray-500/15 text-gray-200 ring-1 ring-gray-400/30",
  };
}

function normalizeWaPhone(input: string | null): string {
  if (!input) return "";
  return input.replace(/[^\d]/g, "");
}

export function BookingDetailsModal(props: Props) {
  const bookingId = props.bookingId;
  const onClose = props.onClose;
  const onCancelled = props.onCancelled;

  const [data, setData] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refCopied, setRefCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setConfirmCancel(false);
    setCancelError(null);

    void (async () => {
      try {
        const res = await fetch("/api/bookings/" + bookingId);
        const json = (await res.json()) as BookingDetails & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Erreur chargement.");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookingId, onClose]);

  const copyReference = useCallback(async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const openWhatsApp = useCallback(() => {
    if (!data) return;
    if (!data.customer) return;
    if (!data.customer.phone) return;
    const phone = normalizeWaPhone(data.customer.phone);
    if (!phone) return;
    window.open("https://wa.me/" + phone, "_blank", "noopener,noreferrer");
  }, [data]);

  const handleCancel = useCallback(async () => {
    if (!bookingId) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/bookings/" + bookingId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Erreur lors de l''annulation.");
      }
      if (onCancelled) onCancelled();
      onClose();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
    }
  }, [bookingId, onClose, onCancelled]);

  if (!bookingId) return null;

  const booking = data ? data.booking : null;
  const customer = data ? data.customer : null;
  const property = data ? data.property : null;
  const quote = data ? data.quote : null;
  const currency = property ? property.currency : "XOF";
  const customerPhone = customer ? customer.phone : null;
  const waPhone = customerPhone ? normalizeWaPhone(customerPhone) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-details-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div
        className="relative z-10 max-h-[min(85vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-700/80 bg-gray-900 shadow-2xl shadow-black/50 ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-5 py-4 backdrop-blur">
          <div>
            <div id="booking-details-title" className="text-base font-semibold text-white">
              Détails de la réservation
            </div>
            {booking ? (
              <div className="text-xs text-gray-400">
                {booking.nights} nuit{booking.nights > 1 ? "s" : ""} · {booking.guests} voyageur{booking.guests > 1 ? "s" : ""}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-800"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-5 py-12 text-sm text-gray-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-teal-400" />
            <span className="ml-3">Chargement...</span>
          </div>
        ) : null}

        {error && !loading ? (
          <div className="m-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {data && booking && !loading && !error ? (
          <div className="space-y-4 p-5">
            {property ? (
              <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/40 p-3">
                {property.cover_image_url ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-800">
                    <Image
                      src={property.cover_image_url}
                      alt={property.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-800" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-500">Logement</div>
                  <div className="truncate text-sm font-semibold text-white">{property.name}</div>
                </div>
              </div>
            ) : null}

            {customer ? (
              <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
                <div className="text-xs font-medium text-gray-500">Client</div>
                <div className="mt-1 text-base font-semibold text-white">{customer.name}</div>
                {customer.phone ? (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">Tél. </span>
                    <span className="text-gray-200">{customer.phone}</span>
                  </div>
                ) : null}
                {customer.email ? (
                  <div className="text-xs">
                    <span className="text-gray-500">Email </span>
                    <span className="text-gray-200">{customer.email}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
              <div className="text-xs font-medium text-gray-500">Séjour</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-medium text-gray-500">Check-in</div>
                  <div className="mt-1 text-sm capitalize text-white">{formatDate(booking.check_in)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-gray-500">Check-out</div>
                  <div className="mt-1 text-sm capitalize text-white">{formatDate(booking.check_out)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3">
                <div className="text-xs text-gray-400">
                  {booking.nights} nuit{booking.nights > 1 ? "s" : ""} · {booking.guests} voyageur{booking.guests > 1 ? "s" : ""}
                </div>
                <span
                  className={"inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " + sourceBadge(booking.source).className}
                >
                  {sourceBadge(booking.source).label}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-400">Montant total</div>
                <div className="text-lg font-bold text-teal-200">{money(booking.total, currency)}</div>
              </div>

              {quote ? (
                <div className="mt-3 grid gap-2 border-t border-teal-500/15 pt-3 text-xs">
                  {quote.payment_method_used ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Méthode</span>
                      <span className="text-gray-200">{paymentMethodLabel(quote.payment_method_used)}</span>
                    </div>
                  ) : null}
                  {quote.payment_confirmed_at ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Confirmé le</span>
                      <span className="inline-flex items-center gap-1 text-gray-200">
                        <CheckBadgeIcon className="h-4 w-4 text-teal-400" />
                        {formatDateTime(quote.payment_confirmed_at)}
                      </span>
                    </div>
                  ) : null}
                  {quote.payment_reference ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Référence</span>
                      <button
                        type="button"
                        onClick={() => {
                          const ref = quote.payment_reference;
                          if (ref) void copyReference(ref);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-teal-500/20 bg-teal-500/5 px-2 py-1 font-mono text-[11px] font-semibold text-teal-200 hover:bg-teal-500/10"
                        title="Copier la référence"
                      >
                        {quote.payment_reference}
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                  {refCopied ? <div className="text-[11px] text-teal-300">Référence copiée</div> : null}
                </div>
              ) : (
                <div className="mt-3 border-t border-teal-500/15 pt-3 text-xs text-gray-500">
                  Pas de devis Dashify lié à cette réservation.
                </div>
              )}
            </div>

            <div className="grid gap-2 pt-1">
              {waPhone ? (
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm font-semibold text-gray-100 hover:bg-gray-800"
                >
                  Ouvrir WhatsApp
                </button>
              ) : null}

              {quote ? (
                <Link
                  href={"/dashboard/quotes?id=" + quote.id}
                  className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
                >
                  Voir le devis
                </Link>
              ) : null}

              {booking.status === "confirmed" ? (
                <div className="mt-2 border-t border-gray-800 pt-3">
                  {!confirmCancel ? (
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(true)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                    >
                      Annuler la réservation
                    </button>
                  ) : (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                      <p className="text-sm font-semibold text-red-200">Confirmer l&apos;annulation ?</p>
                      <p className="mt-1 text-xs text-red-300/80">
                        Les dates seront libérées dans le calendrier. Cette action peut être inversée en remettant le statut à confirmé via Supabase.
                      </p>
                      {cancelError ? <p className="mt-2 text-xs text-red-200">{cancelError}</p> : null}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCancel()}
                          disabled={cancelling}
                          className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                        >
                          {cancelling ? "Annulation..." : "Oui, annuler"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmCancel(false);
                            setCancelError(null);
                          }}
                          disabled={cancelling}
                          className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-60"
                        >
                          Garder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {booking.status === "cancelled" ? (
                <div className="rounded-lg border border-gray-700 bg-gray-950/40 px-4 py-2.5 text-center text-xs text-gray-500">
                  Cette réservation est annulée
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}