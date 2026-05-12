import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}