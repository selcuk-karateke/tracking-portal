/**
 * Manage speichert `shopifyOrderId` als numerischen String (REST `payload.id`).
 * GraphQL liefert `id` als GID — für Vergleich mit der DB die numerische Form verwenden.
 */
export function canonicalNumericShopifyOrderId(order: {
  id: string;
  legacyResourceId?: string | null;
}): string {
  const legacy = order.legacyResourceId?.trim();
  if (legacy && /^\d+$/.test(legacy)) return legacy;
  const m = /^gid:\/\/shopify\/Order\/(\d+)$/i.exec(order.id.trim());
  if (m) return m[1];
  return order.id.trim();
}

export function isOrderIdAllowedForSupplier(
  order: { id: string; legacyResourceId?: string | null },
  allowedNumericIds: Set<string>,
): boolean {
  return allowedNumericIds.has(canonicalNumericShopifyOrderId(order));
}
