import { prisma } from "./prisma";
import { decrypt, isEncrypted } from "./encryption";

export type ShopifyCredentialReason =
  | "missing"
  | "decrypt_failed"
  | "db_unavailable";

export type ShopifyCredentialResult =
  | { ok: true; shop: string; accessToken: string }
  | { ok: false; reason: ShopifyCredentialReason };

export async function loadShopifyCredentials(
  entityId: string,
): Promise<ShopifyCredentialResult> {
  try {
    const rows = await prisma.entityCredential.findMany({
      where: {
        entityId,
        key: { in: ["shopify_shop", "shopify_access_token"] },
      },
      select: { key: true, value: true },
    });

    const map = new Map(rows.map((row) => [row.key, row.value]));
    const shop = map.get("shopify_shop")?.trim() ?? "";
    const tokenRaw = map.get("shopify_access_token")?.trim() ?? "";
    if (!shop || !tokenRaw) {
      return { ok: false, reason: "missing" };
    }

    let accessToken = tokenRaw;
    if (isEncrypted(tokenRaw)) {
      try {
        accessToken = decrypt(tokenRaw);
      } catch {
        return { ok: false, reason: "decrypt_failed" };
      }
    }

    if (!accessToken.trim()) {
      return { ok: false, reason: "missing" };
    }

    return { ok: true, shop, accessToken: accessToken.trim() };
  } catch (error) {
    console.error("[tracking] loadShopifyCredentials", error);
    return { ok: false, reason: "db_unavailable" };
  }
}
