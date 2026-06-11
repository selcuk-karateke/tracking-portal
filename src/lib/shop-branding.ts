import { loadShopifyCredentials } from "./shopify-credentials";

const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-01";

export type ShopBranding = {
  shopName: string;
  /** Immer Portal-Proxy — Datei wie Manage `uploads/logos/{entityId}.*` */
  logoUrl: string;
};

export async function resolveShopBrandingForEntity(
  entityId: string,
  token: string,
): Promise<ShopBranding> {
  const shopName = await fetchShopName(entityId);
  return {
    shopName,
    logoUrl: `/api/tracking/entity-logo?token=${encodeURIComponent(token)}`,
  };
}

export type BrandLogoBytes = {
  buffer: Buffer;
  contentType: string;
};

/** Shopify Shop-Brand-Logo (Fallback wenn kein Manage-Upload erreichbar). */
export async function fetchShopifyBrandLogo(
  entityId: string,
): Promise<BrandLogoBytes | null> {
  const credentials = await loadShopifyCredentials(entityId);
  if (!credentials.ok) return null;

  const shop = normalizeShopHost(credentials.shop);
  if (!shop) return null;

  try {
    const res = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": credentials.accessToken,
        },
        body: JSON.stringify({
          query: `query {
            shop {
              brand {
                logo { image { url } }
                squareLogo { image { url } }
              }
            }
          }`,
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;

    const payload = (await res.json()) as {
      data?: {
        shop?: {
          brand?: {
            logo?: { image?: { url?: string } };
            squareLogo?: { image?: { url?: string } };
          };
        };
      };
    };

    const brand = payload.data?.shop?.brand;
    const imageUrl =
      brand?.logo?.image?.url?.trim() ||
      brand?.squareLogo?.image?.url?.trim() ||
      null;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { cache: "no-store" });
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    return {
      buffer: Buffer.from(await imgRes.arrayBuffer()),
      contentType,
    };
  } catch {
    return null;
  }
}

async function fetchShopName(entityId: string): Promise<string> {
  const credentials = await loadShopifyCredentials(entityId);
  if (!credentials.ok) {
    return "Shop";
  }

  const shop = normalizeShopHost(credentials.shop);
  if (!shop) return humanizeShopDomain(credentials.shop);

  try {
    const res = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": credentials.accessToken,
        },
        body: JSON.stringify({
          query: `query { shop { name } }`,
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) return humanizeShopDomain(shop);
    const payload = (await res.json()) as {
      data?: { shop?: { name?: string } };
    };
    const name = payload.data?.shop?.name?.trim();
    return name || humanizeShopDomain(shop);
  } catch {
    return humanizeShopDomain(shop);
  }
}

function humanizeShopDomain(shop: string): string {
  const host = shop.replace(/^https?:\/\//, "").split("/")[0] ?? shop;
  return host.replace(/\.myshopify\.com$/i, "") || host;
}

function normalizeShopHost(shop: string): string | null {
  const raw = shop.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!raw) return null;
  const candidate = raw.includes(".") ? raw : `${raw}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(candidate)) {
    return null;
  }
  return candidate;
}
