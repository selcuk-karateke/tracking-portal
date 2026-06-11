import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import {
  findLocalLogoPath,
  getLocalLogoContentType,
  getManageLogoUrls,
} from "@/lib/entity-logo";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return new NextResponse(null, { status: 400 });
  }

  const resolved = await resolveEntityIdFromToken(token);
  if (!resolved.ok) {
    return new NextResponse(null, { status: 403 });
  }

  const localPath = findLocalLogoPath(resolved.entityId);
  if (localPath) {
    const buf = await fs.readFile(localPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": getLocalLogoContentType(localPath),
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  for (const url of getManageLogoUrls(resolved.entityId)) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        return new NextResponse(buf, {
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "image/png",
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    } catch {
      /* nächste Extension */
    }
  }

  return new NextResponse(null, { status: 404 });
}
