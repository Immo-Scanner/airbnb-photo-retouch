import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { signOrderToken } from "@/lib/order-token";
import type { OrderRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type AdminOrder = Pick<
  OrderRow,
  "id" | "email" | "tier" | "photos_quota" | "status" | "paid_at" | "scheduled_delivery_at" | "delivered_at"
>;

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminEmail(user.email)) redirect("/");

  const admin = adminSupabase();
  const ordersRes = (await admin
    .from("orders")
    .select("id, email, tier, photos_quota, status, paid_at, scheduled_delivery_at, delivered_at")
    .order("created_at", { ascending: false })
    .limit(100)) as { data: AdminOrder[] | null };
  const orders = ordersRes.data ?? [];

  // Server-side mint a signed order link per row so we can jump straight into
  // any customer's order page (or its /redo subpage) without going through
  // the email round-trip.
  const orderLinks = new Map<string, { view: string; redo: string }>();
  for (const o of orders) {
    const t = await signOrderToken(o.id);
    orderLinks.set(o.id, {
      view: `/order/${o.id}?t=${encodeURIComponent(t)}`,
      redo: `/order/${o.id}/redo?t=${encodeURIComponent(t)}`,
    });
  }

  const { count: photoCount } = await admin.from("photos").select("id", { count: "exact", head: true });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold">Admin — All orders</h1>
      <p className="text-sm text-slate-500 mt-1 mb-8">
        {orders.length} orders shown · {photoCount ?? 0} photos in originals (training data)
      </p>

      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-2">Order ID</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Quota</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Paid</th>
              <th className="px-4 py-2">Delivered</th>
              <th className="px-4 py-2">Lien</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                <td className="px-4 py-2 text-xs">{o.email ?? "—"}</td>
                <td className="px-4 py-2">{o.tier}</td>
                <td className="px-4 py-2">{o.photos_quota}</td>
                <td className="px-4 py-2">{o.status}</td>
                <td className="px-4 py-2 text-slate-500">{fmt(o.paid_at)}</td>
                <td className="px-4 py-2 text-slate-500">{fmt(o.delivered_at)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <a
                    href={orderLinks.get(o.id)?.view}
                    target="_blank"
                    rel="noopener"
                    className="text-brand font-semibold hover:underline text-xs mr-3"
                  >
                    Voir →
                  </a>
                  <a
                    href={orderLinks.get(o.id)?.redo}
                    target="_blank"
                    rel="noopener"
                    className="text-ink-soft font-semibold hover:underline text-xs"
                    title="Page de demande de retouche supplémentaire (à envoyer au client)"
                  >
                    Redo →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}
