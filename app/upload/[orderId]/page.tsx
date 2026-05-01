import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { UploadClient } from "./upload-client";

export const dynamic = "force-dynamic";

export default async function UploadPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, tier, photos_quota, status")
    .eq("id", orderId)
    .single();

  if (!order || order.user_id !== user.id) notFound();

  if (order.status !== "AWAITING_UPLOAD") {
    redirect(`/dashboard/order/${orderId}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Envoyez vos photos</h1>
      <p className="text-slate-600 mb-8">
        Formule <strong>{order.tier as string}</strong> — vous pouvez uploader
        jusqu'à <strong>{order.photos_quota as number} photos</strong>. Geoffrey
        commencera la retouche dès réception.
      </p>
      <UploadClient orderId={orderId} maxPhotos={order.photos_quota as number} userId={user.id} />
    </div>
  );
}
