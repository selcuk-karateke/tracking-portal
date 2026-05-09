/** Wie Dropshipping/Manage: trim + lowercase. */
export function normalizeManufacturerEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
