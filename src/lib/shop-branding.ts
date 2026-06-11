import { prisma } from "./prisma";
import {
  entityHasUploadedLogoFile,
  findRemoteManageLogoUrl,
} from "./entity-logo";
import { loadShopifyCredentials } from "./shopify-credentials";

const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-01";

const SHOP_NAME_CREDENTIAL_KEYS = ["shop_name", "shopify_shop_name"] as const;

export type ShopBranding = {
  shopName: string;
  logoUrl: string | null;
};

export async function resolveShopBrandingForEntity(
  entityId: string,
  token: string,
): Promise<ShopBranding> {
  const credName = await loadShopNameFromCredentials(entityId);

  const credentials = await loadShopifyCredentials(entityId);
  const fromShopify =
    credentials.ok
      ? await fetchShopifyShopBrand(
          credentials.shop,
          credentials.accessToken,
        )
      : null;

  const shopName =
    fromShopify?.name ??
    credName ??
    (credentials.ok ? humanizeShopDomain(credentials.shop) : "Shop");

  const logoUrl = await resolveLogoUrl(entityId, token, fromShopify?.logoUrl);

  return { shopName, logoUrl };
}

async function resolveLogoUrl(
  entityId: string,
  token: string,
  shopifyLogoUrl: string | null | undefined,
): Promise<string | null> {
  const proxyUrl = `/api/tracking/entity-logo?token=${encodeURIComponent(token)}`;

  if (entityHasUploadedLogoFile(entityId)) {
    return proxyUrl;
  }

  const remoteManage = await findRemoteManageLogoUrl(entityId);
  if (remoteManage) {
    return proxyUrl;
  }

  if (shopifyLogoUrl) {
    return shopifyLogoUrl;
  }

  return null;
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
                image { url }
              }
              squareLogo {
                image { url }
              }
            }
          }
        }`,
      }),
      cache: "no-store",
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
  const shopNode = (payload as { data?: { shop?: unknown } }).data?.shop;
  if (!shopNode || typeof shopNode !== "object") return null;

  const name =
    "name" in shopNode && typeof (shopNode as { name: unknown }).name === "string"
      ? (shopNode as { name: string }).name.trim()
      : "";

  const brand = (shopNode as { brand?: unknown }).brand;
  const logoUrl =
    extractBrandImageUrl(brand, "logo") ??
    extractBrandImageUrl(brand, "squareLogo");

  return {
    name: name || humanizeShopDomain(normalized),
    logoUrl,
  };
}

function extractBrandImageUrl(
  brand: unknown,
  key: "logo" | "squareLogo",
): string | null {
  if (!brand || typeof brand !== "object") return null;
  const node = (brand as Record<string, unknown>)[key];
  if (!node || typeof node !== "object") return null;
  const image = (node as { image?: unknown }).image;
  if (!image || typeof image !== "object") return null;
  const u = (image as { url?: unknown }).url;
  return typeof u === "string" && u.trim() ? u.trim() : null;
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
