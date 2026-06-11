import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const LOGO_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

export function findLocalLogoPath(entityId: string): string | null {
  for (const ext of LOGO_EXTENSIONS) {
    const filepath = path.join(UPLOAD_DIR, `${entityId}.${ext}`);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}

export function getManageLogoUrls(entityId: string): string[] {
  const base = process.env.MANAGE_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (!base) return [];
  return LOGO_EXTENSIONS.map((ext) => `${base}/uploads/logos/${entityId}.${ext}`);
}

export function getLocalLogoContentType(filepath: string): string {
  return path.extname(filepath).toLowerCase() === ".png"
    ? "image/png"
    : "image/jpeg";
}
