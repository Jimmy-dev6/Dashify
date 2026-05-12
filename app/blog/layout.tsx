import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900 hover:text-teal-700">
            Dashify
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/blog" className="font-medium text-teal-700 hover:text-teal-800">
              Blog
            </Link>
            <Link href="/aide/ical" className="text-zinc-600 hover:text-zinc-900">
              Guide iCal
            </Link>
            <Link href="/contact" className="text-zinc-600 hover:text-zinc-900">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">{children}</main>

      <footer className="mt-24 border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-zinc-600">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Dashify. Fait à Dakar.</p>
            <nav className="flex items-center gap-4">
              <Link href="/blog" className="hover:text-zinc-900">Blog</Link>
              <Link href="/aide/ical" className="hover:text-zinc-900">Guide iCal</Link>
              <Link href="/contact" className="hover:text-zinc-900">Contact</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}