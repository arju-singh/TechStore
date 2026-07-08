import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWholesalerUser } from "@/lib/auth";
import WholesaleCartView from "@/components/wholesale/WholesaleCartView";

export const metadata: Metadata = { title: "Bulk cart" };

export default async function WholesaleCartPage() {
  const ctx = await getWholesalerUser();
  if (!ctx) redirect("/become-a-wholesaler");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Bulk cart</h1>
      <WholesaleCartView />
    </div>
  );
}
