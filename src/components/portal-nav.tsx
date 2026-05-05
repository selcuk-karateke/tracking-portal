"use client";

import Link from "next/link";

function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconHelp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

const NAV_ACTION_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400";

export function PortalNav() {
  return (
    <header className="flex-shrink-0 border-b border-gray-200 bg-white">
      <nav aria-label="Hauptnavigation">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col gap-2 py-2 min-[425px]:min-h-14 min-[425px]:flex-row min-[425px]:items-center min-[425px]:justify-between min-[425px]:gap-3 min-[425px]:py-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 sm:text-lg"
                aria-label="Kawai Labs Shopverwaltung — Lieferanten-Tracking"
              >
                {/* Optional: public/logo.png – bei 404 ausgeblendet */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt=""
                  className="h-8 w-auto shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="hidden min-[1025px]:inline">
                  Kawai Labs Shopverwaltung
                </span>
                <span className="min-[1025px]:hidden text-sm font-semibold text-gray-900">
                  Tracking
                </span>
              </Link>
              <span
                className="hidden shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 sm:inline"
                title="Kawai Labs Shopverwaltung"
              >
                Kawai Labs
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
              <Link
                href="/"
                className={NAV_ACTION_CLASS}
                title="Zur Startseite"
              >
                <IconHome className="shrink-0 text-gray-700" />
                <span className="hidden min-[1025px]:inline">Start</span>
              </Link>
              <a
                href="#portal-hilfe"
                className={NAV_ACTION_CLASS}
                title="Hilfe zum Formular"
              >
                <IconHelp className="shrink-0 text-gray-700" />
                <span className="hidden min-[1025px]:inline">Hilfe</span>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
