import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact — Dashify",
  description:
    "Une question, un bug, une idée ? Écris-nous, on répond vite.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header simple */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">
              Dashify
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Une question ?<br />
          <span className="text-teal-400">On répond vite.</span>
        </h1>
        <p className="mt-4 text-base text-gray-400">
          Bug, idée, besoin d&apos;aide pour connecter ton calendrier Airbnb,
          ou juste envie de discuter de ton activité — écris-nous, on
          reviendra vers toi dans les 24h ouvrées.
        </p>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-2xl px-6 pb-16">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 shadow-lg sm:p-8">
          <ContactForm />
        </div>

        {/* Footer infos */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Dashify — Gestion de locations courte durée pour hôtes
            d&apos;Afrique de l&apos;Ouest
          </p>
          <p className="mt-1">
            Basés à Dakar 🇸🇳 — on parle français, wolof, english.
          </p>
        </div>
      </section>
    </div>
  );
}
