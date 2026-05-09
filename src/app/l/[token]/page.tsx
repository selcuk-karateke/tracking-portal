import { TrackingForm } from "@/app/tracking-form";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function TrackingLinkPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex w-full flex-col gap-8">
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Tracking melden
          </h1>
          <h2 className="text-base font-medium text-gray-800 sm:text-lg">
            Bestellung und Sendung
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Bitte Bestellreferenz wie im Shop eintragen (z. B. #1001 oder 1001),
            danach Sendungsnummer und Versanddienst.
          </p>
        </div>
        <TrackingForm token={token} />
        <section
          id="portal-hilfe"
          className="scroll-mt-28 rounded-lg border border-gray-300 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="hilfe-form-heading"
        >
          <h2
            id="hilfe-form-heading"
            className="text-base font-semibold text-gray-900"
          >
            Hilfe
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-gray-600">
            <li>
              Tragen Sie oben Bestellnummer, Sendungsnummer und Versanddienst ein
              — oder wählen Sie eine Zeile in der Tabelle „Offene Bestellungen“,
              um die Bestellnummer zu übernehmen.
            </li>
            <li>
              Dieses Formular ist Teil der{" "}
              <strong>Kawai Labs Shopverwaltung</strong>.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
