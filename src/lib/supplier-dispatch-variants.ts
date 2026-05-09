import { DropshippingDispatchStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeManufacturerEmail } from "./normalize-manufacturer-email";

/**
 * Summiert pro Shopify-Varianten-ID (numerisch, wie im Webhook) die Stückzahlen aus
 * erfolgreichen Dropshipping-Dispatches — nur diese Mengen sollen beim Tracking-Submit
 * erfüllt werden (Mischbestellungen mit mehreren Herstellern).
 */
export async function getVariantQuantitiesForSupplierOrder(
  entityId: string,
  manufacturerEmail: string,
  shopifyOrderIdNumeric: string,
): Promise<Map<string, number>> {
  const normalized = normalizeManufacturerEmail(manufacturerEmail);
  const orderKey = shopifyOrderIdNumeric.trim();

  const rows = await prisma.dropshippingDispatch.findMany({
    where: {
      status: DropshippingDispatchStatus.SUCCESS,
      shopifyVariantId: { not: null },
      manufacturerEmail: { equals: normalized, mode: "insensitive" },
      run: {
        entityId,
        shopifyOrderId: orderKey,
      },
    },
    select: {
      shopifyVariantId: true,
      quantity: true,
    },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    const vid = row.shopifyVariantId?.trim();
    if (!vid) continue;
    map.set(vid, (map.get(vid) ?? 0) + row.quantity);
  }
  return map;
}
