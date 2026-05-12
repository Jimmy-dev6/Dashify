import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/blog/mdx-components";
import { FAQ } from "@/components/blog/FAQ";
import { BlogJsonLd } from "@/components/blog/JsonLd";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog/posts";
import { SITE_URL, SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/site";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) {
    return { metadataBase: new URL(SITE_URL), title: "Article introuvable — Dashify" };
  }
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const ogImage = post.cover ?? DEFAULT_OG_IMAGE;
  return {
    metadataBase: new URL(SITE_URL),
    title: `${post.title} — Dashify`,
    description: post.excerpt,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url: canonicalUrl,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: ogImage }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: [ogImage] },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) { notFound(); }
  return (
    <article>
      <BlogJsonLd post={post} />
      <header className="mb-10">
        {post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">{tag}</span>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          <span>Par {post.author}</span>
          <span aria-hidden>•</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>•</span>
          <span>{post.readingTimeMinutes} min de lecture</span>
        </div>
      </header>
      <div className="prose prose-zinc max-w-none prose-headings:font-semibold prose-headings:text-zinc-900 prose-a:text-teal-700 hover:prose-a:text-teal-800 prose-strong:text-zinc-900">
        <MDXRemote source={post.content} components={mdxComponents} />
      </div>
      {post.faq && post.faq.length > 0 && <FAQ items={post.faq} />}
      <aside className="mt-16 rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Tu gères des locations courte durée au Sénégal ?</h2>
        <p className="mt-2 text-sm text-zinc-700">Dashify automatise tes devis, bloque tes dates, et gère tes paiements Mobile Money. Essaie 30 jours gratuits.</p>
        <Link href="/contact" className="mt-4 inline-block rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Demander une démo</Link>
      </aside>
      <nav className="mt-12 border-t border-zinc-200 pt-6">
        <Link href="/blog" className="text-sm text-teal-700 hover:text-teal-800">← Tous les articles</Link>
      </nav>
    </article>
  );
}