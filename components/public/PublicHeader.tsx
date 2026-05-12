import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold text-zinc-900 hover:text-teal-700"
        >
          Dashify
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-6">
          <Link href="/blog" className="text-zinc-600 hover:text-zinc-900">
            Blog
          </Link>
          <Link
            href="/aide/ical"
            className="text-zinc-600 hover:text-zinc-900"
          >
            <span className="hidden sm:inline">Guide iCal</span>
            <span className="sm:hidden">iCal</span>
          </Link>
          <Link
            href="/contact"
            className="text-zinc-600 hover:text-zinc-900"
          >
            Contact
          </Link>
          <Link
            href="/auth/login"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            Se connecter
          </Link>
        </nav>
      </div>
    </header>
  );
}