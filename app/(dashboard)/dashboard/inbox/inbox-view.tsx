"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/dashboard/page-header";
import type { ConversationRow } from "@/app/api/inbox/conversations/route";
import { logOutboundMessage } from "@/lib/inbox/log-message";

type PropertyMini = { id: string; name: string };

type Msg = {
  id: string;
  customer_id: string | null;
  property_id: string | null;
  platform: string;
  direction: string;
  content: string;
  is_read: boolean;
  is_note: boolean;
  external_url: string | null;
  created_at: string;
};

type InboxContext = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    source?: string | null;
    notes?: string | null;
  };
  property: { id: string; name: string } | null;
  booking: {
    id: string;
    check_in: string;
    check_out: string;
    status: string;
    total: number;
  } | null;
  quote: {
    id: string;
    check_in: string;
    check_out: string;
    status: string;
    total: number;
  } | null;
};

const OTA_INBOX: Record<string, string> = {
  airbnb: "https://www.airbnb.com/hosting/inbox",
  booking: "https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/messaging/inbox.html",
};

const TEMPLATES = [
  "Bonjour, votre réservation est confirmée ✅",
  "Bonjour, voici votre devis 📋",
  "Bonjour, comment s'est passé votre séjour ? ⭐",
];

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

function platformBadge(platform: string) {
  if (platform === "whatsapp")
    return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/35";
  if (platform === "airbnb")
    return "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35";
  if (platform === "booking")
    return "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/35";
  return "bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30";
}

