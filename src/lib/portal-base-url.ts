import { headers } from "next/headers";

/** Öffentliche Basis-URL dieses Portals (für Hilfe/API-Beispiele). */
export async function getPortalBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "https://tracking.dachpro.com";
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  return `${proto}://${host}`;
}
