import { DropshippingDispatchStatus, DropshippingFulfillmentLeg } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeManufacturerEmail } from "./normalize-manufacturer-email";
import { canonicalNumericShopifyOrderId } from "./shopify-order-id-match";

/** Hub/Zoll-Lauf: Lieferanten-Tracking darf kein Kunden-Fulfillment auslösen. */
export async function isHubFulfillmentRunForSupplierOrder(
  entityId: string,
  manufacturerEmail: string,
  shopifyOrderId: string,
): Promise<boolean> {
  const normalized = normalizeManufacturerEmail(manufacturerEmail);
  const orderId = canonicalNumericShopifyOrderId(shopifyOrderId);
  if (!orderId) return false;

  const row = await prisma.dropshippingDispatch.findFirst({
    where: {
      status: DropshippingDispatchStatus.SUCCESS,
      run: {
        entityId,
        shopifyOrderId: orderId,
        fulfillmentLeg: DropshippingFulfillmentLeg.HUB,
      },
    },
    select: { manufacturerEmail: true },
  });

  if (!row) return false;
  return normalizeManufacturerEmail(row.manufacturerEmail) === normalized;
}
