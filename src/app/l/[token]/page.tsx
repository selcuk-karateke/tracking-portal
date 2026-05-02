import { TrackingForm } from "@/app/tracking-form";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function TrackingLinkPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
      <main className="flex w-full max-w-lg flex-col gap-8">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Tracking melden
          </h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Bitte Bestellreferenz, Sendungsnummer und Versanddienst eintragen.
          </p>
        </div>
        <TrackingForm token={token} />
      </main>
    </div>
  );
}
