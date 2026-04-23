"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  expiresAt: string | null;
};

type Property = {
  name: string;
  city: string;
  coverImageUrl: string | null;
  currency: string;
};

type Host = {
  fullName: string;
  phone: string;
  companyName: string;
  companyLogo: string | null;
  paymentOrangeMoney: string | null;
  paymentWave: string | null;
  paymentFreeMoney: string | null;
  paymentHolderName: string;
  paymentInstructionsExtra: string;
};

type Props = {
  reference: string;
  quote: Quote;
  property: Property;
  host: Host;
  state: "active" | "expired" | "paid";
};

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

function formatPhoneDisplay(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+221 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return raw;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
}

function formatDateFR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function buildWhatsAppLink(phone: string, text: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const withCountry = cleaned.length === 9 && cleaned.startsWith("7") ? `221${cleaned}` : cleaned;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        copied
          ? "border-teal-500/50 bg-teal-500/20 text-teal-100"
          : "border-gray-600 bg-gray-800/80 text-gray-200 hover:bg-gray-700",
      )}
      aria-label={`Copier ${label}`}
    >
      {copied ? "Copie" : "Copier"}
    </button>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    function update() {
      const now = new Date().getTime();
      const end = new Date(expiresAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Expire");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}j ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}min`);
      } else {
        setTimeLeft(`${minutes}min`);
      }
    }

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return null;

  return <span className="font-semibold text-amber-200">{timeLeft}</span>;
}

function PaymentMethodRow({
  label,
  icon,
  number,
  holder,
}: {
  label: string;
  icon: string;
  number: string;
  holder: string;
}) {
  const displayNumber = formatPhoneDisplay(number);
  const cleanNumber = number.replace(/\D/g, "");

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            {icon}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-base font-semibold text-white">{displayNumber}</p>
            {holder ? (
              <p className="mt-0.5 text-xs text-gray-500">Titulaire : {holder}</p>
            ) : null}
          </div>
        </div>
        <CopyButton value={cleanNumber} label={`numero ${label}`} />
      </div>
    </div>
  );
}

function Header({
  hostDisplayName,
  companyLogo,
}: {
  hostDisplayName: string;
  companyLogo: string | null;
}) {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <div className="h-9 w-9 overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={companyLogo} alt="" className="h-full w-full object-contain" />
            </div>
          ) : null}
          <div>
            <p className="text-xs text-gray-500">Paiement securise</p>
            <p className="text-sm font-semibold text-white">{hostDisplayName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 py-6">
      <div className="mx-auto max-w-xl px-4 text-center md:px-6">
        <p className="text-xs text-gray-500">
          Propulse par <span className="font-semibold text-teal-400">Dashify</span>
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Le paiement se fait directement entre toi et ton hote. Dashify ne recoit aucune somme.
        </p>
      </div>
    </footer>
  );
}

