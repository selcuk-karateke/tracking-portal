import { NextRequest, NextResponse } from "next/server";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import { resolveShopBrandingForEntity } from "@/lib/shop-branding";

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
    const map: Record<string, { status: number; code: string; message: string }> =
      {
        not_found: {
          status: 401,
          code: "token_invalid",
          message: "Link ungültig oder unbekannt.",
        },
        revoked: {
          status: 403,
          code: "token_revoked",
          message: "Link wurde widerrufen.",
        },
        expired: {
          status: 403,
          code: "token_expired",
          message: "Link ist abgelaufen.",
        },
        manufacturer_email_missing: {
          status: 403,
          code: "link_legacy_no_manufacturer_email",
          message:
            "Dieser Einladungs-Link ist veraltet (ohne Hersteller-Zuordnung). Bitte einen neuen Link in der Shopverwaltung anfordern.",
        },
        not_configured: {
          status: 503,
          code: "database_not_configured",
          message: "Dienst ist nicht konfiguriert (DATABASE_URL).",
        },
        db_unavailable: {
          status: 503,
          code: "database_unavailable",
          message: "Datenbank vorübergehend nicht erreichbar.",
        },
      };
    const entry = map[resolved.reason];
    return errorResponse(entry.status, entry.code, entry.message);
  }

  const branding = await resolveShopBrandingForEntity(resolved.entityId);

  return NextResponse.json({
    ok: true,
    entityId: resolved.entityId,
    shopName: branding.shopName,
    logoUrl: branding.logoUrl,
  });
}
