"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type Mode = "login" | "signup";

function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirmez votre adresse e-mail avant de vous connecter.";
  }
  if (m.includes("user already registered")) {
    return "Un compte existe déjà avec cet e-mail.";
  }
  if (m.includes("password should be at least")) {
    return "Le mot de passe est trop court (minimum 6 caractères côté Supabase par défaut).";
  }
  if (m.includes("invalid email")) {
    return "Adresse e-mail invalide.";
  }
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");
  const combinedError = useMemo(() => {
    if (urlError === "confirmation") {
      return "Le lien de confirmation est invalide ou a expiré.";
    }
    return null;
  }, [urlError]);

  const supabaseConfigured = useMemo(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }, []);

  const goDashboard = useCallback(() => {
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!supabaseConfigured) {
      setError(
        "Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local.",
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) {
          setError(authErrorMessage(signErr.message));
          return;
        }
        goDashboard();
        return;
      }

      const origin = window.location.origin;
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });
      if (signUpErr) {
        setError(authErrorMessage(signUpErr.message));
        return;
      }
      if (data.session) {
        goDashboard();
        return;
      }
      setInfo(
        "Compte créé. Si la confirmation par e-mail est activée, ouvrez le message reçu pour activer votre compte.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur inattendue s'est produite.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!supabaseConfigured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Variables Supabase publiques manquantes. Ajoutez-les dans{" "}
          <code className="rounded bg-amber-500/10 px-1">
            .env.local
          </code>
          .
        </p>
      )}

      {(error || combinedError) && (
        <p
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error ?? combinedError}
        </p>
      )}

      {info && (
        <p className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          {info}
        </p>
      )}

      <div className="flex rounded-lg border border-gray-700 bg-gray-800/60 p-0.5">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setInfo(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-gray-950 text-white shadow-sm"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setInfo(null);
          }}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-gray-950 text-white shadow-sm"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Inscription
        </button>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-gray-200"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-gray-200"
        >
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-teal-500 px-3 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Patientez…"
          : mode === "login"
            ? "Se connecter"
            : "Créer un compte"}
      </button><Link href="/auth/reset-password" className="block text-center text-sm text-gray-400 hover:text-teal-400 mt-2">Mot de passe oublié ?</Link>
    </form>
  );
}
