import { notFound, redirect } from "next/navigation";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import type { OrderRow } from "@/lib/database.types";
import { UploadClient } from "./upload-client";

export const dynamic = "force-dynamic";

// Middleware turns ?t={token} into the cookie. The page just reads it.
export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ok = await authorizedOrderId({ expectedOrderId: id, queryToken: null });
  if (!ok) notFound();

  const admin = adminSupabase();
  const orderRes = (await admin
    .from("orders")
    .select("id, tier, photos_quota")
    .eq("id", id)
    .single()) as { data: Pick<OrderRow, "id" | "tier" | "photos_quota"> | null };
  const order = orderRes.data;
  if (!order) notFound();

  const usedRes = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", id);
  const remaining = order.photos_quota - (usedRes.count ?? 0);
  if (remaining <= 0) redirect(`/order/${id}`);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Envoyez vos photos</h1>
      <p className="text-slate-600 mb-8">
        Formule <strong>{order.tier}</strong> — il vous reste{" "}
        <strong>{remaining}/{order.photos_quota} crédit{remaining > 1 ? "s" : ""}</strong>. Vous pourrez
        envoyer d'autres photos plus tard, vos crédits ne périment pas.
      </p>
      <UploadClient orderId={id} maxPhotos={remaining} />
    </div>
  );
}
