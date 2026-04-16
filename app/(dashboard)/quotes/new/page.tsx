import { redirect } from "next/navigation";

export default function QuotesNewLegacyPage({
  searchParams,
}: {
  searchParams?: { customerId?: string };
}) {
  const cid = searchParams?.customerId?.trim();
  if (cid) {
    redirect(`/dashboard/quotes?new=1&customerId=${encodeURIComponent(cid)}`);
  }
  redirect("/dashboard/quotes?new=1");
}
