import { prisma } from "./prisma";
import { normalizeManufacturerEmail } from "./normalize-manufacturer-email";

/**
 * Numerische Shopify-Order-IDs (`dropshipping_runs.shopifyOrderId`), die dieser Lieferant
 * für die Entität bearbeiten darf — aus Dispatches des Dropshipping-Laufs (Manage-Daten).
 */
export async function getAllowedShopifyOrderIdsForSupplier(
  entityId: string,
  manufacturerEmail: string,
): Promise<Set<string>> {
  const normalized = normalizeManufacturerEmail(manufacturerEmail);

  const rows = await prisma.dropshippingDispatch.findMany({
    where: {
      run: {
        entityId,
      },
    },
    select: {
      manufacturerEmail: true,
      run: {
        select: { shopifyOrderId: true },
      },
    },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    if (
      normalizeManufacturerEmail(row.manufacturerEmail) !== normalized
    ) {
      continue;
    }
    const id = row.run.shopifyOrderId.trim();
    if (id) ids.add(id);
  }
  return ids;
}
