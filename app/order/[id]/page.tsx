import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId, setOrderCookie } from "@/lib/order-token";
import type { OrderRow, PhotoRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  const ok = await authorizedOrderId({ expectedOrderId: id, queryToken: t ?? null });
  if (!ok) notFound();

  // If the URL had a fresh ?t=… token, refresh the cookie so reload-without-link works.
  if (t) await setOrderCookie(id);

  const admin = adminSupabase();
  const orderRes = (await admin
    .from("orders")
    .select("id, tier, photos_quota, status, email")
    .eq("id", id)
    .single()) as { data: Pick<OrderRow, "id" | "tier" | "photos_quota" | "status" | "email"> | null };
  const order = orderRes.data;
  if (!order) notFound();

  const photosRes = (await admin
    .from("photos")
    .select("id, original_filename, status")
    .eq("order_id", id)
    .order("created_at", { ascending: true })) as {
    data: Pick<PhotoRow, "id" | "original_filename" | "status">[] | null;
  };
  const photos = photosRes.data ?? [];

  const isAwaiting = order.status === "AWAITING_UPLOAD";
  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/" className="text-sm text-slate-500 hover:underline">
        ← Retour
      </Link>
      <h1 className="text-3xl font-bold mt-3 mb-2">
        Formule {order.tier} — {order.photos_quota} photos
      </h1>
      <p className="text-sm text-slate-500 mb-8">{order.email}</p>

      {isAwaiting ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <p className="font-semibold text-amber-900">📤 Vos photos n'ont pas encore été envoyées</p>
          <p className="text-sm text-amber-800 mt-1 mb-4">
            Cliquez ci-dessous pour uploader vos photos. Vous pouvez le faire plus tard, mais le délai de 48h ouvrées
            commencera à compter à ce moment-là.
          </p>
          <Link
            href={`/order/${id}/upload`}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold"
          >
            Uploader mes photos
          </Link>
        </div>
      ) : isDelivered ? (
        <>
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 mb-6">
            <p className="font-semibold text-green-900">✓ Geoffrey a terminé vos retouches</p>
            <p className="text-sm text-green-800 mt-1">Lien de téléchargement valide 30 jours.</p>
          </div>
          <a
            href={`/api/orders/${id}/download`}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Télécharger le zip ({photos.length} photos)
          </a>
        </>
      ) : (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
          <p className="font-semibold text-blue-900">📸 Geoffrey est en train de retoucher vos photos</p>
          <p className="text-sm text-blue-800 mt-1">
            Vous recevrez un email dès que c'est prêt. Délai habituel : 48h ouvrées.
          </p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Vos photos</h2>
          <ul className="space-y-1.5">
            {photos.map((p) => (
              <li
                key={p.id}
                className="text-sm text-slate-700 flex justify-between px-3 py-2 bg-slate-50 rounded"
              >
                <span className="truncate">{p.original_filename}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
