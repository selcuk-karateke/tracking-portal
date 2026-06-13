export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex w-full flex-col gap-6">
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Lieferanten-Tracking
          </h1>
          <h2 className="text-base font-medium text-gray-800 sm:text-lg">
            Persönlichen Link verwenden
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Bitte nutzen Sie den <strong>persönlichen Lieferanten-Link</strong>{" "}
            aus Ihrer Einladung (E-Mail oder Nachricht). Darin ist das Portal mit
            dem richtigen Kontext hinterlegt — ohne diesen Link kann keine
            Meldung zugeordnet werden.
          </p>
          <p className="text-sm leading-relaxed text-gray-500">
            Der Link beginnt typischerweise mit dem Pfad{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">
              /l/…
            </code>
            .
          </p>
        </div>

        <section
          id="portal-hilfe"
          className="scroll-mt-28 rounded-lg border border-gray-300 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="hilfe-heading"
        >
          <h2
            id="hilfe-heading"
            className="text-base font-semibold text-gray-900"
          >
            Hilfe
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Sie befinden sich im Lieferanten-Tracking der{" "}
            <strong>Kawai Labs Shopverwaltung</strong>. Wenn Sie keinen Link
            haben, wenden Sie sich bitte an Ihren Ansprechpartner.
          </p>
          <p className="mt-3 text-sm">
            <a
              href="/hilfe"
              className="font-medium text-gray-800 underline-offset-2 hover:underline"
            >
              Ausführliche Hilfe &amp; API für ERP
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
