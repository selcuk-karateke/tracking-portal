import { NextRequest, NextResponse } from "next/server";
import type { ResolveFailureReason } from "@/lib/resolve-entity-from-token";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";

const CARRIERS = ["DHL", "DPD", "UPS", "Sonstiges"] as const;
type Carrier = (typeof CARRIERS)[number];

function isCarrier(value: unknown): value is Carrier {
  return typeof value === "string" && CARRIERS.includes(value as Carrier);
}

function responseForResolveFailure(reason: ResolveFailureReason): {
  status: number;
  error: string;
} {
  switch (reason) {
    case "not_found":
      return { status: 401, error: "Link ungültig oder unbekannt." };
    case "revoked":
      return { status: 403, error: "Link wurde widerrufen." };
    case "expired":
      return { status: 403, error: "Link ist abgelaufen." };
    case "not_configured":
      return {
        status: 503,
        error: "Dienst ist nicht konfiguriert (DATABASE_URL).",
      };
    case "db_unavailable":
      return {
        status: 503,
        error: "Datenbank vorübergehend nicht erreichbar.",
      };
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiger JSON-Body." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Ungültiger JSON-Body." },
      { status: 400 },
    );
  }

  const { orderRef, trackingNumber, carrier, token } = body as Record<
    string,
    unknown
  >;

  if (typeof token !== "string" || token.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "Einladungs-Token fehlt." },
      { status: 400 },
    );
  }

  if (typeof orderRef !== "string" || orderRef.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "Bestellnummer fehlt." },
      { status: 400 },
    );
  }

  if (typeof trackingNumber !== "string" || trackingNumber.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "Sendungsnummer / Tracking fehlt." },
      { status: 400 },
    );
  }

  if (!isCarrier(carrier)) {
    return NextResponse.json(
      { ok: false, error: "Versanddienst fehlt oder ist ungültig." },
      { status: 400 },
    );
  }

  const resolved = await resolveEntityIdFromToken(token.trim());
  if (!resolved.ok) {
    const { status, error } = responseForResolveFailure(resolved.reason);
    return NextResponse.json({ ok: false, error }, { status });
  }

  const payload = {
    entityId: resolved.entityId,
    orderRef: orderRef.trim(),
    trackingNumber: trackingNumber.trim(),
    carrier,
  };
  console.log("[tracking]", payload);

  return NextResponse.json({ ok: true });
}
