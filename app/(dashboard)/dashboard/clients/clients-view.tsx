"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  booking_count: number;
  total_spent_xof: number;
  last_booking_at: string | null;
};

type SortKey = "name" | "last_booking" | "total_spent";

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function normalizeWaPhone(input: string) {
  return input.replace(/[^\d]/g, "");
}

function moneyXof(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} XOF`;
}

function sourceLabel(s: string) {
  if (s === "airbnb") return "Airbnb";
  if (s === "booking") return "Booking";
  return "Direct";
}

function sourceBadge(s: string) {
  if (s === "airbnb") {
    return "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/35";
  }
  if (s === "booking") {
    return "bg-purple-500/15 text-purple-100 ring-1 ring-purple-400/35";
  }
  return "bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/35";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function quoteStatusFr(s: string) {
  const m: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyé",
    accepted: "Accepté",
    refused: "Refusé",
    expired: "Expiré",
  };
  return m[s] ?? s;
}

function isValidInternationalPhone(phone: string) {
  const t = phone.trim();
  if (!t.startsWith("+")) return false;
  const digits = t.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (!/^[1-9]/.test(digits)) return false;
  return /^\+[\d\s-]{9,}$/.test(t);
}

type Stats = {
  totalClients: number;
  clientsThisMonth: number;
  totalRevenueClients: number;
};

export function ClientsView() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelData, setPanelData] = useState<{
    customer: Record<string, unknown>;
    bookings: unknown[];
    quotes: unknown[];
    totalSpentXof: number;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        sort,
        order,
        q: debouncedQ,
      });
      const res = await fetch(`/api/clients?${qs.toString()}`);
      const json = (await res.json()) as {
        clients?: ClientRow[];
        stats?: Stats;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Erreur chargement.");
      setClients(json.clients ?? []);
      setStats(json.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setClients([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, sort, order]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setPanelData(null);
      return;
    }
    let cancelled = false;
    setPanelLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/clients/${selectedId}`);
        const json = (await res.json()) as {
          customer?: Record<string, unknown>;
          bookings?: unknown[];
          quotes?: unknown[];
          totalSpentXof?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Erreur.");
        if (!cancelled) {
          setPanelData({
            customer: json.customer ?? {},
            bookings: json.bookings ?? [],
            quotes: json.quotes ?? [],
            totalSpentXof: json.totalSpentXof ?? 0,
          });
        }
      } catch {
        if (!cancelled) setPanelData(null);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function toggleSort(key: SortKey) {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Centralisez vos contacts, sources et historique réservations / devis."
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau client
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total clients
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : stats?.totalClients ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-teal-500/15">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Nouveaux ce mois
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-200">
            {loading ? "—" : stats?.clientsThisMonth ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 ring-1 ring-gray-800/60">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Revenu total (réservations)
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? "—" : moneyXof(stats?.totalRevenueClients ?? 0)}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Somme des totaux (hors annulées).</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom, téléphone ou e-mail…"
          className="h-10 w-full max-w-md rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2 sm:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500">Trier :</span>
          <button
            type="button"
            onClick={() => toggleSort("name")}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 font-semibold",
              sort === "name"
                ? "border-teal-500/40 bg-teal-500/10 text-teal-200"
                : "border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800",
            )}
          >
            Nom {sort === "name" && (order === "asc" ? "↑" : "↓")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("last_booking")}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 font-semibold",
              sort === "last_booking"
                ? "border-teal-500/40 bg-teal-500/10 text-teal-200"
                : "border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800",
            )}
          >
            Dernière résa. {sort === "last_booking" && (order === "asc" ? "↑" : "↓")}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("total_spent")}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 font-semibold",
              sort === "total_spent"
                ? "border-teal-500/40 bg-teal-500/10 text-teal-200"
                : "border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800",
            )}
          >
            Montant total {sort === "total_spent" && (order === "asc" ? "↑" : "↓")}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1.5 font-semibold text-gray-300 hover:bg-gray-800"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && clients.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-10 text-center">
          <p className="text-sm font-medium text-gray-200">Aucun client</p>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            Aucun contact ne correspond à votre recherche, ou vous n’avez pas encore ajouté de clients.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setModalOpen(true);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau client
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <article
              key={c.id}
              className={cn(
                "flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 p-5 shadow-sm ring-1 ring-gray-800/50 transition-colors",
                selectedId === c.id && "ring-teal-500/40",
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                className="text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      sourceBadge(c.source ?? "direct"),
                    )}
                  >
                    {sourceLabel(c.source ?? "direct")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{c.phone}</p>
                <p className="text-sm text-gray-500">{c.email || "—"}</p>
              </button>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  <dt className="text-gray-500">Réservations</dt>
                  <dd className="font-semibold text-gray-200">{c.booking_count}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total dépensé</dt>
                  <dd className="font-semibold text-teal-200">{moneyXof(c.total_spent_xof)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Dernière réservation</dt>
                  <dd className="font-medium text-gray-200">
                    {formatDate(c.last_booking_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-800 pt-4">
                <a
                  href={
                    normalizeWaPhone(c.phone)
                      ? `https://wa.me/${normalizeWaPhone(c.phone)}`
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-semibold text-teal-200 hover:bg-teal-500/20",
                    !normalizeWaPhone(c.phone) && "pointer-events-none opacity-40",
                  )}
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(c.id);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Éditer
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Supprimer ${c.name} ?`)) return;
                    try {
                      const res = await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
                      const json = (await res.json()) as { ok?: boolean; error?: string };
                      if (!res.ok || !json.ok) {
                        throw new Error(json.error ?? "Suppression impossible.");
                      }
                      if (selectedId === c.id) setSelectedId(null);
                      void load();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <ClientFormModal
          clientId={editingId}
          onClose={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingId(null);
            void load();
          }}
        />
      )}

      {selectedId && (
        <ClientSidePanel
          loading={panelLoading}
          data={panelData}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function ClientFormModal({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<"airbnb" | "booking" | "direct">("direct");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(!!clientId);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setName("");
      setPhone("");
      setEmail("");
      setSource("direct");
      setNotes("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        const json = (await res.json()) as { customer?: Record<string, string | null> };
        const c = json.customer;
        if (!cancelled && c) {
          setName(c.name ?? "");
          setPhone(c.phone ?? "");
          setEmail(c.email ?? "");
          setSource((c.source as "airbnb" | "booking" | "direct") || "direct");
          setNotes(c.notes ?? "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function submit() {
    setErr(null);
    if (!name.trim()) {
      setErr("Le nom est obligatoire.");
      return;
    }
    if (!isValidInternationalPhone(phone)) {
      setErr("Téléphone : format international requis (ex: +2250700000000).");
      return;
    }
    setSaving(true);
    try {
      if (clientId) {
        const res = await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            source,
            notes: notes.trim() || null,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Erreur.");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            source,
            notes: notes.trim() || null,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Erreur.");
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Fermer" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl ring-1 ring-teal-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            {clientId ? "Modifier le client" : "Nouveau client"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {loading ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : (
            <>
              <label className="grid gap-1 text-xs font-medium text-gray-400">
                Nom <span className="text-teal-400">*</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-gray-400">
                Téléphone (international) <span className="text-teal-400">*</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2250700000000"
                  className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-gray-400">
                E-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-gray-400">
                Source
                <select
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value as "airbnb" | "booking" | "direct")
                  }
                  className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="direct">Direct</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-gray-400">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </label>
              {err && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {err}
                </div>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientSidePanel({
  loading,
  data,
  onClose,
}: {
  loading: boolean;
  data: {
    customer: Record<string, unknown>;
    bookings: unknown[];
    quotes: unknown[];
    totalSpentXof: number;
  } | null;
  onClose: () => void;
}) {
  const c = data?.customer;
  const id = (c?.id as string) ?? "";
  const wa = normalizeWaPhone(String(c?.phone ?? ""));

  const bookings = (data?.bookings ?? []) as Array<{
    id: string;
    check_in: string;
    check_out: string;
    total: number;
    status: string;
    property?: { name?: string } | null;
  }>;

  const quotes = (data?.quotes ?? []) as Array<{
    id: string;
    check_in: string;
    check_out: string;
    total: number;
    status: string;
    created_at: string;
  }>;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Fiche client</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {loading ? (
            <p className="text-gray-400">Chargement…</p>
          ) : !c ? (
            <p className="text-gray-400">Impossible de charger ce client.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white">{String(c.name)}</h3>
                  <p className="text-gray-400">{String(c.phone)}</p>
                  <p className="text-gray-500">{c.email ? String(c.email) : "—"}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    sourceBadge(String(c.source ?? "direct")),
                  )}
                >
                  {sourceLabel(String(c.source ?? "direct"))}
                </span>
              </div>
              {c.notes ? (
                <p className="mt-4 rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-gray-300">
                  {String(c.notes)}
                </p>
              ) : null}

              <div className="mt-6 rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
                <div className="text-xs text-gray-500">Total dépensé (réservations)</div>
                <div className="mt-1 text-xl font-bold text-teal-200">
                  {moneyXof(data?.totalSpentXof ?? 0)}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Réservations
                </h4>
                {bookings.length === 0 ? (
                  <p className="text-xs text-gray-500">Aucune réservation.</p>
                ) : (
                  <ul className="space-y-2">
                    {bookings.map((b) => (
                      <li
                        key={b.id}
                        className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-200">
                            {formatDate(b.check_in)} → {formatDate(b.check_out)}
                          </span>
                          <span className="shrink-0 font-medium text-white">
                            {moneyXof(Number(b.total ?? 0))}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {(b.property as { name?: string } | undefined)?.name ?? "—"} ·{" "}
                          {b.status === "cancelled" ? "Annulée" : b.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Devis
                </h4>
                {quotes.length === 0 ? (
                  <p className="text-xs text-gray-500">Aucun devis.</p>
                ) : (
                  <ul className="space-y-2">
                    {quotes.map((q) => (
                      <li key={q.id}>
                        <Link
                          href={`/dashboard/quotes?quote=${encodeURIComponent(String(q.id))}`}
                          className="block rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 hover:border-teal-500/30"
                        >
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-200">
                              {formatDate(q.check_in)} → {formatDate(q.check_out)}
                            </span>
                            <span className="text-xs font-medium text-teal-200">
                              {quoteStatusFr(q.status)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {moneyXof(Number(q.total ?? 0))}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
        <div className="space-y-2 border-t border-gray-800 p-4">
          <Link
            href={`/dashboard/bookings?customer=${id}`}
            className="flex w-full items-center justify-center rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
          >
            Nouvelle réservation
          </Link>
          <Link
            href={`/dashboard/quotes?new=1&customerId=${encodeURIComponent(id)}`}
            className="flex w-full items-center justify-center rounded-lg border border-gray-700 bg-gray-900 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800"
          >
            Nouveau devis
          </Link>
          <a
            href={wa ? `https://wa.me/${wa}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/30 bg-teal-500/10 py-2.5 text-sm font-semibold text-teal-200 hover:bg-teal-500/20",
              !wa && "pointer-events-none opacity-40",
            )}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            WhatsApp
          </a>
        </div>
      </aside>
    </>
  );
}
