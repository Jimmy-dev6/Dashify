import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog Dashify â€” Guides et ressources pour hÃ´tes courte durÃ©e",
  description:
    "Guides pratiques pour les hÃ´tes Airbnb, Booking, Vrbo au SÃ©nÃ©gal et en Afrique de l'Ouest. Mobile Money, gestion calendrier, Ã©vÃ©nements locaux, rentabilitÃ©.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <section className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Blog Dashify
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600">
          Guides et ressources pour les hÃ´tes courte durÃ©e en Afrique de
          l&apos;Ouest. Mobile Money, calendrier, Ã©vÃ©nements locaux,
          rentabilitÃ© â€” du concret pour ton activitÃ©.
        </p>
      </section>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <p className="text-zinc-600">
            Aucun article pour l&apos;instant. On y travaille.
          </p>
        </div>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block h-full rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-teal-300 hover:bg-teal-50/30"
              >
                {post.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-zinc-900 group-hover:text-teal-800">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-600">
                    {post.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span aria-hidden>â€¢</span>
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