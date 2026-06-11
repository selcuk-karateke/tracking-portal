import { prisma } from "./prisma";
import { loadShopifyCredentials } from "./shopify-credentials";

const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-01";

/** Wie in Manage `entity_credentials` — erste gefundene URL gewinnt. */
const LOGO_CREDENTIAL_KEYS = [
  "shop_logo_url",
  "logo_url",
  "shop_logo",
  "branding_logo_url",
] as const;

const SHOP_NAME_CREDENTIAL_KEYS = ["shop_name", "shopify_shop_name"] as const;

export type ShopBranding = {
  shopName: string;
  logoUrl: string | null;
};

export async function resolveShopBrandingForEntity(
  entityId: string,
): Promise<ShopBranding> {
  const [credLogo, credName] = await Promise.all([
    loadLogoUrlFromCredentials(entityId),
    loadShopNameFromCredentials(entityId),
  ]);

  const credentials = await loadShopifyCredentials(entityId);
  if (!credentials.ok) {
    return {
      shopName: credName ?? "Shop",
      logoUrl: credLogo,
    };
  }

  const fromShopify = await fetchShopifyShopBrand(
    credentials.shop,
    credentials.accessToken,
  );

  const shopName =
    fromShopify?.name ??
    credName ??
    humanizeShopDomain(credentials.shop);

  const logoUrl = credLogo ?? fromShopify?.logoUrl ?? null;

  return { shopName, logoUrl };
}

async function loadLogoUrlFromCredentials(
  entityId: string,
): Promise<string | null> {
  try {
    const rows = await prisma.entityCredential.findMany({
      where: {
        entityId,
        key: { in: [...LOGO_CREDENTIAL_KEYS] },
      },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value.trim()]));
    for (const key of LOGO_CREDENTIAL_KEYS) {
      const raw = byKey.get(key);
      if (raw && isUsableLogoUrl(raw)) {
        return raw;
      }
    }
    return null;
  } catch (e) {
    console.error("[tracking] loadLogoUrlFromCredentials", e);
    return null;
  }
}

async function loadShopNameFromCredentials(
  entityId: string,
): Promise<string | null> {
  try {
    const rows = await prisma.entityCredential.findMany({
      where: {
        entityId,
        key: { in: [...SHOP_NAME_CREDENTIAL_KEYS] },
      },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value.trim()]));
    for (const key of SHOP_NAME_CREDENTIAL_KEYS) {
      const name = byKey.get(key);
      if (name) return name;
    }
    return null;
  } catch {
    return null;
  }
}

function isUsableLogoUrl(value: string): boolean {
  if (value.startsWith("https://") || value.startsWith("http://")) {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}

function humanizeShopDomain(shop: string): string {
  const host = shop.replace(/^https?:\/\//, "").split("/")[0] ?? shop;
  return host.replace(/\.myshopify\.com$/i, "") || host;
}

async function fetchShopifyShopBrand(
  shop: string,
  accessToken: string,
): Promise<{ name: string; logoUrl: string | null } | null> {
  const normalized = normalizeShopHost(shop);
  if (!normalized) return null;

  const url = `https://${normalized}/admin/api/${API_VERSION}/graphql.json`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: `query shopBrand {
          shop {
            name
            brand {
              logo {
                image {
                  url
                }
              }
            }
          }
        }`,
      }),
      next: { revalidate: 300 },
    });
  } catch (e) {
    console.error("[tracking] fetchShopifyShopBrand", e);
    return null;
  }

  if (!response.ok) return null;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: { shop?: unknown } }).data?.shop;
  if (!data || typeof data !== "object") return null;

  const name =
    "name" in data && typeof (data as { name: unknown }).name === "string"
      ? (data as { name: string }).name
      : "";

  let logoUrl: string | null = null;
  const brand = (data as { brand?: unknown }).brand;
  if (brand && typeof brand === "object") {
    const logo = (brand as { logo?: unknown }).logo;
    if (logo && typeof logo === "object") {
      const image = (logo as { image?: unknown }).image;
      if (image && typeof image === "object") {
        const u = (image as { url?: unknown }).url;
        if (typeof u === "string" && u.trim()) {
          logoUrl = u.trim();
        }
      }
    }
  }

  return { name: name.trim() || humanizeShopDomain(normalized), logoUrl };
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
