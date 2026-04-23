import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center text-white">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 text-3xl">
        ?
      </div>
      <h1 className="mt-4 text-xl font-bold text-white">Devis introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-400">
        Ce lien de paiement n&apos;existe pas ou a ete supprime. Verifie le lien envoye par ton hote, ou contacte-le directement.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg border border-gray-700 bg-gray-800/80 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
      >
        Retour a l&apos;accueil
      </Link>
    </div>
  );
}
