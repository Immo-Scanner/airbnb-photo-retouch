"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Admin-only login. Sends a Supabase magic link to the email; the link
 * lands on /auth/callback which exchanges the code for a session, then
 * redirects to /admin. /admin itself checks the session email against
 * ADMIN_EMAILS — non-admins bounce to /.
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface-alt">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Admin</h1>
        <p className="text-ink-soft text-sm mb-8">
          Lien magique par email. Seuls les emails listés dans <code>ADMIN_EMAILS</code> peuvent
          accéder à l'admin.
        </p>
        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            ✓ Lien envoyé à <strong>{email}</strong>. Cliquez dessus pour vous connecter.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            <button className="w-full bg-brand hover:bg-brand-dark text-white px-4 py-3 rounded-lg font-bold">
              Recevoir le lien
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
