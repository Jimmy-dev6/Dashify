import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-zinc-600">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Dashify. Fait à Dakar.</p>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/blog" className="hover:text-zinc-900">
              Blog
            </Link>
            <Link href="/aide/ical" className="hover:text-zinc-900">
              Guide iCal
            </Link>
            <Link href="/contact" className="hover:text-zinc-900">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}