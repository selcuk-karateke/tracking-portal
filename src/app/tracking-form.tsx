"use client";

import { FormEvent, useState } from "react";
import {
  INNER_FORM_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/lib/design-classes";

const CARRIERS = ["DHL", "DPD", "UPS", "Sonstiges"] as const;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type Props = {
  /** Klartext-Token aus dem Einladungs-Link (dynamisches URL-Segment). */
  token: string;
};

export function TrackingForm({ token }: Props) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const orderRef = String(fd.get("orderRef") ?? "").trim();
    const trackingNumber = String(fd.get("trackingNumber") ?? "").trim();
    const carrier = String(fd.get("carrier") ?? "");

    setState({ status: "submitting" });

    try {
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          orderRef,
          trackingNumber,
          carrier,
        }),
      });

      const data: unknown = await res.json().catch(() => null);

      if (
        res.ok &&
        data &&
        typeof data === "object" &&
        "ok" in data &&
        (data as { ok: unknown }).ok === true
      ) {
        setState({
          status: "success",
          message: "Tracking wurde übermittelt.",
        });
        form.reset();
        return;
      }

      const errMsg =
        data &&
        typeof data === "object" &&
        "error" in data
          ? extractErrorMessage((data as { error: unknown }).error)
          : `Fehler (${res.status})`;
      setState({ status: "error", message: errMsg });
    } catch {
      setState({
        status: "error",
        message: "Netzwerkfehler. Bitte erneut versuchen.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className={INNER_FORM_CLASS} noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="orderRef" className="text-sm font-medium text-gray-900">
          Bestellnummer <span className="text-red-600">*</span>
        </label>
        <input
          id="orderRef"
          name="orderRef"
          type="text"
          autoComplete="off"
          placeholder="z. B. #1001 oder 1001"
          required
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="trackingNumber"
          className="text-sm font-medium text-gray-900"
        >
          Sendungsnummer / Tracking <span className="text-red-600">*</span>
        </label>
        <input
          id="trackingNumber"
          name="trackingNumber"
          type="text"
          autoComplete="off"
          required
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="carrier" className="text-sm font-medium text-gray-900">
          Versanddienst <span className="text-red-600">*</span>
        </label>
        <select
          id="carrier"
          name="carrier"
          required
          defaultValue=""
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={state.status === "submitting"}
        className={PRIMARY_BUTTON_CLASS}
      >
        {state.status === "submitting" ? "Wird gesendet…" : "Tracking melden"}
      </button>

      {(state.status === "success" || state.status === "error") && (
        <p
          className={
            state.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-red-700"
          }
          role="status"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Unbekannter Fehler";
}
