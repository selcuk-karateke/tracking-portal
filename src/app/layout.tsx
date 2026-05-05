import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PortalNav } from "@/components/portal-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lieferanten-Tracking",
    template: "%s | Kawai Labs Shopverwaltung",
  },
  description:
    "Sendungsdaten zu Bestellungen übermitteln – Lieferanten-Tracking der Kawai Labs Shopverwaltung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased text-gray-900">
        <PortalNav />
        <main className="flex flex-1 flex-col bg-gray-50">{children}</main>
        <footer className="flex-shrink-0 border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-3 py-4 text-center text-sm text-gray-600 sm:px-4 lg:px-8">
            <span className="text-gray-500">
              © {new Date().getFullYear()} Kawai Labs Shopverwaltung
            </span>
            <span className="mx-2 text-gray-300" aria-hidden>
              ·
            </span>
            <span>Lieferanten-Tracking</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
