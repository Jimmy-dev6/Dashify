import type { BlogFAQItem } from "@/lib/blog/types";

type Props = { items: BlogFAQItem[] };

export function FAQ({ items }: Props) {
  return (
    <section className="mt-16 border-t border-zinc-200 pt-12">
      <h2 className="text-2xl font-semibold text-zinc-900">Questions fréquentes</h2>
      <dl className="mt-6 space-y-6">
        {items.map((item, idx) => (
          <div key={idx}>
            <dt className="text-base font-semibold text-zinc-900">{item.question}</dt>
            <dd className="mt-2 text-sm text-zinc-700">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}