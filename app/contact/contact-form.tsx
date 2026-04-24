"use client";

import { useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export function ContactForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const isSubmitting = state.status === "submitting";
  const fieldError = (field: string): string | undefined =>
    state.status === "error" ? state.fieldErrors?.[field] : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "submitting" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!res.ok || !json.ok) {
        setState({
          status: "error",
          message: json.error ?? "Une erreur est survenue. Réessaie dans un instant.",
          fieldErrors: json.fieldErrors,
        });
        return;
      }

      setState({ status: "success" });
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setState({
        status: "error",
        message: "Impossible de joindre le serveur. Vérifie ta connexion.",
      });
    }
  }

  // SUCCESS STATE
  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-7 w-7 text-teal-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">Message envoyé !</h2>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          Merci pour ton message. On revient vers toi dans les 24h ouvrées, promis.
        </p>
        <button
          type="button"
          onClick={() => setState({ status: "idle" })}
          className="mt-6 text-sm font-medium text-teal-400 hover:text-teal-300"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2 disabled:opacity-50";
  const labelCls = "text-sm font-medium text-gray-200";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Erreur globale */}
      {state.status === "error" && !state.fieldErrors && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.message}
        </div>
      )}

      {/* Nom */}
      <div>
        <label className={labelCls} htmlFor="contact-name">
          Ton nom <span className="text-teal-400">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          required
          disabled={isSubmitting}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="ex: Mariama Diop"
          maxLength={100}
          autoComplete="name"
        />
        {fieldError("name") && (
          <p className="mt-1 text-xs text-red-300">{fieldError("name")}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className={labelCls} htmlFor="contact-email">
          Ton email <span className="text-teal-400">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="ex: mariama@exemple.com"
          maxLength={200}
          autoComplete="email"
        />
        {fieldError("email") && (
          <p className="mt-1 text-xs text-red-300">{fieldError("email")}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          On t&apos;écrira à cette adresse.
        </p>
      </div>

      {/* Message */}
      <div>
        <label className={labelCls} htmlFor="contact-message">
          Ton message <span className="text-teal-400">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          disabled={isSubmitting}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputCls}
          placeholder="Explique-nous ta situation, ta question, ton besoin..."
          rows={6}
          maxLength={3000}
          minLength={10}
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          {fieldError("message") ? (
            <p className="text-red-300">{fieldError("message")}</p>
          ) : (
            <p className="text-gray-500">Minimum 10 caractères.</p>
          )}
          <p className="text-gray-500">{message.length}/3000</p>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-lg bg-teal-500 px-5 py-3 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Envoi en cours...
            </>
          ) : (
            "Envoyer le message"
          )}
        </button>
      </div>
    </form>
  );
}