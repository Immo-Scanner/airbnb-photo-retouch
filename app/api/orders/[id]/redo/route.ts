import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorizedOrderId } from "@/lib/order-token";
import { scheduleDelivery } from "@/lib/business-hours";

export const runtime = "nodejs";

const Body = z.object({
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
 * Source photos must belong to a DELIVERED batch on the same order (the
 * customer can only ask for redos on photos they've already received).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;

  const ok = await authorizedOrderId({ expectedOrderId: orderId, queryToken: null });
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { selections } = parsed.data;

  const admin = adminSupabase();
  const sourceIds = selections.map((s) => s.source_photo_id);

  // Validate ownership AND that each source is part of a delivered batch.
  const sourcesRes = (await admin
    .from("photos")
    .select("id, order_id, original_path, original_filename, original_size_bytes, batch_id, batches!inner(status)")
    .in("id", sourceIds)) as {
    data:
      | {
          id: string;
          order_id: string;
          original_path: string;
          original_filename: string;
          original_size_bytes: number;
          batch_id: string | null;
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

  // Schedule the redo batch like any other delivery.
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

  // Build photo rows pointing at the same physical original_path so we don't
  // re-upload anything. The worker will pick them up by status=UPLOADED.
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

  return NextResponse.json({
    ok: true,
    batch_id: batchId,
    scheduled_delivery_at: scheduledAt.toISOString(),
    count: photoRows.length,
  });
}
