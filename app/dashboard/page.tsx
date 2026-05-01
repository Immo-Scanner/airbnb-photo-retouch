import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  AWAITING_UPLOAD: { label: "À uploader", color: "bg-amber-100 text-amber-800" },
  PROCESSING: { label: "Geoffrey est en train de retoucher", color: "bg-blue-100 text-blue-800" },
  READY: { label: "Geoffrey est en train de retoucher", color: "bg-blue-100 text-blue-800" },
  DELIVERED: { label: "Livré ✓", color: "bg-green-100 text-green-800" },
};

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, tier, photos_quota, status, created_at, delivered_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes commandes</h1>
          <p className="text-slate-600 text-sm mt-1">Connecté en tant que {user.email}</p>
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:underline">
          ← Tarifs
        </Link>
      </header>

      {!orders?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600 mb-4">Vous n'avez pas encore de commande.</p>
          <Link
            href="/#pricing"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-semibold"
          >
            Choisir une formule
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const meta = STATUS_LABEL[o.status as string] ?? { label: o.status, color: "bg-slate-100 text-slate-700" };
            const href = o.status === "AWAITING_UPLOAD" ? `/upload/${o.id}` : `/dashboard/order/${o.id}`;
            return (
              <li key={o.id as string}>
                <Link
                  href={href}
                  className="block rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 p-5 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">
                        Formule {o.tier} — {o.photos_quota} photos
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {new Date(o.created_at as string).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
