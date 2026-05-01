import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, tier, photos_quota, status, paid_at, delivered_at")
    .eq("id", id)
    .single();
  if (!order || order.user_id !== user.id) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, original_filename, status")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
        ← Retour à mes commandes
      </Link>
      <h1 className="text-3xl font-bold mt-3 mb-2">
        Formule {order.tier as string} — {order.photos_quota as number} photos
      </h1>

      {isDelivered ? (
        <>
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 mb-6">
            <p className="font-semibold text-green-900">✓ Geoffrey a terminé vos retouches !</p>
            <p className="text-sm text-green-800 mt-1">
              Téléchargez le zip ci-dessous. Le lien reste valide 30 jours.
            </p>
          </div>
          <a
            href={`/api/orders/${id}/download`}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Télécharger le zip ({photos?.length ?? 0} photos)
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

      {photos && photos.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Vos photos
          </h2>
          <ul className="space-y-1.5">
            {photos.map((p) => (
              <li key={p.id as string} className="text-sm text-slate-700 flex justify-between px-3 py-2 bg-slate-50 rounded">
                <span className="truncate">{p.original_filename as string}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
