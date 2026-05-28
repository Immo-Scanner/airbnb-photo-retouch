import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { scheduleDelivery } from "@/lib/business-hours";

export const runtime = "nodejs";

const Body = z.object({
  redoToken: z.string().min(8).max(128),
  selections: z
    .array(
      z.object({
        source_photo_id: z.string().uuid(),
        comment: z.string().max(2000).optional().nullable(),
      })
    )
    .min(1)
    .max(50),
});

/**
 * Create a fresh batch that re-processes existing photos with optional
 * per-photo custom prompts. The redo is FREE — it doesn't consume credits.
 *
 * Authorization here is NOT the order cookie: it's the single-use voucher
 * (`redoToken`) the admin minted from /admin and shared with the customer.
 * The voucher is atomically marked used at the end of a successful submit,
 * so the same URL cannot be re-used to keep spawning free batches.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { redoToken, selections } = parsed.data;

  const admin = adminSupabase();

  // Validate the voucher: must exist, match the order in the URL, and be unused.
  const tokenRes = (await admin
    .from("redo_tokens")
    .select("id, order_id, used_at")
    .eq("token", redoToken)
    .maybeSingle()) as {
    data: { id: string; order_id: string; used_at: string | null } | null;
  };
  const tok = tokenRes.data;
  if (!tok || tok.order_id !== orderId) {
    return NextResponse.json({ error: "invalid redo token" }, { status: 403 });
  }
  if (tok.used_at) {
    return NextResponse.json({ error: "redo token already used" }, { status: 409 });
  }

  // Validate selected photos belong to a delivered batch on this order.
  const sourceIds = selections.map((s) => s.source_photo_id);
  const sourcesRes = (await admin
    .from("photos")
    .select("id, order_id, original_path, original_filename, original_size_bytes, batches!inner(status)")
    .in("id", sourceIds)) as {
    data:
      | {
          id: string;
          order_id: string;
          original_path: string;
          original_filename: string;
          original_size_bytes: number;
          batches: { status: string };
        }[]
      | null;
  };
  const sources = sourcesRes.data ?? [];
  if (sources.length !== selections.length) {
    return NextResponse.json({ error: "some photos not found" }, { status: 404 });
  }
  for (const s of sources) {
    if (s.order_id !== orderId) {
      return NextResponse.json({ error: "photo does not belong to this order" }, { status: 403 });
    }
    if (s.batches.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "can only redo photos from delivered batches" },
        { status: 409 }
      );
    }
  }

  const now = new Date();
  const businessDays = Number(process.env.DELIVERY_DELAY_BUSINESS_DAYS ?? "2");
  const scheduledAt = scheduleDelivery(now, Number.isFinite(businessDays) ? businessDays : 2);

  const batchRes = (await admin
    .from("batches")
    .insert({
      order_id: orderId,
      status: "PROCESSING",
      upload_completed_at: now.toISOString(),
      scheduled_delivery_at: scheduledAt.toISOString(),
    })
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null };
  if (batchRes.error || !batchRes.data) {
    return NextResponse.json(
      { error: batchRes.error?.message ?? "batch insert failed" },
      { status: 500 }
    );
  }
  const batchId = batchRes.data.id;

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const photoRows = selections.map((sel) => {
    const src = sourceById.get(sel.source_photo_id)!;
    return {
      order_id: orderId,
      batch_id: batchId,
      original_path: src.original_path,
      original_filename: src.original_filename,
      original_size_bytes: src.original_size_bytes,
      custom_prompt: sel.comment?.trim() || null,
      source_photo_id: src.id,
      status: "UPLOADED" as const,
    };
  });
  const insertedRes = (await admin.from("photos").insert(photoRows).select("id")) as {
    data: { id: string }[] | null;
    error: { message: string } | null;
  };
  if (insertedRes.error || !insertedRes.data) {
    await admin.from("batches").delete().eq("id", batchId);
    return NextResponse.json(
      { error: insertedRes.error?.message ?? "photo insert failed" },
      { status: 500 }
    );
  }

  // Atomically claim the voucher. If someone parallelised the request and
  // claimed it first, undo our batch and refuse.
  const claimRes = (await admin
    .from("redo_tokens")
    .update({ used_at: new Date().toISOString(), used_batch_id: batchId })
    .eq("id", tok.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle()) as { data: { id: string } | null };
  if (!claimRes.data) {
    await admin.from("batches").delete().eq("id", batchId);
    return NextResponse.json({ error: "redo token already used" }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    batch_id: batchId,
    scheduled_delivery_at: scheduledAt.toISOString(),
    count: photoRows.length,
  });
}
