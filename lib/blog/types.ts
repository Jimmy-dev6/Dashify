// lib/blog/types.ts

export type BlogFAQItem = {
    question: string;
    answer: string;
  };
  
  export type BlogPost = {
    slug: string;
    title: string;
    excerpt: string;
    date: string; // ISO 8601 (ex: "2026-05-15")
    author: string;
    tags: string[];
    cover?: string; // URL absolue ou path /public
    readingTimeMinutes: number;
    faq?: BlogFAQItem[];
    content: string; // raw MDX, parsé au render
  };
  
  export type BlogPostMeta = Omit<BlogPost, "content">;