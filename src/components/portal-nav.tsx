"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  accessKeyFromPath,
  buildHilfeHref,
  buildTrackingHref,
} from "@/lib/access-key";

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
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400";

const KAWAI_LOGO = "/logo.png";
const KAWAI_NAME = "Kawai Labs Shopverwaltung";

export function PortalNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accessKey = useMemo(() => {
    const fromPath = accessKeyFromPath(pathname);
    if (fromPath) return fromPath;
    const fromQuery = searchParams.get("token")?.trim();
    return fromQuery || null;
  }, [pathname, searchParams]);

  const [shopName, setShopName] = useState<string | null>(null);
  const [shopLogoOk, setShopLogoOk] = useState(true);

  const hasShopContext = Boolean(accessKey);
  const homeHref = accessKey ? buildTrackingHref(accessKey) : "/";
  const hilfeHref = buildHilfeHref(accessKey);

  const shopLogoSrc =
    hasShopContext && accessKey && shopLogoOk
      ? `/api/tracking/entity-logo?token=${encodeURIComponent(accessKey)}`
      : null;

  const logoSrc = hasShopContext ? shopLogoSrc : KAWAI_LOGO;
  const title = hasShopContext ? (shopName ?? "Shop") : KAWAI_NAME;

  useEffect(() => {
    if (!accessKey) {
      queueMicrotask(() => {
        setShopName(null);
        setShopLogoOk(true);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setShopName(null);
      setShopLogoOk(true);
    });

    void (async () => {
      try {
        const res = await fetch(
          `/api/tracking/shop-branding?token=${encodeURIComponent(accessKey)}`,
        );
        const data = (await res.json().catch(() => null)) as {
          shopName?: string;
        } | null;
        if (!cancelled && res.ok && data?.shopName) {
          setShopName(data.shopName);
        }
      } catch {
        /* Fallback „Shop“ */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessKey]);

  return (
    <header className="flex-shrink-0 border-b border-gray-200 bg-white">
      <nav aria-label="Hauptnavigation">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col gap-2 py-2 min-[425px]:min-h-14 min-[425px]:flex-row min-[425px]:items-center min-[425px]:justify-between min-[425px]:gap-3 min-[425px]:py-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href={homeHref}
                className="flex min-w-0 cursor-pointer items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 sm:text-lg"
                aria-label={`${title} — Lieferanten-Tracking`}
              >
                {logoSrc && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoSrc}
                    alt=""
                    width={120}
                    height={32}
                    className="h-8 w-auto max-w-[140px] shrink-0 object-contain object-left"
                    decoding="async"
                    onError={() => {
                      if (hasShopContext) setShopLogoOk(false);
                    }}
                  />
                )}
                <span className="hidden min-[1025px]:inline truncate">
                  {title}
                </span>
                <span className="min-[1025px]:hidden truncate text-sm font-semibold text-gray-900">
                  {hasShopContext ? (shopName ?? "Shop") : "Tracking"}
                </span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
              <Link
                href={homeHref}
                className={NAV_ACTION_CLASS}
                title="Zur Startseite"
                aria-label="Zur Startseite"
              >
                <IconHome className="shrink-0 text-gray-700" />
                <span className="hidden min-[1025px]:inline">Start</span>
              </Link>
              <Link
                href={hilfeHref}
                className={NAV_ACTION_CLASS}
                title="Hilfe und API"
                aria-label="Hilfe und API"
              >
                <IconHelp className="shrink-0 text-gray-700" />
                <span className="hidden min-[1025px]:inline">Hilfe</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
