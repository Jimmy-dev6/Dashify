import type { BlogPost } from "@/lib/blog/types";
import {
  SITE_URL,
  SITE_NAME,
  AUTHOR_NAME,
  PUBLISHER_LOGO,
} from "@/lib/site";

type Props = {
  post: BlogPost;
};

export function BlogJsonLd({ post }: Props) {
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;

  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author || AUTHOR_NAME,
    },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: PUBLISHER_LOGO,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  if (post.cover) {
    articleSchema.image = [post.cover];
  }

  const schemas: object[] = [articleSchema];

  if (post.faq && post.faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}