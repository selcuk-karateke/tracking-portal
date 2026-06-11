import fs from "fs";
import path from "path";

const LOGO_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

function getUploadDir(): string {
  const override = process.env.LOGO_UPLOADS_DIR?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "public", "uploads", "logos");
}

export function findLocalLogoPath(entityId: string): string | null {
  const uploadDir = getUploadDir();
  for (const ext of LOGO_EXTENSIONS) {
    const filepath = path.join(uploadDir, `${entityId}.${ext}`);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}

export function getManagePublicBase(): string | null {
  const base = process.env.MANAGE_PUBLIC_URL?.trim().replace(/\/$/, "");
  return base || null;
}

/** Statische Pfade wie in Manage `public/uploads/logos/` (können auf Coolify 404 liefern). */
export function getManageStaticLogoUrls(entityId: string): string[] {
  const base = getManagePublicBase();
  if (!base) return [];
  return LOGO_EXTENSIONS.map((ext) => `${base}/uploads/logos/${entityId}.${ext}`);
}

export type RemoteLogoResult = {
  buffer: Buffer;
  contentType: string;
};

/**
 * Holt Logo von Manage per HTTP. Reihenfolge:
 * 1. Statische `/uploads/logos/{entityId}.*`
 * 2. Zukünftige Manage-Route `/api/tracking/public/entity-logo?token=…` (Kopf-Repo)
 * 3. Manage `/api/entities/{id}/logo/image` mit optionalem `MANAGE_TRACKING_PORTAL_SECRET`
 */
export async function fetchRemoteEntityLogo(
  entityId: string,
  token: string,
): Promise<RemoteLogoResult | null> {
  const base = getManagePublicBase();
  if (!base) return null;

  const secret = process.env.MANAGE_TRACKING_PORTAL_SECRET?.trim();
  const attempts: { url: string; headers?: HeadersInit }[] = [
    ...getManageStaticLogoUrls(entityId).map((url) => ({ url })),
  ];

  if (token) {
    attempts.push({
      url: `${base}/api/tracking/public/entity-logo?token=${encodeURIComponent(token)}`,
    });
  }

  attempts.push({
    url: `${base}/api/entities/${entityId}/logo/image`,
    headers: secret ? { "X-Tracking-Portal-Secret": secret } : undefined,
  });

  for (const { url, headers } of attempts) {
    try {
      const res = await fetch(url, { cache: "no-store", headers });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        contentType,
      };
    } catch {
      /* nächste Quelle */
    }
  }

  return null;
}

export function getLocalLogoContentType(filepath: string): string {
  return path.extname(filepath).toLowerCase() === ".png"
    ? "image/png"
    : "image/jpeg";
}
