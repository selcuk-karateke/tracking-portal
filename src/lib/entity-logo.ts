import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const LOGO_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

/** Wie Manage `lib/logo-utils.ts` — Datei unter `public/uploads/logos/{entityId}.(png|jpg|jpeg)`. */
export function entityHasUploadedLogoFile(entityId: string): boolean {
  return findLocalLogoPath(entityId) !== null;
}

export function findLocalLogoPath(entityId: string): string | null {
  for (const ext of LOGO_EXTENSIONS) {
    const filepath = path.join(UPLOAD_DIR, `${entityId}.${ext}`);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}

export function getLocalLogoContentType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

function managePublicBase(): string | null {
  const raw =
    process.env.MANAGE_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_MANAGE_PUBLIC_URL?.trim() ||
    "";
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** Öffentliche Static-URL auf Manage (ohne Session), falls Volume dort liegt. */
export function getManageStaticLogoUrls(entityId: string): string[] {
  const base = managePublicBase();
  if (!base) return [];
  return LOGO_EXTENSIONS.map((ext) => `${base}/uploads/logos/${entityId}.${ext}`);
}

export async function findRemoteManageLogoUrl(
  entityId: string,
): Promise<string | null> {
  for (const url of getManageStaticLogoUrls(entityId)) {
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (res.ok) return url;
    } catch {
      /* nächste Extension */
    }
  }
  return null;
}
