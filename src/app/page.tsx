export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
      <main className="flex w-full max-w-lg flex-col gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Tracking melden
          </h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bitte nutzen Sie den <strong>persönlichen Lieferanten-Link</strong>{" "}
            aus Ihrer Einladung (E-Mail oder Nachricht von uns). Darin ist das
            Portal mit dem richtigen Kontext hinterlegt — ohne diesen Link kann
            keine Meldung zugeordnet werden.
          </p>
          <p className="text-sm leading-relaxed text-gray-500">
            Der Link beginnt typischerweise mit dem Pfad{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-800">
              /l/…
            </code>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
