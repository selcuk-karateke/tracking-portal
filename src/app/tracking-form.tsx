"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ERROR_BANNER_CLASS,
  INFO_BANNER_CLASS,
  INNER_FORM_CLASS,
  INPUT_CLASS,
  MODULE_TABLE_WRAPPER_CLASS,
  PRIMARY_BUTTON_CLASS,
  SUCCESS_BANNER_CLASS,
} from "@/lib/design-classes";

const CARRIERS = ["DHL", "DPD", "UPS", "Sonstiges"] as const;

const SECONDARY_BTN =
  "inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type OpenOrderRow = {
  orderId: string;
  orderName: string;
  createdAt?: string;
  fulfillmentStatus?: string | null;
};

type PageInfo = { hasNextPage: boolean; endCursor: string | null };

type FulfillmentFilter = "open" | "unfulfilled" | "partial";

type Props = {
  /** Klartext-Token aus dem Einladungs-Link (dynamisches URL-Segment). */
  token: string;
};

export function TrackingForm({ token }: Props) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [orderRefValue, setOrderRefValue] = useState("");
  const [trackingValue, setTrackingValue] = useState("");
  const [carrierValue, setCarrierValue] = useState("");
  const [openOrders, setOpenOrders] = useState<OpenOrderRow[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [ordersState, setOrdersState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>("open");
  const [cursorAfter, setCursorAfter] = useState<string | undefined>(undefined);
  const [backStack, setBackStack] = useState<(string | undefined)[]>([]);

  const dismissFeedbackIfNeeded = useCallback(() => {
    setState((s) =>
      s.status === "success" || s.status === "error" ? { status: "idle" } : s,
    );
  }, []);

  const clientFieldMessage = useMemo(
    () => getClientValidationMessage(orderRefValue, trackingValue),
    [orderRefValue, trackingValue],
  );

  const carrierOk =
    carrierValue !== "" &&
    (CARRIERS as readonly string[]).includes(carrierValue);

  const canSubmit =
    clientFieldMessage === null &&
    carrierOk &&
    state.status !== "submitting";

  const loadPage = useCallback(
    async (after: string | undefined) => {
      setOrdersState("loading");
      setOrdersError(null);
      try {
        const params = new URLSearchParams({
          token,
          limit: "10",
        });
        if (after) params.set("after", after);
        if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
        if (fulfillmentFilter !== "open") {
          params.set("status", fulfillmentFilter);
        }

        const res = await fetch(`/api/tracking/open-orders?${params}`, {
          method: "GET",
        });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            data &&
              typeof data === "object" &&
              "error" in data
              ? extractErrorMessage((data as { error: unknown }).error)
              : `Fehler (${res.status})`,
          );
        }

        const orders =
          data &&
          typeof data === "object" &&
          "orders" in data &&
          Array.isArray((data as { orders: unknown }).orders)
            ? ((data as { orders: OpenOrderRow[] }).orders ?? [])
            : [];

        const piRaw =
          data &&
          typeof data === "object" &&
          "pageInfo" in data &&
          (data as { pageInfo: unknown }).pageInfo &&
          typeof (data as { pageInfo: unknown }).pageInfo === "object"
            ? (data as { pageInfo: PageInfo }).pageInfo
            : null;

        const pi: PageInfo = piRaw
          ? {
              hasNextPage: Boolean(piRaw.hasNextPage),
              endCursor:
                typeof piRaw.endCursor === "string" ? piRaw.endCursor : null,
            }
          : { hasNextPage: false, endCursor: null };

        setOpenOrders(orders);
        setPageInfo(pi);
        setOrdersState("loaded");
      } catch (e) {
        setOpenOrders([]);
        setPageInfo(null);
        setOrdersState("error");
        setOrdersError(
          e instanceof Error
            ? e.message
            : "Offene Bestellungen konnten nicht geladen werden.",
        );
      }
    },
    [token, appliedSearch, fulfillmentFilter],
  );

  const refreshFirstPage = useCallback(() => {
    setBackStack([]);
    setCursorAfter(undefined);
    void loadPage(undefined);
  }, [loadPage]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshFirstPage();
    });
  }, [refreshFirstPage]);

  function applySearch() {
    setAppliedSearch(searchDraft.trim());
  }

  function goNextPage() {
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;
    setBackStack((s) => [...s, cursorAfter]);
    const next = pageInfo.endCursor;
    setCursorAfter(next);
    void loadPage(next);
  }

  function goPrevPage() {
    if (backStack.length === 0) return;
    const stack = [...backStack];
    const prev = stack.pop();
    setBackStack(stack);
    setCursorAfter(prev);
    void loadPage(prev);
  }

  function onRowActivate(order: OpenOrderRow) {
    dismissFeedbackIfNeeded();
    setSelectedOrderId(order.orderId);
    setOrderRefValue(order.orderName);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const orderRef = orderRefValue.trim();
    const trackingNumber = trackingValue.trim();
    const carrier = carrierValue;

    const msg = getClientValidationMessage(orderRefValue, trackingValue);
    if (msg || !carrierOk) {
      setState({
        status: "error",
        message:
          msg ??
          "Bitte einen Versanddienst wählen.",
      });
      return;
    }

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
        setOrderRefValue("");
        setTrackingValue("");
        setCarrierValue("");
        setSelectedOrderId("");
        refreshFirstPage();
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
      <p className={INFO_BANNER_CLASS}>
        <span className="font-medium">Hinweis:</span> Sendungsnummer nur für den{" "}
        <strong>Versand an den Endkunden</strong> — nicht für Anlieferungen an
        Lager/Hub (z. B. Bonum).
      </p>
      <p className={INFO_BANNER_CLASS}>
        <span className="font-medium">Vertrauen:</span> Nur Links vom Betreiber
        der <strong>Kawai Labs Shopverwaltung</strong> nutzen.
      </p>

      {/* Pflichtfelder links, „Tracking melden“ rechts oben in dieser Zeile — über der Tabelle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-4">
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
              value={orderRefValue}
              onChange={(ev) => {
                dismissFeedbackIfNeeded();
                setOrderRefValue(ev.target.value);
              }}
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
              value={trackingValue}
              onChange={(ev) => {
                dismissFeedbackIfNeeded();
                setTrackingValue(ev.target.value);
              }}
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
              value={carrierValue}
              onChange={(ev) => {
                dismissFeedbackIfNeeded();
                setCarrierValue(ev.target.value);
              }}
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
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:min-w-[12rem] sm:items-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            title={
              canSubmit
                ? undefined
                : "Bestellnummer, Sendungsnummer (mind. 3 Zeichen) und Versanddienst ausfüllen."
            }
          >
            {state.status === "submitting" ? "Wird gesendet…" : "Tracking melden"}
          </button>
          {!canSubmit &&
            state.status !== "submitting" &&
            state.status !== "success" && (
            <p className="text-xs text-gray-500 sm:text-right">
              Zum Absenden: Bestellnummer, Sendungsnummer (mind. 3 Zeichen) und
              Versanddienst.
            </p>
          )}
        </div>
      </div>

      {ordersState === "loading" && cursorAfter === undefined && (
        <p className="text-xs text-gray-500">Lade offene Bestellungen…</p>
      )}
      {ordersState !== "idle" && (
        <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          {ordersState === "error" && ordersError && (
            <p className={`${ERROR_BANNER_CLASS} text-xs`} role="alert">
              {ordersError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
              Offene Bestellungen
            </span>
            <button
              type="button"
              onClick={() => refreshFirstPage()}
              className={SECONDARY_BTN}
            >
              Aktualisieren
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label
                htmlFor="openOrdersSearch"
                className="text-xs font-medium text-gray-700"
              >
                Suche (Bestellnr.)
              </label>
              <input
                id="openOrdersSearch"
                type="search"
                value={searchDraft}
                onChange={(ev) => setSearchDraft(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="z. B. 1001"
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-48">
              <label
                htmlFor="fulfillmentFilter"
                className="text-xs font-medium text-gray-700"
              >
                Fulfillment
              </label>
              <select
                id="fulfillmentFilter"
                value={fulfillmentFilter}
                onChange={(ev) =>
                  setFulfillmentFilter(ev.target.value as FulfillmentFilter)
                }
                className={INPUT_CLASS}
              >
                <option value="open">Offen (unerfüllt oder teilweise)</option>
                <option value="unfulfilled">Nur unerfüllt</option>
                <option value="partial">Nur teilweise erfüllt</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => applySearch()}
              className={`${SECONDARY_BTN} self-stretch sm:self-auto sm:px-4`}
            >
              Suchen
            </button>
          </div>

          {ordersState === "loaded" && !ordersError && (
            <div className={MODULE_TABLE_WRAPPER_CLASS}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm text-gray-900">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        Bestellnr.
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Datum
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {openOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-6 text-center text-sm text-gray-600"
                        >
                          Keine Treffer — Bestellnummer oben manuell eintragen.
                        </td>
                      </tr>
                    ) : (
                      openOrders.map((order) => {
                        const selected = order.orderId === selectedOrderId;
                        return (
                          <tr
                            key={order.orderId}
                            className={
                              selected
                                ? "cursor-pointer bg-blue-100 hover:bg-blue-100"
                                : "cursor-pointer hover:bg-blue-50"
                            }
                            onClick={() => onRowActivate(order)}
                          >
                            <td className="whitespace-nowrap px-3 py-2 font-medium">
                              {order.orderName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString(
                                    "de-DE",
                                  )
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {order.fulfillmentStatus ?? "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ordersState === "loaded" &&
            pageInfo &&
            !ordersError &&
            (openOrders.length > 0 ||
              backStack.length > 0 ||
              pageInfo.hasNextPage) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {openOrders.length > 0 ? (
                <p className="text-xs text-gray-500">
                  Zeile anklicken, um die Bestellnummer zu übernehmen.
                </p>
              ) : (
                <p className="text-xs text-gray-500">Leere Seite.</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goPrevPage()}
                  disabled={backStack.length === 0}
                  className={SECONDARY_BTN}
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={() => goNextPage()}
                  disabled={!pageInfo.hasNextPage}
                  className={SECONDARY_BTN}
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
          {ordersState === "loading" && cursorAfter !== undefined && (
            <p className="text-xs text-gray-500">Lade Seite…</p>
          )}
        </div>
      )}

      {state.status === "success" && (
        <p className={SUCCESS_BANNER_CLASS} role="status">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p className={ERROR_BANNER_CLASS} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Steuerzeichen / HTML-Klammern — Rest erlaubt (API prüft strenger). */
const DISALLOWED_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f<>]/;

/** Clientseitige Plausibilität — ersetzt keine API-Validierung. */
function getClientValidationMessage(
  orderRef: string,
  tracking: string,
): string | null {
  const o = orderRef.trim();
  const t = tracking.trim();
  if (o.length < 1) {
    return "Bitte eine Bestellnummer eintragen.";
  }
  if (o.length > 80) {
    return "Bestellnummer ist zu lang (max. 80 Zeichen).";
  }
  if (DISALLOWED_CHARS.test(o)) {
    return "Bestellnummer enthält ungültige Zeichen.";
  }
  if (t.length < 3) {
    return "Sendungsnummer: mindestens 3 Zeichen.";
  }
  if (t.length > 120) {
    return "Sendungsnummer ist zu lang (max. 120 Zeichen).";
  }
  if (DISALLOWED_CHARS.test(t)) {
    return "Sendungsnummer enthält ungültige Zeichen.";
  }
  return null;
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
