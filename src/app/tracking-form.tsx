"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
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
  const orderRefInputRef = useRef<HTMLInputElement>(null);

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
    setSelectedOrderId(order.orderId);
    const input = orderRefInputRef.current;
    if (input) {
      input.value = order.orderName;
    }
  }

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
        <span className="font-medium">Hinweis:</span> Dieses Formular gehört zur{" "}
        <strong>Kawai Labs Shopverwaltung</strong>. Nutzen Sie nur Links, die Sie
        vom Betreiber erhalten haben.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="orderRef" className="text-sm font-medium text-gray-900">
          Bestellnummer <span className="text-red-600">*</span>
        </label>
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
                            Keine Treffer — Bestellnummer unten manuell eintragen.
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
        <input
          ref={orderRefInputRef}
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
