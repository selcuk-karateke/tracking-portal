import { NextRequest, NextResponse } from "next/server";
import type { ResolveFailureReason } from "@/lib/resolve-entity-from-token";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import {
  createFulfillmentForOrder,
  findOrderForReference,
  mapCarrierForShopify,
  type Carrier,
  type PartialFulfillmentErrorDetail,
  type ShopifyErrorCode,
} from "@/lib/shopify-fulfillment";
import {
  loadShopifyCredentials,
  type ShopifyCredentialReason,
} from "@/lib/shopify-credentials";
import {
  canonicalNumericShopifyOrderId,
  isOrderIdAllowedForSupplier,
} from "@/lib/shopify-order-id-match";
import { getAllowedShopifyOrderIdsForSupplier } from "@/lib/supplier-order-allowlist";
import { getVariantQuantitiesForSupplierOrder } from "@/lib/supplier-dispatch-variants";
import { isHubFulfillmentRunForSupplierOrder } from "@/lib/run-fulfillment-leg";

const CARRIERS = ["DHL", "DPD", "UPS", "Sonstiges"] as const;

function isCarrier(value: unknown): value is Carrier {
  return typeof value === "string" && CARRIERS.includes(value as Carrier);
}

type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details && Object.keys(details).length > 0 ? { details } : {}),
      },
    },
    { status },
  );
}

function formatVariantQtyList(byVariantId: Record<string, number>): string {
  return Object.entries(byVariantId)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => `${q}× Produktvariante (Shopify-ID ${id})`)
    .join(", ");
}

function messageForPartialFulfillmentFailure(
  detail: PartialFulfillmentErrorDetail | undefined,
  code: ShopifyErrorCode,
): { message: string; details?: Record<string, unknown> } {
  if (detail?.kind === "quantity_mismatch") {
    const list = formatVariantQtyList(detail.stillExpectedByVariantId);
    return {
      message: `Abgleich Shopify ↔ Shopverwaltung (Streckenlieferung): Für diese Bestellung ist bei Shopify für die folgenden Positionen nicht genug offene Versand-Menge vorhanden, obwohl die Shopverwaltung noch einen Versand erwartet: ${list}. Häufige Ursachen: Teillieferung oder komplette Lieferung ist in Shopify schon erfasst, Retoure, Teilstornierung oder die Bestellung wurde nachträglich geändert. Bitte den Betreiber der Shopverwaltung bitten, Bestellung und Dropshipping-Daten zu prüfen.`,
      details: { partialFulfillment: detail },
    };
  }
  if (detail?.kind === "no_matching_lines") {
    const list = formatVariantQtyList(detail.expectedByVariantId);
    return {
      message: `Abgleich Shopify ↔ Shopverwaltung (Streckenlieferung): Die Shopverwaltung erwartet einen Versand für: ${list}. In Shopify gibt es dafür keine offene Fulfillment-Zeile mit genau diesen Produktvarianten. Häufige Ursachen: falsche oder veraltete Varianten-ID in der Verwaltung, die Bestellung enthält andere Varianten, oder die Position ist in Shopify schon erfüllt/storniert. Bitte den Betreiber der Shopverwaltung bitten, Bestellung und gespeicherte Varianten-IDs zu prüfen.`,
      details: { partialFulfillment: detail },
    };
  }
  if (code === "partial_fulfillment_quantity_mismatch") {
    return {
      message:
        "Abgleich Shopify ↔ Shopverwaltung: Die zu erfüllenden Mengen passen nicht (Details fehlen in der Antwort — bitte erneut versuchen oder Betreiber informieren).",
    };
  }
  return {
    message:
      "Abgleich Shopify ↔ Shopverwaltung: Keine passenden Fulfillment-Positionen (Details fehlen in der Antwort — bitte erneut versuchen oder Betreiber informieren).",
  };
}

