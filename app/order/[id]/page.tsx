import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import { nextBusinessDayStart } from "@/lib/business-hours";
import type { BatchRow, OrderRow, PhotoRow } from "@/lib/database.types";
import { RetryPhotoButton } from "./retry-photo-button";

export const dynamic = "force-dynamic";

type BatchSummary = Pick<
  BatchRow,
  "id" | "status" | "upload_completed_at" | "scheduled_delivery_at" | "delivered_at"
> & { photo_count: number };

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
    .select("id, tier, photos_quota, email")
    .eq("id", id)
    .single()) as {
    data: Pick<OrderRow, "id" | "tier" | "photos_quota" | "email"> | null;
  };
  const order = orderRes.data;
  if (!order) notFound();

  // Credits used = every photo ever submitted on this order (including FAILED).
  const usedRes = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", id);
  const creditsUsed = usedRes.count ?? 0;
  const creditsRemaining = order.photos_quota - creditsUsed;

  // Pull all batches + their photo counts, newest first.
  const batchesRes = (await admin
    .from("batches")
    .select("id, status, upload_completed_at, scheduled_delivery_at, delivered_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false })) as {
    data: Omit<BatchSummary, "photo_count">[] | null;
  };
  const batchRows = batchesRes.data ?? [];
  const batches: BatchSummary[] = [];
  for (const b of batchRows) {
    const c = await admin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", b.id);
    batches.push({ ...b, photo_count: c.count ?? 0 });
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        <Link href="/" className="text-sm text-ink-muted hover:underline">
          ← Retour
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight">
          Formule {order.tier} — {order.photos_quota} photos
        </h1>
        <p className="text-sm text-ink-muted mt-1 mb-8">{order.email}</p>

        <CreditsCard
          orderId={id}
          quota={order.photos_quota}
          used={creditsUsed}
          remaining={creditsRemaining}
        />

        {batches.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest">
              Vos lots de photos
            </h2>
            {batches.map((b, i) => (
              <BatchCard
                key={b.id}
                batch={b}
                index={batches.length - i /* oldest = #1 */}
              />
            ))}
          </div>
        )}

        {creditsUsed > 0 && <PhotosList orderId={id} />}
      </div>
    </div>
  );
}

function CreditsCard({
  orderId,
  quota,
  used,
  remaining,
}: {
  orderId: string;
  quota: number;
  used: number;
  remaining: number;
}) {
  const pct = quota === 0 ? 0 : Math.round((used / quota) * 100);
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-6 md:p-7">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-lg font-bold tracking-tight">
          {remaining}/{quota} crédits restants
        </p>
        <p className="text-xs text-ink-muted">{used} utilisés</p>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      {remaining > 0 ? (
        <>
          <p className="text-sm text-ink-soft mb-5 leading-relaxed">
            Envoyez vos photos par petits lots quand vous voulez — les crédits ne
            périment pas. Chaque lot est retouché et livré sous 48h ouvrées.
          </p>
          <Link
            href={`/order/${orderId}/upload`}
            className="inline-block bg-brand hover:bg-brand-dark text-white px-7 py-3.5 rounded-full font-bold tracking-tight transition shadow-sm"
          >
            {used === 0 ? "Uploader mes photos →" : `Uploader d'autres photos (jusqu'à ${remaining}) →`}
          </Link>
        </>
      ) : (
        <p className="text-sm text-ink-soft leading-relaxed">
          Tous vos crédits ont été utilisés. Merci pour votre confiance.
        </p>
      )}
    </div>
  );
}

function BatchCard({ batch, index }: { batch: BatchSummary; index: number }) {
  if (batch.status === "DELIVERED") {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
        <div className="flex justify-between items-start mb-2">
          <p className="font-bold text-emerald-900">
            ✓ Lot #{index} livré — {batch.photo_count} photo{batch.photo_count > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-emerald-800 ml-3 whitespace-nowrap">
            {batch.delivered_at ? formatDate(batch.delivered_at) : ""}
          </p>
        </div>
        <a
          href={`/api/batches/${batch.id}/download`}
          className="inline-block mt-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-full font-bold text-sm tracking-tight transition"
        >
          Télécharger le zip →
        </a>
      </div>
    );
  }

  // PROCESSING / READY → still in flight from the customer's POV.
  const eta = batch.scheduled_delivery_at ? formatDate(batch.scheduled_delivery_at) : "sous 48h ouvrées";
  const hasStarted =
    batch.upload_completed_at &&
    new Date() >= nextBusinessDayStart(new Date(batch.upload_completed_at));
  const title = hasStarted
    ? `Geoffrey retouche le lot #${index}`
    : `Lot #${index} bien reçu`;
  const body = hasStarted
    ? `${batch.photo_count} photo${batch.photo_count > 1 ? "s" : ""} en cours.`
    : `On a bien reçu vos ${batch.photo_count} photo${batch.photo_count > 1 ? "s" : ""}. Geoffrey les prendra en main dès que possible.`;
  return (
    <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center text-lg flex-shrink-0">
          {hasStarted ? "📸" : "✓"}
        </div>
        <div className="flex-1">
          <p className="font-bold tracking-tight">{title}</p>
          <p className="text-sm text-ink-soft mt-0.5">{body}</p>
        </div>
      </div>
      <p className="text-xs text-ink-muted ml-12">
        <strong className="text-ink-soft">Livraison estimée :</strong> {eta}
      </p>
    </div>
  );
}

async function PhotosList({ orderId }: { orderId: string }) {
  const admin = adminSupabase();
  const photosRes = (await admin
    .from("photos")
    .select("id, original_filename, status, batch_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })) as {
    data: Pick<PhotoRow, "id" | "original_filename" | "status" | "batch_id">[] | null;
  };
  const photos = photosRes.data ?? [];
  if (photos.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">
        Détail des photos
      </h2>
      <ul className="space-y-1.5">
        {photos.map((p) => (
          <li
            key={p.id}
            className="text-sm text-ink-soft flex justify-between items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-black/5"
          >
            <span className="truncate flex-1">{p.original_filename}</span>
            <div className="flex items-center gap-3 shrink-0">
              {p.status === "FAILED" && <RetryPhotoButton photoId={p.id} />}
              <PhotoBadge status={p.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotoBadge({ status }: { status: string }) {
  switch (status) {
    case "UPLOADED":
      return <span className="text-xs text-ink-muted">Reçue</span>;
    case "PROCESSING":
      return <span className="text-xs text-brand">Retouche…</span>;
    case "ENHANCED":
      return <span className="text-xs text-emerald-600 font-bold">✓</span>;
    case "FAILED":
      return <span className="text-xs text-red-600">Échec</span>;
    default:
      return <span className="text-xs text-ink-muted">{status}</span>;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
