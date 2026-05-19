import { notFound, redirect } from "next/navigation";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import type { OrderRow } from "@/lib/database.types";
import { UploadClient } from "./upload-client";

export const dynamic = "force-dynamic";

// Middleware handles the ?t={token} → cookie conversion. The page only reads
// the cookie.
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
    .select("id, tier, photos_quota, status")
    .eq("id", id)
    .single()) as { data: Pick<OrderRow, "id" | "tier" | "photos_quota" | "status"> | null };
  const order = orderRes.data;
  if (!order) notFound();
  if (order.status !== "AWAITING_UPLOAD") redirect(`/order/${id}`);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Envoyez vos photos</h1>
      <p className="text-slate-600 mb-8">
        Formule <strong>{order.tier}</strong> — vous pouvez uploader jusqu'à
        {" "}<strong>{order.photos_quota} photos</strong>. Geoffrey commencera la retouche dès réception.
      </p>
      <UploadClient orderId={id} maxPhotos={order.photos_quota} />
    </div>
  );
}
