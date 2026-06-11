import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import {
  fetchRemoteEntityLogo,
  findLocalLogoPath,
  getLocalLogoContentType,
} from "@/lib/entity-logo";
import { fetchShopifyBrandLogo } from "@/lib/shop-branding";

function logoResponse(buffer: Buffer, contentType: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

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
    return logoResponse(buf, getLocalLogoContentType(localPath));
  }

  const remote = await fetchRemoteEntityLogo(resolved.entityId, token);
  if (remote) {
    return logoResponse(remote.buffer, remote.contentType);
  }

  const shopify = await fetchShopifyBrandLogo(resolved.entityId);
  if (shopify) {
    return logoResponse(shopify.buffer, shopify.contentType);
  }

  return new NextResponse(null, { status: 404 });
}
