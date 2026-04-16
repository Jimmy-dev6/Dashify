import { redirect } from "next/navigation";

type Params = { id: string };

export default async function QuoteLegacyDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  redirect(`/dashboard/quotes?quote=${encodeURIComponent(id)}`);
}