function responseForResolveFailure(reason: ResolveFailureReason): {
  status: number;
  code: string;
  message: string;
} {
  switch (reason) {
    case "manufacturer_email_missing":
      return {
        status: 403,
        code: "link_legacy_no_manufacturer_email",
        message:
          "Dieser Einladungs-Link ist veraltet (ohne Hersteller-Zuordnung). Bitte einen neuen Link in der Shopverwaltung anfordern.",
      };
    case "not_found":
      return {
        status: 401,
        code: "token_invalid",
        message: "Link ungültig oder unbekannt.",
      };
    case "revoked":
      return {
        status: 403,
        code: "token_revoked",
        message: "Link wurde widerrufen.",
      };
    case "expired":
      return {
        status: 403,
        code: "token_expired",
        message: "Link ist abgelaufen.",
      };
    case "not_configured":
      return {
        status: 503,
        code: "database_not_configured",
        message: "Dienst ist nicht konfiguriert (DATABASE_URL).",
      };
    case "db_unavailable":
      return {
        status: 503,
        code: "database_unavailable",
        message: "Datenbank vorübergehend nicht erreichbar.",
      };
  }
}

function responseForCredentialFailure(reason: ShopifyCredentialReason): {
  status: number;
  code: string;
  message: string;
} {
  switch (reason) {
    case "db_unavailable":
      return {
        status: 503,
        code: "credentials_unavailable",
        message: "Credential-Quelle ist nicht erreichbar.",
      };
    case "missing":
      return {
        status: 503,
        code: "shopify_credentials_missing",
        message:
          "Shopify-Zugang für diese Entität ist unvollständig (shopify_shop / shopify_access_token).",
      };
    case "decrypt_failed":
      return {
        status: 503,
        code: "shopify_token_decrypt_failed",
        message:
          "Shopify-Token konnte nicht entschlüsselt werden. ENCRYPTION_KEY prüfen.",
      };
  }
}

