import { notFound } from "next/navigation";
import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/database.types";
import { RedoClient, type RedoCandidate } from "./redo-client";

export const dynamic = "force-dynamic";

export default async function RedoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { id } = await params;
  const { r } = await searchParams;
  if (!r) notFound();

  const admin = adminSupabase();

  // The redo URL is gated by a single-use voucher minted from /admin.
  const tokenRes = (await admin
    .from("redo_tokens")
    .select("id, order_id, used_at")
    .eq("token", r)
    .maybeSingle()) as {
    data: { id: string; order_id: string; used_at: string | null } | null;
  };
  const tok = tokenRes.data;
  if (!tok || tok.order_id !== id) notFound();
  if (tok.used_at) return <AlreadyUsedView orderId={id} />;

  const orderRes = (await admin
    .from("orders")
    .select("id, tier, email")
    .eq("id", id)
    .single()) as { data: Pick<OrderRow, "id" | "tier" | "email"> | null };
  const order = orderRes.data;
  if (!order) notFound();

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
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          Demander une retouche supplémentaire
        </h1>
        <p className="text-ink-soft text-base leading-relaxed mb-2">
          Cochez les photos que Geoffrey doit reprendre. Vous pouvez ajouter une instruction
          précise par photo : <em>« tonds la pelouse »</em>, <em>« enlève la voiture au premier plan »</em>,
          <em> « pièce plus lumineuse »</em>, etc.
        </p>
        <p className="text-ink-muted text-sm mb-10">
          Cette retouche supplémentaire est offerte — elle ne décompte pas de vos crédits.
          Ce lien est valable une seule fois.
        </p>

        {candidates.length === 0 ? (
          <div className="rounded-2xl bg-white border border-black/5 p-8 text-center">
            <p className="text-ink-soft">
              Aucune photo livrée pour le moment.
            </p>
          </div>
        ) : (
          <RedoClient orderId={id} redoToken={r} candidates={candidates} />
        )}
      </div>
    </div>
  );
}

function AlreadyUsedView({ orderId }: { orderId: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface-alt">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-4xl mb-6">
          ⏷
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-3">Lien déjà utilisé</h1>
        <p className="text-ink-soft mb-2">
          Vous avez déjà soumis votre demande de retouche supplémentaire avec ce lien.
        </p>
        <p className="text-ink-muted text-sm mb-8">
          Si vous avez besoin d'une autre retouche, écrivez-nous à{" "}
          <a href="mailto:contact@immo-scan.fr" className="text-brand font-semibold hover:underline">
            contact@immo-scan.fr
          </a>{" "}
          — on vous générera un nouveau lien.
        </p>
        <Link
          href={`/order/${orderId}`}
          className="inline-block bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-full font-bold tracking-tight transition"
        >
          Voir ma commande
        </Link>
      </div>
    </div>
  );
}
