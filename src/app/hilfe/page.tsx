import type { Metadata } from "next";
import Link from "next/link";
import { buildTrackingHref } from "@/lib/access-key";
import { getPortalBaseUrl } from "@/lib/portal-base-url";
import { resolveEntityIdFromToken } from "@/lib/resolve-entity-from-token";
import { resolveShopBrandingForEntity } from "@/lib/shop-branding";

export const metadata: Metadata = {
  title: "Hilfe",
  description:
    "Anleitung für Lieferanten: Formular und API zum Melden von Sendungsnummern.",
};

const ERROR_CODES = [
  "token_invalid",
  "token_revoked",
  "order_ref_missing",
  "tracking_number_missing",
  "carrier_invalid",
  "order_not_found",
] as const;

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function HilfePage({ searchParams }: PageProps) {
  const { token: rawAccessKey } = await searchParams;
  const accessKey = rawAccessKey?.trim() || null;

  let shopName: string | null = null;
  if (accessKey) {
    const resolved = await resolveEntityIdFromToken(accessKey);
    if (resolved.ok) {
      const branding = await resolveShopBrandingForEntity(
        resolved.entityId,
        accessKey,
      );
      shopName = branding.shopName;
    }
  }

  const baseUrl = await getPortalBaseUrl();
  const apiUrl = `${baseUrl}/api/tracking`;
  const formExampleUrl = accessKey
    ? `${baseUrl}${buildTrackingHref(accessKey)}`
    : `${baseUrl}/l/ihr-name`;
  const backHref = accessKey ? buildTrackingHref(accessKey) : "/";

  const curlExample = `curl -sS -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "IHR_TOKEN",
    "orderRef": "1001",
    "trackingNumber": "1234567890",
    "carrier": "DHL"
  }'`;

  const jsonExample = `{
  "token": "IHR_64_ZEICHEN_TOKEN",
  "orderRef": "1001",
  "trackingNumber": "12345678901234",
  "carrier": "DHL"
}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Hilfe für Lieferanten
          </h1>
          <p className="text-sm leading-relaxed text-gray-600">
            {shopName ? (
              <>
                Sendungsnummern an <strong>{shopName}</strong> melden — im
                Browser oder per API aus Ihrem ERP.
              </>
            ) : (
              <>
                Sendungsnummern an Ihren Händler melden — im Browser oder per
                API aus Ihrem ERP.
              </>
            )}
          </p>
        </header>

        <section
          className="rounded-lg border border-gray-300 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="formular-heading"
        >
          <h2
            id="formular-heading"
            className="text-base font-semibold text-gray-900"
          >
            Formular im Browser
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-gray-600">
            <li>
              Nutzen Sie den <strong>persönlichen Link</strong> vom Händler (z. B.{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                {formExampleUrl}
              </code>
              ).
            </li>
            <li>
              Sendungsnummer nur für den <strong>Versand an den Endkunden</strong>{" "}
              — nicht für Lieferungen an Lager/Hub (z. B. Bonum bei Zoll).
            </li>
            <li>
              Bestellnummer wie im Shop (z. B. <strong>#1001</strong> oder{" "}
              <strong>1001</strong>), Sendungsnummer und Versanddienst eintragen.
            </li>
            <li>
              Oder eine Zeile unter „Offene Bestellungen“ anklicken — die
              Bestellnummer wird übernommen.
            </li>
          </ul>
        </section>

        <section
          id="api"
          className="scroll-mt-28 rounded-lg border border-gray-300 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="api-heading"
        >
          <h2
            id="api-heading"
            className="text-base font-semibold text-gray-900"
          >
            API (ERP / Warenwirtschaft)
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Für automatische Übermittlung aus Ihrem System. Der Händler gibt Ihnen
            dafür einen <strong>Einladungs-Token</strong> (64 Zeichen, wie ein
            Passwort) — <strong>nicht</strong> die Kurz-URL{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">/l/…</code>.
          </p>

          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-800">Endpunkt</p>
              <pre className="mt-1 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
                {`POST ${apiUrl}\nContent-Type: application/json`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-800">Felder (JSON)</p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="border-b border-gray-200 px-3 py-2 font-medium">
                        Feld
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 font-medium">
                        Pflicht
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 font-medium">
                        Beschreibung
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr>
                      <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs">
                        token
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">ja</td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        Einladungs-Token vom Händler
                      </td>
                    </tr>
                    <tr>
                      <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs">
                        orderRef
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">ja</td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        Bestellnummer wie im Shop
                      </td>
                    </tr>
                    <tr>
                      <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs">
                        trackingNumber
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2">ja</td>
                      <td className="border-b border-gray-100 px-3 py-2">
                        Sendungs-/Trackingnummer
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono text-xs">carrier</td>
                      <td className="px-3 py-2">ja</td>
                      <td className="px-3 py-2">
                        <code className="text-xs">DHL</code>,{" "}
                        <code className="text-xs">DPD</code>,{" "}
                        <code className="text-xs">UPS</code> oder{" "}
                        <code className="text-xs">Sonstiges</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-800">Beispiel (JSON)</p>
              <pre className="mt-1 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
                {jsonExample}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-800">cURL</p>
              <pre className="mt-1 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap">
                {curlExample}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-800">Erfolg (HTTP 200)</p>
              <pre className="mt-1 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
                {`{
  "ok": true,
  "orderName": "#1001",
  "fulfillmentId": "…"
}`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-800">Fehler</p>
              <p className="mt-1 text-gray-600">
                Antwort enthält{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  ok: false
                </code>{" "}
                und{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  error.code
                </code>
                . Häufige Codes:{" "}
                {ERROR_CODES.map((code, i) => (
                  <span key={code}>
                    {i > 0 ? ", " : ""}
                    <code className="text-xs">{code}</code>
                  </span>
                ))}
                .
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Wichtig</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Token geheim halten — nicht weitergeben.</li>
            <li>
              Nur Bestellungen melden, die Ihnen der Händler per Dropshipping
              zugewiesen hat.
            </li>
            <li>
              Bei Mischbestellungen werden nur Ihre Artikelpositionen als
              versendet markiert.
            </li>
            <li>
              Token ungültig? Händler kontaktieren — neuen Link anfordern.
            </li>
          </ul>
        </section>

        <p className="text-sm text-gray-500">
          <Link
            href={backHref}
            className="font-medium text-gray-700 underline-offset-2 hover:underline"
          >
            ← {accessKey ? "Zum Formular" : "Zur Startseite"}
          </Link>
        </p>
      </div>
    </div>
  );
}
