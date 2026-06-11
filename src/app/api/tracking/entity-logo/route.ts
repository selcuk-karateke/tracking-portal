import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import {
  findLocalLogoPath,
  findRemoteManageLogoUrl,
  getLocalLogoContentType,
} from "@/lib/entity-logo";

type ApiError = {
  ok: false;
  error: { code: string; message: string };
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiError> {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return errorResponse(400, "token_missing", "Einladungs-Token fehlt.");
  }

  const resolved = await resolveEntityIdFromToken(token);
  if (!resolved.ok) {
    return errorResponse(403, "token_invalid", "Link ungültig.");
  }

  const localPath = findLocalLogoPath(resolved.entityId);
  if (localPath) {
    try {
      const buf = await fs.readFile(localPath);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": getLocalLogoContentType(localPath),
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (e) {
      console.error("[tracking] entity-logo local read", e);
    }
  }

  const remoteUrl = await findRemoteManageLogoUrl(resolved.entityId);
  if (remoteUrl) {
    try {
      const res = await fetch(remoteUrl, { cache: "no-store" });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? "image/png";
        return new NextResponse(buf, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    } catch (e) {
      console.error("[tracking] entity-logo remote fetch", e);
    }
  }

  return errorResponse(404, "logo_not_found", "Kein Shop-Logo hinterlegt.");
}