function responseForShopifyFailure(
  code: ShopifyErrorCode,
  partialDetail?: PartialFulfillmentErrorDetail,
  shopifyUserErrors?: string[],
): {
  status: number;
  message: string;
  details?: Record<string, unknown>;
} {
  switch (code) {
    case "order_reference_ambiguous":
      return {
        status: 400,
        message:
          "Bestellreferenz ist mehrdeutig. Bitte exakten Bestellnamen wie im Shop verwenden.",
      };
    case "order_not_found":
      return {
        status: 404,
        message: "Bestellung konnte nicht gefunden werden.",
      };
    case "fulfillment_order_not_found":
      return {
        status: 404,
        message: "Keine offene Fulfillment Order für diese Bestellung gefunden.",
      };
    case "partial_fulfillment_no_matching_lines": {
      const r = messageForPartialFulfillmentFailure(partialDetail, code);
      return {
        status: 400,
        message: r.message,
        ...(r.details ? { details: r.details } : {}),
      };
    }
    case "partial_fulfillment_quantity_mismatch": {
      const r = messageForPartialFulfillmentFailure(partialDetail, code);
      return {
        status: 400,
        message: r.message,
        ...(r.details ? { details: r.details } : {}),
      };
    }
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
    case "shopify_rejected": {
      const msgs =
        shopifyUserErrors?.filter((m) => typeof m === "string" && m.trim().length > 0) ??
        [];
      if (msgs.length > 0) {
        return {
          status: 502,
          message: `Shopify: ${msgs.join(" · ")}`,
          details: { shopifyUserErrors: msgs },
        };
      }
      return {
        status: 502,
        message: "Shopify hat die Anfrage abgelehnt.",
      };
    }
    case "invalid_input":
      return {
        status: 400,
        message: "Ungültige Eingabe für die Shopify-Verarbeitung.",
      };
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Ungültiger JSON-Body.");
  }

  if (!body || typeof body !== "object") {
    return errorResponse(400, "invalid_json", "Ungültiger JSON-Body.");
  }

  const { orderRef, trackingNumber, carrier, token } = body as Record<
    string,
    unknown
  >;

  if (typeof token !== "string" || token.trim() === "") {
    return errorResponse(400, "token_missing", "Einladungs-Token fehlt.");
  }

  if (typeof orderRef !== "string" || orderRef.trim() === "") {
    return errorResponse(400, "order_ref_missing", "Bestellnummer fehlt.");
  }

  if (typeof trackingNumber !== "string" || trackingNumber.trim() === "") {
    return errorResponse(
      400,
      "tracking_number_missing",
      "Sendungsnummer / Tracking fehlt.",
    );
  }

  if (!isCarrier(carrier)) {
    return errorResponse(
      400,
      "carrier_invalid",
      "Versanddienst fehlt oder ist ungültig.",
    );
  }

  const resolved = await resolveEntityIdFromToken(token.trim());
  if (!resolved.ok) {
    const { status, code, message } = responseForResolveFailure(resolved.reason);
    return errorResponse(status, code, message);
  }

  const credentials = await loadShopifyCredentials(resolved.entityId);
  if (!credentials.ok) {
    const { status, code, message } = responseForCredentialFailure(
      credentials.reason,
    );
    return errorResponse(status, code, message);
  }

  const orderResult = await findOrderForReference({
    shop: credentials.shop,
    accessToken: credentials.accessToken,
    orderRef: orderRef.trim(),
  });
  if (!orderResult.ok) {
    const failure = responseForShopifyFailure(orderResult.code);
    return errorResponse(failure.status, orderResult.code, failure.message);
  }

  const allowedIds = await getAllowedShopifyOrderIdsForSupplier(
    resolved.entityId,
    resolved.manufacturerEmail,
  );
  if (
    !isOrderIdAllowedForSupplier(orderResult.order, allowedIds)
  ) {
    return errorResponse(
      403,
      "order_not_allowed_for_supplier",
      "Diese Bestellung ist für Ihren Lieferanten-Zugang nicht freigegeben.",
    );
  }

  const orderNumeric = canonicalNumericShopifyOrderId(orderResult.order);
  if (
    orderNumeric &&
    (await isHubFulfillmentRunForSupplierOrder(
      resolved.entityId,
      resolved.manufacturerEmail,
      orderNumeric,
    ))
  ) {
    return errorResponse(
      409,
      "hub_order_no_supplier_fulfillment",
      "Zoll-/Hub-Bestellung: Nur an unser Lager liefern — kein Tracking für die Lager-Anlieferung. Versand an den Endkunden meldet der Händler.",
    );
  }

  const variantQuantities = await getVariantQuantitiesForSupplierOrder(
    resolved.entityId,
    resolved.manufacturerEmail,
    orderNumeric,
  );

  const fulfillmentResult = await createFulfillmentForOrder({
    shop: credentials.shop,
    accessToken: credentials.accessToken,
    orderId: orderResult.order.id,
    trackingNumber: trackingNumber.trim(),
    trackingCompany: mapCarrierForShopify(carrier),
    variantQuantities:
      variantQuantities.size > 0 ? variantQuantities : null,
  });
  if (!fulfillmentResult.ok) {
    const failure = responseForShopifyFailure(
      fulfillmentResult.code,
      fulfillmentResult.partialDetail,
      fulfillmentResult.shopifyUserErrors,
    );
    return errorResponse(
      failure.status,
      fulfillmentResult.code,
      failure.message,
      failure.details,
    );
  }

  const payload = {
    entityId: resolved.entityId,
    orderRef: orderResult.order.name,
    orderId: orderResult.order.id,
    trackingNumber: trackingNumber.trim(),
    carrier,
    fulfillmentId: fulfillmentResult.fulfillmentId,
  };
  console.log("[tracking]", payload);

  return NextResponse.json({
    ok: true,
    entityId: resolved.entityId,
    orderId: orderResult.order.id,
    orderName: orderResult.order.name,
    fulfillmentId: fulfillmentResult.fulfillmentId,
  });
}
