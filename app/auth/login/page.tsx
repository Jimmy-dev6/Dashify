import { Suspense } from "react";
import { LoginForm } from "./login-form";
import "./login.css";

export default function AuthLoginPage() {
  return (
    <main className="auth-login-page">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-7 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-teal-400">
            Dashify
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Accédez à votre espace hôte (e-mail & mot de passe)
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-48 animate-pulse rounded-lg bg-gray-800/80" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
