"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import type { ProfileRow } from "@/lib/profile/types";
import { PROFILE_DEFAULTS } from "@/lib/profile/types";

const TIMEZONES = [
  "Africa/Dakar",
  "Africa/Abidjan",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function inputClass() {
  return cn(
    "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white",
    "placeholder:text-gray-500 focus:border-teal-500/60 focus:outline-none focus:ring-1 focus:ring-teal-500/40",
  );
}

function labelClass() {
  return "block text-xs font-medium uppercase tracking-wide text-gray-400";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/35 shadow-sm shadow-black/20">
      <div className="border-b border-gray-800/80 px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-400">{description}</p> : null}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
        checked
          ? "border-teal-500/50 bg-teal-600/40"
          : "border-gray-600 bg-gray-800",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// Affiche "778696339" en "+221 77 869 63 39" pour l'input
function formatMobileNumberDisplay(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+221 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return raw;
}

function mergeLoaded(row: ProfileRow | null, emailFromApi: string) {
  const base: ProfileRow = row?.id
    ? { ...PROFILE_DEFAULTS, ...row, id: row.id }
    : {
        id: "",
        ...PROFILE_DEFAULTS,
      };
  return { profile: base, email: emailFromApi };
}

export function SettingsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "logo" | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("XOF");
  const [defaultLanguage, setDefaultLanguage] = useState("fr");
  const [quoteValidityHours, setQuoteValidityHours] = useState(48);
  const [timezone, setTimezone] = useState("Africa/Dakar");
  const [notifyNewBooking, setNotifyNewBooking] = useState(true);
  const [notifyQuoteExpired, setNotifyQuoteExpired] = useState(true);
  const [notifyIcalError, setNotifyIcalError] = useState(true);

  // Config paiement (Phase 2)
  const [paymentOrangeMoney, setPaymentOrangeMoney] = useState("");
  const [paymentWave, setPaymentWave] = useState("");
  const [paymentFreeMoney, setPaymentFreeMoney] = useState("");
  const [paymentHolderName, setPaymentHolderName] = useState("");
  const [paymentInstructionsExtra, setPaymentInstructionsExtra] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const res = await fetch("/api/profile");
      const json = (await res.json()) as { error?: string; email?: string; profile?: ProfileRow };
      if (!res.ok) throw new Error(json.error ?? "Erreur chargement");
      const { profile, email: em } = mergeLoaded(json.profile ?? null, json.email ?? "");
      setEmail(em);
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatarUrl(profile.avatar_url);
      setCompanyName(profile.company_name ?? "");
      setCompanyLogo(profile.company_logo);
      setAddress(profile.address ?? "");
      setCity(profile.city ?? "");
      setCountry(profile.country ?? PROFILE_DEFAULTS.country ?? "");
      setWebsite(profile.website ?? "");
      setDefaultCurrency(profile.default_currency ?? "XOF");
      setDefaultLanguage(profile.default_language ?? "fr");
      setQuoteValidityHours(profile.quote_validity_hours ?? 48);
      setTimezone(profile.timezone ?? "Africa/Dakar");
      setNotifyNewBooking(profile.notify_new_booking ?? true);
      setNotifyQuoteExpired(profile.notify_quote_expired ?? true);
      setNotifyIcalError(profile.notify_ical_error ?? true);
      // Config paiement
      setPaymentOrangeMoney(formatMobileNumberDisplay(profile.payment_orange_money));
      setPaymentWave(formatMobileNumberDisplay(profile.payment_wave));
      setPaymentFreeMoney(formatMobileNumberDisplay(profile.payment_free_money));
      setPaymentHolderName(profile.payment_holder_name ?? "");
      setPaymentInstructionsExtra(profile.payment_instructions_extra ?? "");
    } catch (e) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName || null,
          phone: phone || null,
          avatar_url: avatarUrl,
          company_name: companyName || null,
          company_logo: companyLogo,
          address: address || null,
          city: city || null,
          country: country || null,
          website: website || null,
          default_currency: defaultCurrency,
          default_language: defaultLanguage,
          quote_validity_hours: quoteValidityHours,
          timezone,
          notify_new_booking: notifyNewBooking,
          notify_quote_expired: notifyQuoteExpired,
          notify_ical_error: notifyIcalError,
          // Config paiement
          payment_orange_money: paymentOrangeMoney || null,
          payment_wave: paymentWave || null,
          payment_free_money: paymentFreeMoney || null,
          payment_holder_name: paymentHolderName || null,
          payment_instructions_extra: paymentInstructionsExtra || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur enregistrement");
      setBanner({ type: "ok", text: "Paramètres enregistrés." });
      // Recharge pour réafficher les numéros normalisés+formatés
      await load();
      router.refresh();
    } catch (e) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(kind: "avatar" | "company_logo", file: File) {
    setUploading(kind === "avatar" ? "avatar" : "logo");
    setBanner(null);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/profile/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string; publicUrl?: string; field?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload échoué");
      if (json.field === "company_logo") setCompanyLogo(json.publicUrl ?? null);
      if (json.field === "avatar_url") setAvatarUrl(json.publicUrl ?? null);
      setBanner({ type: "ok", text: "Image mise à jour." });
      router.refresh();
    } catch (e) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Erreur upload" });
    } finally {
      setUploading(null);
    }
  }

  async function requestPasswordReset() {
    setBanner(null);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST" });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setBanner({ type: "ok", text: json.message ?? "Email envoyé." });
    } catch (e) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Erreur" });
    }
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  async function deleteAccount() {
    const msg =
      "Suppression définitive : toutes vos données Dashify liées à ce compte seront perdues. Continuer ?";
    if (!confirm(msg)) return;
    if (!confirm("Confirmer une dernière fois la suppression du compte ?")) return;
    setBanner(null);
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur suppression");
      router.push("/auth/login");
    } catch (e) {
      setBanner({ type: "err", text: e instanceof Error ? e.message : "Erreur" });
    }
  }

  const atLeastOnePaymentMethod =
    paymentOrangeMoney.trim() !== "" ||
    paymentWave.trim() !== "" ||
    paymentFreeMoney.trim() !== "";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-400">
        Chargement…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-16 md:px-6">
      <PageHeader
        title="Paramètres"
        description="Compte, entreprise, paiement, préférences et sécurité."
      />

      {banner ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            banner.type === "ok"
              ? "border-teal-500/30 bg-teal-500/10 text-teal-100"
              : "border-red-500/30 bg-red-500/10 text-red-100",
          )}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="space-y-6">
        <Section
          title="Mon profil"
          description="Vos informations personnelles et votre photo."
        >
          <div>
            <label className={labelClass()} htmlFor="fullName">
              Nom complet
            </label>
            <input
              id="fullName"
              className={cn(inputClass(), "mt-1.5")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={cn(inputClass(), "mt-1.5 cursor-not-allowed opacity-80")}
              value={email}
              readOnly
            />
            <p className="mt-1 text-xs text-gray-500">Fourni par Supabase Auth (lecture seule).</p>
          </div>
          <div>
            <label className={labelClass()} htmlFor="phone">
              Téléphone WhatsApp
            </label>
            <input
              id="phone"
              className={cn(inputClass(), "mt-1.5")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+221 …"
              autoComplete="tel"
            />
            <p className="mt-1 text-xs text-gray-500">Utilisé pour les notifications importantes.</p>
          </div>
          <div>
            <span className={labelClass()}>Photo de profil</span>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">
                    —
                  </div>
                )}
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-sm font-medium text-teal-200 hover:bg-teal-500/20">
                  {uploading === "avatar" ? "Envoi…" : "Choisir une image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadFile("avatar", f);
                  }}
                />
              </label>
            </div>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-gray-950 shadow hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Sauvegarder"}
            </button>
          </div>
        </Section>

        <Section
          title="Mon entreprise"
          description="Ces informations sont incluses dans les messages de devis WhatsApp et vos documents."
        >
          <div>
            <label className={labelClass()} htmlFor="companyName">
              Nom de l’entreprise / marque
            </label>
            <input
              id="companyName"
              className={cn(inputClass(), "mt-1.5")}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <span className={labelClass()}>Logo</span>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-950">
                {companyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={companyLogo} alt="" className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <span className="text-xs text-gray-500">Aucun logo</span>
                )}
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex rounded-lg border border-gray-600 bg-gray-800/80 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
                  {uploading === "logo" ? "Envoi…" : "Importer le logo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadFile("company_logo", f);
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label className={labelClass()} htmlFor="address">
              Adresse
            </label>
            <textarea
              id="address"
              rows={2}
              className={cn(inputClass(), "mt-1.5 resize-y")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass()} htmlFor="city">
                Ville
              </label>
              <input
                id="city"
                className={cn(inputClass(), "mt-1.5")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor="country">
                Pays
              </label>
              <input
                id="country"
                className={cn(inputClass(), "mt-1.5")}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass()} htmlFor="website">
              Site web
            </label>
            <input
              id="website"
              className={cn(inputClass(), "mt-1.5")}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </div>
        </Section>

        {/* ====== NOUVELLE SECTION PAIEMENT (Phase 2) ====== */}
        <Section
          title="Paiement"
          description="Les numéros mobile money où tes clients t'envoient l'argent. Au moins un moyen est requis pour envoyer des devis."
        >
          {!atLeastOnePaymentMethod ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              ⚠️ Aucun moyen de paiement configuré. Tu ne pourras pas envoyer de devis tant qu'au
              moins un numéro (OM, Wave ou Free Money) n'est pas renseigné.
            </div>
          ) : null}

          <div>
            <label className={labelClass()} htmlFor="paymentOrangeMoney">
              Orange Money
            </label>
            <input
              id="paymentOrangeMoney"
              className={cn(inputClass(), "mt-1.5")}
              value={paymentOrangeMoney}
              onChange={(e) => setPaymentOrangeMoney(e.target.value)}
              placeholder="+221 77 869 63 39"
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-gray-500">
              Numéro sur lequel tu reçois tes paiements Orange Money.
            </p>
          </div>

          <div>
            <label className={labelClass()} htmlFor="paymentWave">
              Wave
            </label>
            <input
              id="paymentWave"
              className={cn(inputClass(), "mt-1.5")}
              value={paymentWave}
              onChange={(e) => setPaymentWave(e.target.value)}
              placeholder="+221 77 869 63 39"
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-gray-500">Numéro Wave (optionnel).</p>
          </div>

          <div>
            <label className={labelClass()} htmlFor="paymentFreeMoney">
              Free Money
            </label>
            <input
              id="paymentFreeMoney"
              className={cn(inputClass(), "mt-1.5")}
              value={paymentFreeMoney}
              onChange={(e) => setPaymentFreeMoney(e.target.value)}
              placeholder="+221 76 123 45 67"
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-gray-500">Numéro Free Money (optionnel).</p>
          </div>

          <div>
            <label className={labelClass()} htmlFor="paymentHolderName">
              Nom du titulaire
            </label>
            <input
              id="paymentHolderName"
              className={cn(inputClass(), "mt-1.5")}
              value={paymentHolderName}
              onChange={(e) => setPaymentHolderName(e.target.value)}
              placeholder="Ex. Jimmy Khater"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-gray-500">
              Nom qui apparaît quand le client tape ton numéro dans son app mobile money. Important
              pour la confiance.
            </p>
          </div>

          <div>
            <label className={labelClass()} htmlFor="paymentInstructionsExtra">
              Instructions supplémentaires (optionnel)
            </label>
            <textarea
              id="paymentInstructionsExtra"
              rows={2}
              className={cn(inputClass(), "mt-1.5 resize-y")}
              value={paymentInstructionsExtra}
              onChange={(e) => setPaymentInstructionsExtra(e.target.value)}
              placeholder="Ex. Envoie-moi un SMS après ton paiement 🙏"
              maxLength={200}
            />
            <p className="mt-1 text-xs text-gray-500">
              {paymentInstructionsExtra.length}/200 — affiché sur la page de paiement du client.
            </p>
          </div>
        </Section>
        {/* ====== FIN SECTION PAIEMENT ====== */}

        <Section title="Préférences" description="Valeurs par défaut pour l’application.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass()} htmlFor="currency">
                Devise par défaut
              </label>
              <select
                id="currency"
                className={cn(inputClass(), "mt-1.5")}
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
              >
                <option value="XOF">XOF — Franc CFA</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dollar</option>
              </select>
            </div>
            <div>
              <label className={labelClass()} htmlFor="language">
                Langue
              </label>
              <select
                id="language"
                className={cn(inputClass(), "mt-1.5")}
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass()} htmlFor="validity">
              Durée de validité des devis par défaut
            </label>
            <select
              id="validity"
              className={cn(inputClass(), "mt-1.5 max-w-md")}
              value={String(quoteValidityHours)}
              onChange={(e) => setQuoteValidityHours(Number(e.target.value))}
            >
              <option value="24">24 heures</option>
              <option value="48">48 heures</option>
              <option value="72">72 heures</option>
            </select>
          </div>
          <div>
            <label className={labelClass()} htmlFor="timezone">
              Fuseau horaire
            </label>
            <select
              id="timezone"
              className={cn(inputClass(), "mt-1.5")}
              value={TIMEZONES.includes(timezone) ? timezone : "__custom__"}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom__") {
                  setTimezone("");
                  return;
                }
                setTimezone(v);
              }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
              <option value="__custom__">Autre (saisie libre)</option>
            </select>
            {!TIMEZONES.includes(timezone) ? (
              <input
                className={cn(inputClass(), "mt-2")}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Ex. Europe/Berlin"
              />
            ) : null}
          </div>
        </Section>

        <Section title="Notifications" description="Emails et rappels automatiques.">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Nouvelle réservation</p>
              <p className="text-xs text-gray-500">Notifier par email à chaque nouvelle réservation.</p>
            </div>
            <Toggle
              id="n-book"
              checked={notifyNewBooking}
              onChange={setNotifyNewBooking}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Devis expiré</p>
              <p className="text-xs text-gray-500">Notifier par email quand un devis expire.</p>
            </div>
            <Toggle
              id="n-exp"
              checked={notifyQuoteExpired}
              onChange={setNotifyQuoteExpired}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Sync iCal</p>
              <p className="text-xs text-gray-500">Rappel si erreur de synchronisation du calendrier.</p>
            </div>
            <Toggle
              id="n-ical"
              checked={notifyIcalError}
              onChange={setNotifyIcalError}
              disabled={saving}
            />
          </div>
        </Section>

        <Section title="Sécurité" description="Session et accès au compte.">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void requestPasswordReset()}
              className="rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Changer mon mot de passe
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-100 hover:bg-teal-500/20"
            >
              Se déconnecter
            </button>
          </div>
          <p className="text-xs text-gray-500">
            « Changer mon mot de passe » envoie un lien de réinitialisation Supabase à votre adresse
            email.
          </p>
        </Section>

        <section className="rounded-xl border border-red-500/25 bg-red-950/20 px-5 py-5">
          <h2 className="text-base font-semibold text-red-100">Zone dangereuse</h2>
          <p className="mt-1 text-sm text-red-200/80">
            La suppression du compte est irréversible. Vos données seront perdues.
          </p>
          <button
            type="button"
            onClick={() => void deleteAccount()}
            className="mt-4 rounded-lg border border-red-500/50 bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-600/30"
          >
            Supprimer mon compte
          </button>
        </section>

        <div className="flex justify-end border-t border-gray-800 pt-6">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-gray-950 shadow hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer toutes les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}