import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geoffrey — Retouche photo Airbnb pro en 48h",
  description:
    "Vos photos Airbnb retouchées par un photographe pro spécialisé location courte durée. Livré en 48h. À partir de 7€/photo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-slate-900 font-sans">{children}</body>
    </html>
  );
}
