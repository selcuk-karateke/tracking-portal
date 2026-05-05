import { NextRequest, NextResponse } from "next/server";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import { loadShopifyCredentials } from "@/lib/shopify-credentials";
import { listOpenOrders, type ShopifyErrorCode } from "@/lib/shopify-fulfillment";

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
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

function parseLimit(value: string | null): number {
  const n = Number(value ?? "10");
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(Math.floor(n), 25));
}

function mapShopifyError(code: ShopifyErrorCode): { status: number; message: string } {
  switch (code) {
    case "shop_domain_invalid":
      return {
        status: 400,
        message:
          "Shop-Domain in den Credentials ist ungültig. Bitte shopify_shop prüfen.",
      };
    case "shop_domain_not_resolvable":
      return {
        status: 503,
        message:
          "Shop-Domain ist nicht auflösbar. Bitte shopify_shop in den Credentials prüfen.",
      };
    case "shopify_unreachable":
      return {
        status: 503,
        message: "Shopify ist aktuell nicht erreichbar (Netzwerk/Timeout).",
      };
    case "shopify_unavailable":
      return {
        status: 502,
        message: "Shopify API ist aktuell nicht erreichbar.",
      };
    case "shopify_rejected":
      return {
        status: 502,
        message: "Shopify hat die Anfrage abgelehnt.",
      };
    default:
      return {
        status: 400,
        message: "Offene Bestellungen konnten nicht geladen werden.",
      };
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return errorResponse(400, "token_missing", "Einladungs-Token fehlt.");
  }

  const resolved = await resolveEntityIdFromToken(token);
  if (!resolved.ok) {
    const map: Record<string, { status: number; code: string; message: string }> = {
      not_found: { status: 401, code: "token_invalid", message: "Link ungültig oder unbekannt." },
      revoked: { status: 403, code: "token_revoked", message: "Link wurde widerrufen." },
      expired: { status: 403, code: "token_expired", message: "Link ist abgelaufen." },
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

  const credentials = await loadShopifyCredentials(resolved.entityId);
  if (!credentials.ok) {
    const map: Record<string, { status: number; code: string; message: string }> = {
      db_unavailable: {
        status: 503,
        code: "credentials_unavailable",
        message: "Credential-Quelle ist nicht erreichbar.",
      },
      missing: {
        status: 503,
        code: "shopify_credentials_missing",
        message:
          "Shopify-Zugang für diese Entität ist unvollständig (shopify_shop / shopify_access_token).",
      },
      decrypt_failed: {
        status: 503,
        code: "shopify_token_decrypt_failed",
        message:
          "Shopify-Token konnte nicht entschlüsselt werden. ENCRYPTION_KEY prüfen.",
      },
    };
    const entry = map[credentials.reason];
    return errorResponse(entry.status, entry.code, entry.message);
  }

  const result = await listOpenOrders({
    shop: credentials.shop,
    accessToken: credentials.accessToken,
    limit: parseLimit(request.nextUrl.searchParams.get("limit")),
  });

  if (!result.ok) {
    const mapped = mapShopifyError(result.code);
    return errorResponse(mapped.status, result.code, mapped.message);
  }

  return NextResponse.json({
    ok: true,
    entityId: resolved.entityId,
    orders: result.orders,
  });
}
