"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";
import HelpICalModal from "@/components/HelpICalModal";

type Channel = {
  id: string;
  property_id: string;
  platform: string;
  ical_url: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  error_count: number;
  created_at: string;
};

type PropertyWithChannels = {
  id: string;
  name: string;
  channels: Channel[];
};

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function platformLabel(p: string) {
  if (p === "airbnb") return "Airbnb";
  if (p === "booking") return "Booking";
  return "Autre";
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "airbnb") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-xs font-bold text-rose-200 ring-1 ring-rose-400/30"
        title="Airbnb"
      >
        A
      </span>
    );
  }
  if (platform === "booking") {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/25 text-xs font-bold text-blue-100 ring-1 ring-blue-400/35"
        title="Booking"
      >
        B
      </span>
    );
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-600/30 text-xs font-bold text-gray-200 ring-1 ring-gray-500/35"
      title="Autre"
    >
      ·
    </span>
  );
}

function statusBadge(ch: Channel) {
  if (!ch.is_active) {
    return { className: "bg-gray-600/20 text-gray-300 ring-1 ring-gray-500/30", label: "Inactif" };
  }
  if (ch.error_count > 0 || (ch.last_error && ch.last_error.length > 0)) {
    return { className: "bg-red-500/15 text-red-200 ring-1 ring-red-400/35", label: "Erreur" };
  }
  return { className: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/35", label: "Actif" };
}

function formatSyncAt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function ChannelsView() {
  const [properties, setProperties] = useState<PropertyWithChannels[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [modalPropertyId, setModalPropertyId] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/channels");
      const json = (await res.json()) as { properties?: PropertyWithChannels[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur chargement.");
      setProperties(json.properties ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncAll() {
    setSyncAllLoading(true);
    setToast(null);
    try {
      const res = await fetch("/api/sync-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        imported?: number;
        cancelled?: number;
        channels?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Échec synchronisation.");
      const parts = [
        `${json.channels ?? 0} canal(aux)`,
        `${json.imported ?? 0} importés`,
        `${json.cancelled ?? 0} annulés`,
      ];
      if (json.errors?.length) parts.push(`${json.errors.length} erreur(s)`);
      setToast(parts.join(" · "));
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncAllLoading(false);
    }
  }

  async function syncOne(channelId: string) {
    setSyncingIds((s) => new Set(s).add(channelId));
    setToast(null);
    try {
      const res = await fetch(`/api/sync-ical?channelId=${encodeURIComponent(channelId)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        imported?: number;
        cancelled?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Échec.");
      setToast(`${json.imported ?? 0} événement(s) importés · ${json.cancelled ?? 0} annulé(s)`);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      void load();
    } finally {
      setSyncingIds((s) => {
        const n = new Set(s);
        n.delete(channelId);
        return n;
      });
    }
  }

  async function deleteChannel(id: string) {
    if (!confirm("Supprimer ce canal et ses événements importés ?")) return;
    try {
      const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Suppression impossible.");
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  const allEmpty =
    properties.length > 0 && properties.every((p) => p.channels.length === 0);

  return (
    <div>
      <PageHeader
        title="Channel Manager"
        description="Connectez les flux iCal Airbnb, Booking ou autres pour alimenter le calendrier Dashify."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 14v-4M10 7v.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Comment synchroniser ?
            </button>
            <button
              type="button"
              onClick={() => void syncAll()}
              disabled={
                syncAllLoading ||
                properties.length === 0 ||
                allEmpty
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-200 hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowPathIcon className={cn("h-5 w-5", syncAllLoading && "animate-spin")} />
              {syncAllLoading ? "Synchronisation…" : "Tout synchroniser"}
            </button>
          </div>
        }
      />

      {toast && (
        <div className="mb-4 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100">
          {toast}
        </div>
      )}

      {properties.length === 0 && !loading && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Aucun logement. Créez-en un dans{" "}
          <Link href="/dashboard/properties" className="font-semibold text-teal-300 underline">
            Logements
          </Link>
          .
        </div>
      )}

      {allEmpty && !loading && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-teal-500/5">
          <div className="grid gap-4 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-500/20 ring-1 ring-teal-400/40">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-teal-300">
                <path
                  d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Synchronisez vos calendriers pour éviter les double-réservations
              </h3>
              <p className="mt-1 text-sm text-gray-300">
                Vos {properties.length} logement{properties.length > 1 ? "s" : ""} n&apos;
                {properties.length > 1 ? "ont" : "a"} pas encore de channel connecté. Liez chacun
                à votre annonce Airbnb et Booking via iCal pour une synchronisation automatique.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M10 14v-4M10 7v.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Comment synchroniser ?
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (
          properties.map((p) => (
            <section
              key={p.id}
              className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40 shadow-sm ring-1 ring-gray-800/50"
            >
              <div className="flex flex-col gap-3 border-b border-gray-800 bg-gray-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-white">{p.name}</h2>
                <button
                  type="button"
                  onClick={() => setModalPropertyId(p.id)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-black hover:bg-teal-400"
                >
                  <PlusIcon className="h-4 w-4" />
                  Ajouter un channel
                </button>
              </div>
              {p.channels.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-8 sm:flex-row sm:justify-center">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-xs font-bold text-rose-300/60 ring-1 ring-rose-400/20">
                      A
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-xs font-bold text-blue-200/60 ring-1 ring-blue-400/20">
                      B
                    </span>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-gray-300">Aucun channel connecté</p>
                    <button
                      type="button"
                      onClick={() => setHelpOpen(true)}
                      className="mt-0.5 text-xs text-teal-400 hover:text-teal-300 hover:underline"
                    >
                      Comment ajouter Airbnb ou Booking ?
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {p.channels.map((ch) => {
                    const badge = statusBadge(ch);
                    const syncing = syncingIds.has(ch.id);
                    return (
                      <li key={ch.id} className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <PlatformIcon platform={ch.platform} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white">{platformLabel(ch.platform)}</span>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  badge.className,
                                )}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="mt-1 truncate font-mono text-xs text-gray-400" title={ch.ical_url}>
                              {ch.ical_url}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span>Dernière sync : {formatSyncAt(ch.last_synced_at)}</span>
                              <span>Erreurs : {ch.error_count}</span>
                              {ch.last_error && (
                                <span className="max-w-full truncate text-red-300/90" title={ch.last_error}>
                                  {ch.last_error}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void syncOne(ch.id)}
                            disabled={syncing}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-semibold text-teal-200 hover:bg-gray-800 disabled:opacity-50"
                          >
                            <ArrowPathIcon className={cn("h-4 w-4", syncing && "animate-spin")} />
                            Sync
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteChannel(ch.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))
        )}
      </div>

      {modalPropertyId && (
        <AddChannelModal
          propertyId={modalPropertyId}
          propertyName={properties.find((x) => x.id === modalPropertyId)?.name ?? ""}
          onClose={() => setModalPropertyId(null)}
          onCreated={() => {
            setModalPropertyId(null);
            void load();
          }}
        />
      )}

      <HelpICalModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function AddChannelModal({
  propertyId,
  propertyName,
  onClose,
  onCreated,
}: {
  propertyId: string;
  propertyName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [platform, setPlatform] = useState<"airbnb" | "booking" | "other">("airbnb");
  const [icalUrl, setIcalUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const instructions =
    platform === "airbnb"
      ? "Airbnb : Calendrier → Disponibilités → Exporter le calendrier"
      : platform === "booking"
        ? "Booking : Extranet → Calendrier → Synchronisation iCal"
        : "Collez l'URL publique du flux .ics (HTTPS recommandé).";

  async function testUrl() {
    setFormError(null);
    setTestResult(null);
    const url = icalUrl.trim();
    if (!url) {
      setFormError("Saisissez une URL.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/channels/test-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        eventCount?: number;
        confirmedCount?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Test impossible.");
      setTestResult(`${json.eventCount ?? 0} événement(s) détecté(s) (${json.confirmedCount ?? 0} actifs).`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  }

  async function submit() {
    setFormError(null);
    const url = icalUrl.trim();
    if (!url) {
      setFormError("URL iCal requise.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, platform, icalUrl: url }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Enregistrement impossible.");
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
            <h2 className="text-lg font-semibold text-white">Ajouter un channel</h2>
            <p className="text-xs text-gray-400">{propertyName}</p>
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
            Plateforme
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as "airbnb" | "booking" | "other");
                setTestResult(null);
              }}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking</option>
              <option value="other">Autre</option>
            </select>
          </label>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-xs leading-relaxed text-gray-400">
            {instructions}
          </div>

          <label className="grid gap-1.5 text-xs font-medium text-gray-400">
            URL iCal
            <input
              value={icalUrl}
              onChange={(e) => {
                setIcalUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://…"
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 font-mono text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>

          <button
            type="button"
            onClick={() => void testUrl()}
            disabled={testing}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
          >
            {testing ? "Test…" : "Tester l'URL"}
          </button>

          {testResult && (
            <div className="rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-2 text-xs text-teal-100">
              {testResult}
            </div>
          )}
          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="w-full rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer le canal"}
          </button>
        </div>
      </div>
    </div>
  );
}