function platformLabel(p: string) {
  if (p === "whatsapp") return "WhatsApp";
  if (p === "airbnb") return "Airbnb";
  if (p === "booking") return "Booking";
  return "Dashify";
}

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function normalizeWaPhone(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function InboxView({ properties }: { properties: PropertyMini[] }) {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [platformFilter, setPlatformFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [context, setContext] = useState<InboxContext | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "thread">("list");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams();
      if (platformFilter) qs.set("platform", platformFilter);
      if (search.trim()) qs.set("q", search.trim());
      const res = await fetch(`/api/inbox/conversations?${qs.toString()}`);
      const json = (await res.json()) as { conversations?: ConversationRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setConversations(json.conversations ?? []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [platformFilter, search]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openConversation = useCallback(
    async (c: ConversationRow) => {
      setSelected(c);
      setMobileTab("thread");
      setLoadingThread(true);
      try {
        await fetch("/api/messages/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: c.customer_id,
            propertyId: c.property_id,
            platform: c.platform,
          }),
        });
        const qs = new URLSearchParams({
          customerId: c.customer_id,
          platform: c.platform,
        });
        if (c.property_id) qs.set("propertyId", c.property_id);
        const res = await fetch(`/api/inbox/thread?${qs.toString()}`);
        const json = (await res.json()) as { messages?: Msg[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Erreur");
        setMessages(json.messages ?? []);

        const cq = new URLSearchParams({ customerId: c.customer_id });
        if (c.property_id) cq.set("propertyId", c.property_id);
        const ctxRes = await fetch(`/api/inbox/context?${cq.toString()}`);
        const ctxJson = (await ctxRes.json()) as InboxContext & { error?: string };
        if (ctxRes.ok && ctxJson.customer) setContext(ctxJson as InboxContext);
        else setContext(null);
      } catch {
        setMessages([]);
        setContext(null);
      } finally {
        setLoadingThread(false);
        void loadList();
      }
    },
    [loadList],
  );

  const waUrlForCustomer = useMemo(() => {
    const phone = context?.customer?.phone;
    if (!phone) return null;
    const d = normalizeWaPhone(phone);
    return d ? `https://wa.me/${d}` : null;
  }, [context]);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <PageHeader
        title="Boîte de réception"
        description="Historique des envois WhatsApp depuis Dashify et raccourcis vers les messageries Airbnb / Booking."
        actions={
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
          >
            <PlusIcon className="h-5 w-5" />
            Nouveau message
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40 ring-1 ring-gray-800/50 lg:flex-row">
        {/* Liste conversations */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-gray-800 lg:w-[min(100%,280px)] lg:border-r",
            mobileTab === "thread" && "hidden lg:flex",
          )}
        >
          <div className="border-b border-gray-800 p-3 space-y-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher client ou logement…"
              className="h-9 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
            />
            <div className="flex flex-wrap gap-1">
              {["", "whatsapp", "airbnb", "booking", "dashify"].map((pf) => (
                <button
                  key={pf === "" ? "all" : pf}
                  type="button"
                  onClick={() => setPlatformFilter(pf)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    platformFilter === pf
                      ? "bg-teal-500/25 text-teal-200 ring-1 ring-teal-400/40"
                      : "bg-gray-800/80 text-gray-400 hover:bg-gray-800",
                  )}
                >
                  {pf === ""
                    ? "Tous"
                    : pf === "whatsapp"
                      ? "WhatsApp"
                      : pf === "dashify"
                        ? "Dashify"
                        : platformLabel(pf)}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="p-4 text-sm text-gray-500">Chargement…</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Aucune conversation.</p>
            ) : (
              <ul className="divide-y divide-gray-800">
                {conversations.map((c) => {
                  const active = selected?.key === c.key;
                  return (
                    <li key={c.key}>
                      <button
                        type="button"
                        onClick={() => void openConversation(c)}
                        className={cn(
                          "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-800/50",
                          active && "bg-teal-500/5",
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-teal-200 ring-1 ring-gray-700">
                          {initials(c.customer_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate font-medium text-white">{c.customer_name}</span>
                            <span className="shrink-0 text-[10px] text-gray-500">
                              {formatMsgTime(c.last_at)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-gray-500">
                            {c.property_name ?? "Sans logement"}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{c.preview}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                platformBadge(c.platform),
                              )}
                            >
                              {platformLabel(c.platform)}
                            </span>
                            {c.unread > 0 && (
                              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {c.unread > 9 ? "9+" : c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Fil */}
        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col border-gray-800 lg:border-r",
            mobileTab === "list" && "hidden lg:flex",
          )}
        >
          <div className="flex items-center gap-2 border-b border-gray-800 px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab("list")}
              className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800"
              aria-label="Retour"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <span className="truncate text-sm font-medium text-white">
              {selected?.customer_name ?? "Conversation"}
            </span>
          </div>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-gray-500">
              Sélectionnez une conversation.
            </div>
          ) : (
            <>
              <div className="border-b border-gray-800 px-4 py-3">
                <h2 className="text-sm font-semibold text-white">{selected.customer_name}</h2>
                <p className="text-xs text-gray-500">{selected.property_name ?? "Sans logement"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.platform === "whatsapp" && waUrlForCustomer && (
                    <a
                      href={waUrlForCustomer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
                    >
                      Ouvrir dans WhatsApp
                    </a>
                  )}
                  {(selected.platform === "airbnb" || selected.platform === "booking") && (
                    <a
                      href={OTA_INBOX[selected.platform] ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-500/35 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 hover:bg-blue-500/20"
                    >
                      Messagerie {platformLabel(selected.platform)}
                    </a>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {loadingThread ? (
                  <p className="text-sm text-gray-500">Chargement…</p>
                ) : (
                  messages.map((m) => {
                    const outbound = m.direction === "outbound";
                    const note = m.is_note;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex", outbound ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[min(92%,28rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                            note && "border border-amber-500/30 bg-amber-500/10 text-amber-100",
                            !note &&
                              outbound &&
                              "rounded-br-md bg-teal-600/25 text-gray-100 ring-1 ring-teal-500/25",
                            !note &&
                              !outbound &&
                              "rounded-bl-md border border-gray-700 bg-gray-800/90 text-gray-100",
                          )}
                        >
                          {note && (
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400/90">
                              Note interne
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          {m.external_url && (
                            <a
                              href={m.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 block text-xs font-medium text-teal-300 underline"
                            >
                              Ouvrir le lien
                            </a>
                          )}
                          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[10px] text-gray-500">
                            <span>{formatMsgTime(m.created_at)}</span>
                            {!note && (
                              <span className="text-gray-500">
                                {outbound
                                  ? "Envoyé"
                                  : m.is_read
                                    ? "Lu"
                                    : "Reçu"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {selected.platform === "whatsapp" && waUrlForCustomer && (
                <div className="border-t border-gray-800 p-3">
                  <a
                    href={waUrlForCustomer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600/90 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    Répondre sur WhatsApp
                  </a>
                </div>
              )}
            </>
          )}
        </section>

        {/* Fiche */}
        <aside className="hidden w-full shrink-0 flex-col border-gray-800 bg-gray-950/40 lg:flex lg:w-[min(100%,260px)] lg:border-l">
          {!context ? (
            <p className="p-4 text-sm text-gray-500">Sélectionnez une conversation.</p>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto p-4 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client</h3>
              <p className="mt-1 font-semibold text-white">{context.customer.name}</p>
              <p className="text-gray-400">{context.customer.phone}</p>
              <p className="mt-1 text-gray-400">{context.customer.email ?? "—"}</p>

              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Logement
              </h3>
              <p className="mt-1 text-gray-200">{context.property?.name ?? "—"}</p>

              {(context.booking || context.quote) && (
                <>
                  <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Séjour
                  </h3>
                  {context.booking && (
                    <p className="mt-1 text-gray-300">
                      Résa. {context.booking.check_in} → {context.booking.check_out} ·{" "}
                      <span className="capitalize">{context.booking.status}</span>
                    </p>
                  )}
                  {context.quote && (
                    <p className="mt-1 text-gray-300">
                      Devis {context.quote.check_in} → {context.quote.check_out} ·{" "}
                      <span className="capitalize">{context.quote.status}</span>
                    </p>
                  )}
                </>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href={`/dashboard/quotes?new=1&customerId=${encodeURIComponent(context.customer.id)}`}
                  className="rounded-lg border border-gray-700 bg-gray-900 py-2 text-center text-xs font-semibold text-teal-200 hover:bg-gray-800"
                >
                  Envoyer devis
                </Link>
                <Link
                  href={`/dashboard/bookings?customer=${encodeURIComponent(context.customer.id)}`}
                  className="rounded-lg border border-gray-700 bg-gray-900 py-2 text-center text-xs font-semibold text-teal-200 hover:bg-gray-800"
                >
                  Créer réservation
                </Link>
                {waUrlForCustomer && (
                  <a
                    href={waUrlForCustomer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-teal-500 py-2 text-center text-xs font-semibold text-black hover:bg-teal-400"
                  >
                    Ouvrir WhatsApp
                  </a>
                )}
              </div>

              <NoteForm
                customerId={context.customer.id}
                propertyId={selected?.property_id ?? null}
                onSaved={() => {
                  if (selected) void openConversation(selected);
                }}
              />
            </div>
          )}
        </aside>
      </div>

      {newOpen && (
        <NewMessageModal
          properties={properties}
          onClose={() => setNewOpen(false)}
          onSent={() => {
            setNewOpen(false);
            void loadList();
          }}
        />
      )}
    </div>
  );
}

function NoteForm({
  customerId,
  propertyId,
  onSaved,
}: {
  customerId: string;
  propertyId: string | null;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    const t = note.trim();
    if (!t) return;
    setSaving(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId,
          platform: "dashify",
          direction: "outbound",
          content: t,
          is_note: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erreur");
      setNote("");
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mt-6 border-t border-gray-800 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Note manuelle</h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Ajouter une note sur cette conversation…"
        className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !note.trim()}
        className="mt-2 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {saving ? "…" : "Enregistrer la note"}
      </button>
    </div>
  );
}

function NewMessageModal({
  properties,
  onClose,
  onSent,
}: {
  properties: PropertyMini[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [platform, setPlatform] = useState<"whatsapp" | "airbnb" | "booking" | "dashify">("whatsapp");
  const [propertyId, setPropertyId] = useState<string>("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const q = customerQuery.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoadingQ(true);
      void (async () => {
        try {
          const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}&limit=10`);
          const json = (await res.json()) as { customers?: typeof results };
          setResults(json.customers ?? []);
        } catch {
          setResults([]);
        } finally {
          setLoadingQ(false);
        }
      })();
    }, 200);
    return () => clearTimeout(t);
  }, [customerQuery]);

  async function send() {
    setErr(null);
    if (!customerId) {
      setErr("Choisissez un client dans la liste.");
      return;
    }
    const pid = propertyId || null;
    const text = body.trim();
    if (!text) {
      setErr("Saisissez un message.");
      return;
    }
    if (platform === "dashify") {
      setSubmitting(true);
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            propertyId: pid,
            platform: "dashify",
            direction: "outbound",
            content: text,
            is_note: true,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Erreur");
        onSent();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (platform === "whatsapp") {
      const digits = normalizeWaPhone(customerPhone);
      if (!digits) {
        setErr("Téléphone invalide pour WhatsApp.");
        return;
      }
      setSubmitting(true);
      try {
        await logOutboundMessage({
          customerId,
          propertyId: pid,
          platform: "whatsapp",
          content: text,
        });
        window.open(
          `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer",
        );
        onSent();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const url = OTA_INBOX[platform];
    if (!url) {
      setErr("Plateforme non supportée.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId: pid,
          platform,
          direction: "outbound",
          content: text,
          external_url: url,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erreur");
      window.open(url, "_blank", "noopener,noreferrer");
      onSent();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
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
          <h2 className="text-lg font-semibold text-white">Nouveau message</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-800 p-2 text-gray-300 hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Plateforme
            <select
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as "whatsapp" | "airbnb" | "booking" | "dashify")
              }
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking</option>
              <option value="dashify">Dashify (note)</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-gray-400">
            Logement (optionnel)
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">—</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-1">
            <div className="flex justify-between text-xs font-medium text-gray-400">
              <span>Client</span>
              {loadingQ && <span className="text-gray-500">…</span>}
            </div>
            <input
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setCustomerId(null);
              }}
              className="h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="Rechercher…"
            />
            {results.length > 0 && (
              <ul className="max-h-36 overflow-auto rounded-lg border border-gray-800 bg-gray-950 p-1">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col rounded-md px-2 py-2 text-left text-sm hover:bg-teal-500/10"
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerQuery(c.name);
                        setCustomerPhone(c.phone);
                        setResults([]);
                      }}
                    >
                      <span className="font-medium text-white">{c.name}</span>
                      <span className="text-xs text-gray-500">{c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {platform === "whatsapp" && (
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Téléphone (+indicatif)"
                className="mt-2 h-10 rounded-lg border border-gray-800 bg-gray-950 px-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            )}
          </div>

          {platform === "whatsapp" && (
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setBody(tpl)}
                  className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-[11px] text-gray-300 hover:border-teal-500/40 hover:text-teal-200"
                >
                  {tpl.slice(0, 28)}…
                </button>
              ))}
            </div>
          )}

          <label className="grid gap-1 text-xs font-medium text-gray-400">
            {platform === "dashify" ? "Note" : "Message"}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </label>

          {platform === "dashify" && (
            <p className="text-xs text-gray-500">
              Enregistré comme note interne (visible dans le fil avec le badge note).
            </p>
          )}

          {err && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={() => void send()}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
          >
            {platform === "whatsapp" ? (
              <>
                <PaperAirplaneIcon className="h-5 w-5" />
                {submitting ? "…" : "Enregistrer et ouvrir WhatsApp"}
              </>
            ) : platform === "dashify" ? (
              submitting ? "…" : "Enregistrer la note"
            ) : (
              submitting ? "…" : "Enregistrer et ouvrir la messagerie"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
