import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";
import { SITE_URL, SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Blog Dashify — Guides et ressources pour hôtes courte durée",
  description:
    "Guides pratiques pour les hôtes Airbnb, Booking, Vrbo au Sénégal et en Afrique de l'Ouest. Mobile Money, gestion calendrier, événements locaux, rentabilité.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: `${SITE_URL}/blog`,
    title: "Blog Dashify — Guides pour hôtes courte durée",
    description: "Guides pratiques pour les hôtes Airbnb, Booking, Vrbo au Sénégal. Mobile Money, calendrier, événements locaux.",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog Dashify — Guides pour hôtes courte durée",
    description: "Guides pratiques pour les hôtes Airbnb, Booking, Vrbo au Sénégal. Mobile Money, calendrier, événements locaux.",
    images: [DEFAULT_OG_IMAGE],
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();
  return (
    <>
      <section className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Blog Dashify</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600">
          Guides et ressources pour les hôtes courte durée en Afrique de l&apos;Ouest. Mobile Money, calendrier, événements locaux, rentabilité — du concret pour ton activité.
        </p>
      </section>
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <p className="text-zinc-600">Aucun article pour l&apos;instant. On y travaille.</p>
        </div>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="group block h-full rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-teal-300 hover:bg-teal-50/30">
                {post.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{tag}</span>
                    ))}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-zinc-900 group-hover:text-teal-800">{post.title}</h2>
                {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{post.excerpt}</p>}
                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span aria-hidden>•</span>
                  <span>{post.readingTimeMinutes} min de lecture</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}