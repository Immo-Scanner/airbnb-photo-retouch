import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import { nextBusinessDayStart } from "@/lib/business-hours";
import type { OrderRow, PhotoRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

// Note: when the user arrives with ?t={token}, the middleware redirects to
// the clean URL while setting the order_session cookie. By the time this page
// renders, only the cookie is present.
export default async function OrderPage({
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
    .select("id, tier, photos_quota, status, email, upload_completed_at, scheduled_delivery_at")
    .eq("id", id)
    .single()) as {
    data:
      | Pick<
          OrderRow,
          | "id"
          | "tier"
          | "photos_quota"
          | "status"
          | "email"
          | "upload_completed_at"
          | "scheduled_delivery_at"
        >
      | null;
  };
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

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        <Link href="/" className="text-sm text-ink-muted hover:underline">
          ← Retour
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
          Formule {order.tier} — {order.photos_quota} photos
        </h1>
        <p className="text-sm text-ink-muted mt-1 mb-10">{order.email}</p>

        {order.status === "AWAITING_UPLOAD" && <AwaitingUploadCard id={id} />}
        {(order.status === "PROCESSING" || order.status === "READY") && (
          <ProcessingCard
            scheduledAt={order.scheduled_delivery_at}
            uploadCompletedAt={order.upload_completed_at}
            count={photos.length}
          />
        )}
        {order.status === "DELIVERED" && <DeliveredCard id={id} count={photos.length} />}

        {photos.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">
              Vos photos
            </h2>
            <ul className="space-y-1.5">
              {photos.map((p) => (
                <li
                  key={p.id}
                  className="text-sm text-ink-soft flex justify-between items-center px-4 py-2.5 bg-white rounded-lg border border-black/5"
                >
                  <span className="truncate">{p.original_filename}</span>
                  <PhotoBadge status={p.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function AwaitingUploadCard({ id }: { id: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gold/30 shadow-sm p-7">
      <p className="text-2xl font-extrabold tracking-tight mb-2">📤 Vos photos n'ont pas encore été envoyées</p>
      <p className="text-ink-soft mb-6 leading-relaxed">
        Cliquez ci-dessous pour les uploader. Vous pouvez le faire plus tard — le délai de 48h ouvrées
        commencera à courir à ce moment-là.
      </p>
      <Link
        href={`/order/${id}/upload`}
        className="inline-block bg-brand hover:bg-brand-dark text-white px-7 py-3.5 rounded-full font-bold tracking-tight transition shadow-sm"
      >
        Uploader mes photos →
      </Link>
    </div>
  );
}

function ProcessingCard({
  scheduledAt,
  uploadCompletedAt,
  count,
}: {
  scheduledAt: string | null;
  uploadCompletedAt: string | null;
  count: number;
}) {
  const eta = scheduledAt ? formatEtaDate(scheduledAt) : "d'ici 48h ouvrées";
  const hasStartedWorking = uploadCompletedAt
    ? new Date() >= nextBusinessDayStart(new Date(uploadCompletedAt))
    : true;

  const title = hasStartedWorking
    ? "Geoffrey est en train de retoucher vos photos"
    : "Photos bien reçues ✓";
  const body = hasStartedWorking
    ? `${count} photo${count > 1 ? "s" : ""} en cours. Vous recevrez un email dès que c'est prêt.`
    : `On a bien reçu vos ${count} photo${count > 1 ? "s" : ""}. Geoffrey les prendra en main dès que possible.`;

  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
      <div className="bg-brand-soft px-7 py-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-lg">
            {hasStartedWorking ? "📸" : "✓"}
          </div>
          <p className="font-extrabold tracking-tight text-xl text-ink">{title}</p>
        </div>
        <p className="text-ink-soft text-sm leading-relaxed">{body}</p>
      </div>
      <div className="px-7 py-6">
        <Timeline hasStartedWorking={hasStartedWorking} />
        <p className="mt-6 text-sm text-ink-muted">
          <strong className="text-ink">Livraison estimée :</strong> {eta}
        </p>
      </div>
    </div>
  );
}

function Timeline({ hasStartedWorking }: { hasStartedWorking: boolean }) {
  return (
    <ol className="space-y-3">
      <Step done label="Photos reçues" />
      <Step done={hasStartedWorking} pending={!hasStartedWorking} label="Retouche en cours" />
      <Step pending label="Livraison à venir" />
    </ol>
  );
}

function Step({ done, pending, label }: { done?: boolean; pending?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          done ? "bg-emerald-500 text-white" : pending ? "bg-slate-200 text-ink-muted" : "bg-slate-200"
        }`}
      >
        {done ? "✓" : pending ? "" : ""}
      </span>
      <span className={done ? "text-ink" : "text-ink-muted"}>{label}</span>
    </li>
  );
}

function DeliveredCard({ id, count }: { id: string; count: number }) {
  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-7">
      <p className="text-2xl font-extrabold text-emerald-900 tracking-tight mb-2">
        ✓ Vos retouches sont prêtes
      </p>
      <p className="text-emerald-800 mb-6 leading-relaxed">
        Lien de téléchargement valide 30 jours.
      </p>
      <a
        href={`/api/orders/${id}/download`}
        className="inline-block bg-brand hover:bg-brand-dark text-white px-7 py-3.5 rounded-full font-bold tracking-tight transition shadow-sm"
      >
        Télécharger le zip ({count} photo{count > 1 ? "s" : ""}) →
      </a>
    </div>
  );
}

function PhotoBadge({ status }: { status: string }) {
  switch (status) {
    case "UPLOADED":
      return <span className="text-xs text-ink-muted">Reçue</span>;
    case "PROCESSING":
      return <span className="text-xs text-brand">Retouche en cours…</span>;
    case "ENHANCED":
      return <span className="text-xs text-emerald-600 font-bold">✓</span>;
    case "FAILED":
      return <span className="text-xs text-red-600">Échec</span>;
    default:
      return <span className="text-xs text-ink-muted">{status}</span>;
  }
}

function formatEtaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
