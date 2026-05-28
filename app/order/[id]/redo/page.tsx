import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import type { OrderRow } from "@/lib/database.types";
import { RedoClient, type RedoCandidate } from "./redo-client";

export const dynamic = "force-dynamic";

export default async function RedoPage({
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
    .select("id, tier, email")
    .eq("id", id)
    .single()) as { data: Pick<OrderRow, "id" | "tier" | "email"> | null };
  const order = orderRes.data;
  if (!order) notFound();

  // Pull every ENHANCED photo whose batch was DELIVERED. Newest delivered first.
  const photosRes = (await admin
    .from("photos")
    .select("id, original_filename, original_path, batch_id, batches!inner(status, delivered_at)")
    .eq("order_id", id)
    .eq("status", "ENHANCED")
    .order("created_at", { ascending: true })) as {
    data:
      | {
          id: string;
          original_filename: string;
          original_path: string;
          batch_id: string;
          batches: { status: string; delivered_at: string | null };
        }[]
      | null;
  };
  const deliveredPhotos = (photosRes.data ?? []).filter((p) => p.batches.status === "DELIVERED");

  // Server-side sign a short-lived URL pointing at the ORIGINAL image. The
  // customer picks what to redo based on the source photo (the one they
  // sent), not the AI's first attempt — that's the reference to comment on.
  const candidates: RedoCandidate[] = [];
  for (const p of deliveredPhotos) {
    if (!p.original_path) continue;
    const { data } = await admin.storage.from("originals").createSignedUrl(p.original_path, 3600);
    candidates.push({
      id: p.id,
      filename: p.original_filename,
      previewUrl: data?.signedUrl ?? null,
    });
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <Link href={`/order/${id}`} className="text-sm text-ink-muted hover:underline">
          ← Retour à ma commande
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 mb-3">
          Demander une retouche supplémentaire
        </h1>
        <p className="text-ink-soft text-base leading-relaxed mb-2">
          Cochez les photos que Geoffrey doit reprendre. Vous pouvez ajouter une instruction
          précise par photo : <em>« tonds la pelouse »</em>, <em>« enlève la voiture au premier plan »</em>,
          <em> « pièce plus lumineuse »</em>, etc.
        </p>
        <p className="text-ink-muted text-sm mb-10">
          La retouche supplémentaire est offerte — elle ne décompte pas de vos crédits.
        </p>

        {candidates.length === 0 ? (
          <div className="rounded-2xl bg-white border border-black/5 p-8 text-center">
            <p className="text-ink-soft">
              Aucune photo livrée pour le moment. Revenez ici une fois votre premier lot reçu.
            </p>
          </div>
        ) : (
          <RedoClient orderId={id} candidates={candidates} />
        )}
      </div>
    </div>
  );
}
