import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import {
  fetchRemoteEntityLogo,
  findLocalLogoPath,
  getLocalLogoContentType,
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
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": getLocalLogoContentType(localPath),
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const remote = await fetchRemoteEntityLogo(resolved.entityId, token);
  if (remote) {
    return new NextResponse(new Uint8Array(remote.buffer), {
      headers: {
        "Content-Type": remote.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
