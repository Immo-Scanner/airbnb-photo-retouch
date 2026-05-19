import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REMPLISSAGE MAGNETIC™ — +15 à 20 points de taux d'occupation en 72h",
  description:
    "Protocole visuel haute conversion réservé aux exploitants de meublés touristiques. Livré sous 72h par Geoffrey, photographe spécialisé courte durée. À partir de 7€/photo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
