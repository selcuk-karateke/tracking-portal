import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Tracking melden | dachpro",
  description:
    "Sendungsdaten zu Bestellungen übermitteln – Lieferanten-Portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased text-gray-900">
        <nav className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <span className="text-lg font-semibold text-gray-900">dachpro</span>
            <span className="ml-2 text-sm text-gray-500">
              Lieferanten-Tracking
            </span>
          </div>
        </nav>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} dachpro
        </footer>
      </body>
    </html>
  );
}