export function PaymentView({ reference, quote, property, host, state }: Props) {
  const nights = nightsBetween(quote.checkIn, quote.checkOut);
  const totalFormatted = formatAmount(quote.total, property.currency);

  const hasAnyPaymentMethod =
    host.paymentOrangeMoney || host.paymentWave || host.paymentFreeMoney;

  const hostDisplayName = host.companyName || host.fullName || "Ton hote";

  if (state === "expired") {
    const whatsappText = `Bonjour ${host.fullName || ""}, j'ai recu un devis (${reference}) mais il semble avoir expire. Peux-tu m'en envoyer un nouveau ? Merci`;
    const whatsappLink = host.phone ? buildWhatsAppLink(host.phone, whatsappText) : null;

    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Header hostDisplayName={hostDisplayName} companyLogo={host.companyLogo} />
        <main className="mx-auto max-w-xl px-4 py-12 md:py-16">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-3xl">
              &#9200;
            </div>
            <h1 className="text-xl font-bold text-white">Ce devis a expire</h1>
            <p className="mt-3 text-sm text-gray-300">
              Le devis <span className="font-mono font-semibold text-amber-200">{reference}</span> n&apos;est plus actif. Les dates ont ete liberees.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Pour reserver a nouveau, contacte directement {hostDisplayName}.
            </p>
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-gray-950 shadow hover:bg-teal-400"
              >
                Contacter sur WhatsApp
              </a>
            ) : null}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (state === "paid") {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Header hostDisplayName={hostDisplayName} companyLogo={host.companyLogo} />
        <main className="mx-auto max-w-xl px-4 py-12 md:py-16">
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/20 text-3xl">
              &#127881;
            </div>
            <h1 className="text-xl font-bold text-white">Paiement confirme</h1>
            <p className="mt-3 text-sm text-gray-300">
              Ta reservation <span className="font-mono font-semibold text-teal-200">{reference}</span> est confirmee.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              {hostDisplayName} va te recontacter pour finaliser ton arrivee.
            </p>
            <div className="mt-6 rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ton sejour</p>
              <p className="mt-1 text-base font-semibold text-white">{property.name}</p>
              <p className="mt-1 text-sm text-gray-400">
                Du {formatDateFR(quote.checkIn)} au {formatDateFR(quote.checkOut)}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {nights} nuit{nights > 1 ? "s" : ""} &middot; {quote.guests} voyageur{quote.guests > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // active
  const whatsappHelpText = `Bonjour ${host.fullName || ""}, j'ai une question sur le devis ${reference}.`;
  const whatsappHelpLink = host.phone ? buildWhatsAppLink(host.phone, whatsappHelpText) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header hostDisplayName={hostDisplayName} companyLogo={host.companyLogo} />

      <main className="mx-auto max-w-xl px-4 pb-16 md:px-6">
        <section className="mt-4 overflow-hidden rounded-2xl border border-gray-800">
          {property.coverImageUrl ? (
            <div className="relative h-48 w-full bg-gray-900 md:h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={property.coverImageUrl}
                alt={property.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h1 className="text-2xl font-bold text-white md:text-3xl">{property.name}</h1>
                {property.city ? (
                  <p className="mt-1 text-sm text-gray-300">{property.city}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="relative flex h-48 w-full items-end bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 p-5 md:h-64">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent" />
              <div className="relative">
                <h1 className="text-2xl font-bold text-white md:text-3xl">{property.name}</h1>
                {property.city ? (
                  <p className="mt-1 text-sm text-teal-100">{property.city}</p>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/35 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">Ton sejour</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            <p className="text-gray-200">
              <span className="text-gray-500">Arrivee : </span>
              <span className="font-medium capitalize text-white">{formatDateFR(quote.checkIn)}</span>
            </p>
            <p className="text-gray-200">
              <span className="text-gray-500">Depart : </span>
              <span className="font-medium capitalize text-white">{formatDateFR(quote.checkOut)}</span>
            </p>
            <p className="text-gray-200">
              <span className="text-gray-500">Duree : </span>
              <span className="font-medium text-white">
                {nights} nuit{nights > 1 ? "s" : ""} &middot; {quote.guests} voyageur{quote.guests > 1 ? "s" : ""}
              </span>
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-200">Montant a payer</p>
          <p className="mt-2 text-3xl font-bold text-white md:text-4xl">{totalFormatted}</p>
          {quote.expiresAt ? (
            <p className="mt-2 text-xs text-gray-400">
              Dates bloquees encore <Countdown expiresAt={quote.expiresAt} />. Au-dela, elles seront liberees.
            </p>
          ) : null}
        </section>

        <section className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/35 p-5">
          <h2 className="text-base font-semibold text-white">Comment payer</h2>
          <p className="mt-1 text-sm text-gray-400">
            Envoie {totalFormatted} sur l&apos;un des numeros ci-dessous, en mentionnant la reference.
          </p>

          {hasAnyPaymentMethod ? (
            <div className="mt-4 space-y-2">
              {host.paymentOrangeMoney ? (
                <PaymentMethodRow
                  label="Orange Money"
                  icon="OM"
                  number={host.paymentOrangeMoney}
                  holder={host.paymentHolderName}
                />
              ) : null}
              {host.paymentWave ? (
                <PaymentMethodRow
                  label="Wave"
                  icon="W"
                  number={host.paymentWave}
                  holder={host.paymentHolderName}
                />
              ) : null}
              {host.paymentFreeMoney ? (
                <PaymentMethodRow
                  label="Free Money"
                  icon="FM"
                  number={host.paymentFreeMoney}
                  holder={host.paymentHolderName}
                />
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              Aucun moyen de paiement n&apos;est encore configure par ton hote. Contacte-le directement.
            </div>
          )}

          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Reference a mentionner
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-teal-200">{reference}</p>
              </div>
              <CopyButton value={reference} label="reference" />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Indispensable : ton hote utilise cette reference pour identifier ton paiement.
            </p>
          </div>

          <div className="mt-2 rounded-lg border border-gray-700 bg-gray-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Montant exact</p>
                <p className="mt-1 text-lg font-bold text-white">{totalFormatted}</p>
              </div>
              <CopyButton value={String(quote.total)} label="montant" />
            </div>
          </div>

          {host.paymentInstructionsExtra ? (
            <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/50 p-3 text-sm text-gray-300">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Instructions de {host.fullName || "ton hote"}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap">{host.paymentInstructionsExtra}</p>
            </div>
          ) : null}
        </section>

        {whatsappHelpLink ? (
          <section className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/35 p-5">
            <p className="text-sm text-gray-300">
              Une question ? Contacte {hostDisplayName} directement.
            </p>
            <a
              href={whatsappHelpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-100 hover:bg-teal-500/20"
            >
              WhatsApp
            </a>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
