"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-white">Dashify</h1>
          <p className="text-lg font-medium text-white mt-4">Mot de passe oublié</p>
          <p className="text-sm text-gray-400 mt-1">Entre ton email pour recevoir un lien.</p>
        </div>
        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">📧</div>
            <p className="text-white font-medium">Email envoyé !</p>
            <p className="text-gray-400 text-sm">Vérifie ta boîte mail sur <strong>{email}</strong>.</p>
            <Link href="/auth/login" className="block text-teal-400 text-sm hover:underline">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="ton@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-medium py-3 rounded-xl transition disabled:opacity-50">
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>
            <Link href="/auth/login" className="block text-center text-gray-400 text-sm hover:text-white">Retour à la connexion</Link>
          </form>
        )}
      </div>
    </div>
  );
}