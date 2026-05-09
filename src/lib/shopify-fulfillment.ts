const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || "2026-01";

const CARRIER_MAP = {
  DHL: "DHL",
  DPD: "DPD",
  UPS: "UPS",
  Sonstiges: undefined,
} as const;

export type Carrier = keyof typeof CARRIER_MAP;

export function mapCarrierForShopify(carrier: Carrier): string | undefined {
  return CARRIER_MAP[carrier];
}

type GraphqlResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  code: ShopifyErrorCode;
};

type OrderNode = {
  id: string;
  name: string;
  legacyResourceId?: string | null;
  createdAt?: string;
};

export type ShopifyErrorCode =
  | "invalid_input"
  | "order_not_found"
  | "order_reference_ambiguous"
  | "fulfillment_order_not_found"
  | "partial_fulfillment_no_matching_lines"
  | "partial_fulfillment_quantity_mismatch"
  | "shop_domain_invalid"
  | "shop_domain_not_resolvable"
  | "shopify_unreachable"
  | "shopify_unavailable"
  | "shopify_rejected";

/** Zusatzinfos für API/UI bei Teil-Fulfillment-Fehlern (Variante = numerische Shopify-Varianten-ID). */
export type PartialFulfillmentErrorDetail =
  | {
      kind: "quantity_mismatch";
      /** Noch zu erfüllende Stückzahl pro Varianten-ID laut Shopverwaltung, die Shopify nicht abdecken konnte */
      stillExpectedByVariantId: Record<string, number>;
    }
  | {
      kind: "no_matching_lines";
      /** Erwartet laut Shopverwaltung (Dropshipping-Dispatch), aber keine passende offene FO-Zeile in Shopify */
      expectedByVariantId: Record<string, number>;
    };

export async function findOrderForReference(params: {
  shop: string;
  accessToken: string;
  orderRef: string;
}): Promise<
  | { ok: true; order: OrderNode }
  | { ok: false; code: ShopifyErrorCode }
> {
  const normalized = normalizeOrderRef(params.orderRef);
  if (!normalized) {
    return { ok: false, code: "invalid_input" };
  }
  const normalizedShop = normalizeShopDomain(params.shop);
  if (!normalizedShop.ok) {
    return normalizedShop;
  }

  const refForName = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const queryVariants = Array.from(new Set([`#${refForName}`, refForName]));

  const candidates = new Map<string, OrderNode>();
  for (const variant of queryVariants) {
    const search = await queryOrdersByName({
      shop: normalizedShop.shop,
      accessToken: params.accessToken,
      queryRef: variant,
    });
    if (!search.ok) {
      return { ok: false, code: search.code };
    }
    for (const order of search.data) {
      if (normalizeOrderRef(order.name) === normalizeOrderRef(variant)) {
        candidates.set(order.id, order);
      }
    }
  }

  if (candidates.size === 1) {
    return { ok: true, order: [...candidates.values()][0] };
  }
  if (candidates.size > 1) {
    return { ok: false, code: "order_reference_ambiguous" };
  }

  if (/^\d{1,13}$/.test(refForName)) {
    const byId = await queryOrderByNumericId({
      shop: normalizedShop.shop,
      accessToken: params.accessToken,
      numericId: refForName,
    });
    return byId.ok ? { ok: true, order: byId.data } : { ok: false, code: byId.code };
  }

  return { ok: false, code: "order_not_found" };
}

export async function createFulfillmentForOrder(params: {
  shop: string;
  accessToken: string;
  orderId: string;
  trackingNumber: string;
  trackingCompany?: string;
  /** Numerische Variant-IDs → Stückzahl (aus Manage `DropshippingDispatch`). Leer = alle offenen Positionen (Legacy). */
  variantQuantities?: Map<string, number> | null;
}): Promise<
  | { ok: true; fulfillmentId: string }
  | {
      ok: false;
      code: ShopifyErrorCode;
      partialDetail?: PartialFulfillmentErrorDetail;
    }
> {
  const normalizedShop = normalizeShopDomain(params.shop);
  if (!normalizedShop.ok) {
    return normalizedShop;
  }

  const fulfillmentOrders = await queryFulfillmentOrders({
    shop: normalizedShop.shop,
    accessToken: params.accessToken,
    orderId: params.orderId,
  });
  if (!fulfillmentOrders.ok) {
    return fulfillmentOrders;
  }

  const open = fulfillmentOrders.data.filter((fo) =>
    fo.lineItems.nodes.some((item) => item.remainingQuantity > 0),
  );
  if (open.length === 0) {
    return { ok: false, code: "fulfillment_order_not_found" };
  }

  const usePartial =
    params.variantQuantities != null && params.variantQuantities.size > 0;

  let lineItemsByFulfillmentOrder: Array<{
    fulfillmentOrderId: string;
    fulfillmentOrderLineItems?: Array<{ id: string; quantity: number }>;
  }>;

  if (usePartial) {
    const built = buildPartialFulfillmentPayload(open, params.variantQuantities!);
    if (!built.ok) {
      return {
        ok: false,
        code: built.code,
        partialDetail: built.detail,
      };
    }
    lineItemsByFulfillmentOrder = built.value;
  } else {
    lineItemsByFulfillmentOrder = open.map((fo) => ({
      fulfillmentOrderId: fo.id,
    }));
  }

  const mutation = await graphqlRequest<{
    fulfillmentCreate: {
      fulfillment: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>({
    shop: normalizedShop.shop,
    accessToken: params.accessToken,
    query: `mutation createFulfillment($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
        }
        userErrors {
          message
        }
      }
    }`,
    variables: {
      fulfillment: {
        lineItemsByFulfillmentOrder,
        trackingInfo: {
          number: params.trackingNumber,
          company: params.trackingCompany,
        },
        notifyCustomer: true,
      },
    },
  });

  if (!mutation.ok) {
    return mutation;
  }

  const userErrors = mutation.data.fulfillmentCreate.userErrors;
  if (userErrors.length > 0 || !mutation.data.fulfillmentCreate.fulfillment) {
    return { ok: false, code: "shopify_rejected" };
  }

  return {
    ok: true,
    fulfillmentId: mutation.data.fulfillmentCreate.fulfillment.id,
  };
}

type FulfillmentOrderOpenNode = {
  id: string;
  lineItems: {
    nodes: Array<{
      id: string;
      remainingQuantity: number;
      lineItem: { variant: { id: string } | null } | null;
    }>;
  };
};

function variantGidToNumeric(gid: string | null | undefined): string | null {
  if (!gid || typeof gid !== "string") return null;
  const m = /^gid:\/\/shopify\/ProductVariant\/(\d+)$/i.exec(gid.trim());
  return m ? m[1] : null;
}

function buildPartialFulfillmentPayload(
  openFos: FulfillmentOrderOpenNode[],
  needIn: Map<string, number>,
):
  | {
      ok: true;
      value: Array<{
        fulfillmentOrderId: string;
        fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
      }>;
    }
  | {
      ok: false;
      code: ShopifyErrorCode;
      detail: PartialFulfillmentErrorDetail;
    } {
  const remaining = new Map(needIn);
  const result: Array<{
    fulfillmentOrderId: string;
    fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
  }> = [];

  for (const fo of openFos) {
    const items: Array<{ id: string; quantity: number }> = [];
    for (const node of fo.lineItems.nodes) {
      if (node.remainingQuantity <= 0) continue;
      const vid = variantGidToNumeric(node.lineItem?.variant?.id ?? undefined);
      if (!vid) continue;
      const needQty = remaining.get(vid);
      if (needQty === undefined || needQty <= 0) continue;
      const q = Math.min(node.remainingQuantity, needQty);
      if (q <= 0) continue;
      items.push({ id: node.id, quantity: q });
      remaining.set(vid, needQty - q);
    }
    if (items.length > 0) {
      result.push({
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems: items,
      });
    }
  }

  const stillExpected: Record<string, number> = {};
  for (const [vid, v] of remaining) {
    if (v > 0) stillExpected[vid] = v;
  }
  if (Object.keys(stillExpected).length > 0) {
    return {
      ok: false,
      code: "partial_fulfillment_quantity_mismatch",
      detail: { kind: "quantity_mismatch", stillExpectedByVariantId: stillExpected },
    };
  }

  if (result.length === 0) {
    return {
      ok: false,
      code: "partial_fulfillment_no_matching_lines",
      detail: {
        kind: "no_matching_lines",
        expectedByVariantId: Object.fromEntries(needIn),
      },
    };
  }

  return { ok: true, value: result };
}

export type OpenOrdersFulfillmentFilter = "open" | "unfulfilled" | "partial";

export async function listOpenOrders(params: {
  shop: string;
  accessToken: string;
  limit: number;
  after?: string | null;
  search?: string;
  fulfillmentFilter?: OpenOrdersFulfillmentFilter;
}): Promise<
  | {
      ok: true;
      orders: Array<{
        orderId: string;
        legacyResourceId: string | null;
        orderName: string;
        createdAt?: string;
        fulfillmentStatus: string | null;
      }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    }
  | { ok: false; code: ShopifyErrorCode }
> {
  const normalizedShop = normalizeShopDomain(params.shop);
  if (!normalizedShop.ok) {
    return normalizedShop;
  }

  const cap = Math.max(1, Math.min(params.limit, 25));
  const filter = params.fulfillmentFilter ?? "open";
  let fulfillmentClause: string;
  if (filter === "unfulfilled") {
    fulfillmentClause = "fulfillment_status:unfulfilled";
  } else if (filter === "partial") {
    fulfillmentClause = "fulfillment_status:partial";
  } else {
    fulfillmentClause =
      "(fulfillment_status:unfulfilled OR fulfillment_status:partial)";
  }

  const search = params.search?.trim() ?? "";
  const nameClause =
    search !== ""
      ? ` AND name:*${escapeShopifyQueryToken(search.replace(/^#+/, ""))}*`
      : "";

  const queryString = `${fulfillmentClause}${nameClause}`;

  const result = await graphqlRequest<{
    orders: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        id: string;
        legacyResourceId: string | null;
        name: string;
        createdAt: string;
        displayFulfillmentStatus: string | null;
      }>;
    };
  }>({
    shop: normalizedShop.shop,
    accessToken: params.accessToken,
    query: `query openOrders($first: Int!, $after: String, $q: String!) {
      orders(first: $first, after: $after, query: $q, sortKey: CREATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          legacyResourceId
          name
          createdAt
          displayFulfillmentStatus
        }
      }
    }`,
    variables: {
      first: cap,
      after: params.after?.trim() || null,
      q: queryString,
    },
  });
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    orders: result.data.orders.nodes.map((order) => ({
      orderId: order.id,
      legacyResourceId: order.legacyResourceId ?? null,
      orderName: order.name,
      createdAt: order.createdAt,
      fulfillmentStatus: order.displayFulfillmentStatus,
    })),
    pageInfo: {
      hasNextPage: result.data.orders.pageInfo.hasNextPage,
      endCursor: result.data.orders.pageInfo.endCursor,
    },
  };
}

function escapeShopifyQueryToken(raw: string): string {
  return raw.replace(/["\\]/g, "\\$&");
}

function normalizeOrderRef(value: string): string {
  return value.trim().replace(/^#+/, "#");
}

function normalizeShopDomain(shop: string):
  | { ok: true; shop: string }
  | { ok: false; code: ShopifyErrorCode } {
  const raw = shop.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!raw) {
    return { ok: false, code: "shop_domain_invalid" };
  }

  const candidate = raw.includes(".") ? raw : `${raw}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(candidate)) {
    return { ok: false, code: "shop_domain_invalid" };
  }
  if (candidate.includes("..") || candidate.startsWith(".") || candidate.endsWith(".")) {
    return { ok: false, code: "shop_domain_invalid" };
  }

  return { ok: true, shop: candidate };
}

async function queryOrdersByName(params: {
  shop: string;
  accessToken: string;
  queryRef: string;
}): Promise<GraphqlResult<OrderNode[]>> {
  const result = await graphqlRequest<{
    orders: { nodes: OrderNode[] };
  }>({
    shop: params.shop,
    accessToken: params.accessToken,
    query: `query findOrderByName($q: String!) {
      orders(first: 5, query: $q, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          name
          legacyResourceId
          createdAt
        }
      }
    }`,
    variables: {
      q: `name:${params.queryRef}`,
    },
  });
  return result.ok ? { ok: true, data: result.data.orders.nodes } : result;
}

async function queryOrderByNumericId(params: {
  shop: string;
  accessToken: string;
  numericId: string;
}): Promise<GraphqlResult<OrderNode>> {
  const gid = `gid://shopify/Order/${params.numericId}`;
  const result = await graphqlRequest<{
    order: OrderNode | null;
  }>({
    shop: params.shop,
    accessToken: params.accessToken,
    query: `query orderById($id: ID!) {
      order(id: $id) {
        id
        name
        legacyResourceId
        createdAt
      }
    }`,
    variables: { id: gid },
  });
  if (!result.ok) {
    return result;
  }
  if (!result.data.order) {
    return { ok: false, code: "order_not_found" };
  }
  return { ok: true, data: result.data.order };
}

async function queryFulfillmentOrders(params: {
  shop: string;
  accessToken: string;
  orderId: string;
}): Promise<GraphqlResult<FulfillmentOrderOpenNode[]>> {
  const result = await graphqlRequest<{
    order: {
      fulfillmentOrders: {
        nodes: Array<{
          id: string;
          lineItems: {
            nodes: Array<{
              id: string;
              remainingQuantity: number;
              lineItem: { variant: { id: string } | null } | null;
            }>;
          };
        }>;
      };
    } | null;
  }>({
    shop: params.shop,
    accessToken: params.accessToken,
    query: `query fulfillmentOrdersForOrder($id: ID!) {
      order(id: $id) {
        fulfillmentOrders(first: 20) {
          nodes {
            id
            lineItems(first: 100) {
              nodes {
                id
                remainingQuantity
                lineItem {
                  variant {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }`,
    variables: { id: params.orderId },
  });

  if (!result.ok) {
    return result;
  }
  if (!result.data.order) {
    return { ok: false, code: "order_not_found" };
  }

  return { ok: true, data: result.data.order.fulfillmentOrders.nodes };
}

async function graphqlRequest<T>(params: {
  shop: string;
  accessToken: string;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<GraphqlResult<T>> {
  const url = `https://${params.shop}/admin/api/${API_VERSION}/graphql.json`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": params.accessToken,
      },
      body: JSON.stringify({
        query: params.query,
        variables: params.variables ?? {},
      }),
    });
  } catch (error) {
    console.error("[tracking] shopify request failed", error);
    return { ok: false, code: mapNetworkErrorToCode(error) };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, code: "shopify_unavailable" };
  }

  if (!response.ok) {
    return { ok: false, code: "shopify_unavailable" };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, code: "shopify_unavailable" };
  }

  const errors = (payload as { errors?: unknown }).errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return { ok: false, code: "shopify_rejected" };
  }

  const data = (payload as { data?: T }).data;
  if (!data) {
    return { ok: false, code: "shopify_rejected" };
  }

  return { ok: true, data };
}

function mapNetworkErrorToCode(error: unknown): ShopifyErrorCode {
  const maybeObject = error && typeof error === "object" ? error : null;
  const cause = maybeObject && "cause" in maybeObject
    ? (maybeObject as { cause?: unknown }).cause
    : undefined;

  const code = extractErrorCode(maybeObject) ?? extractErrorCode(cause);
  if (code === "ENOTFOUND") {
    return "shop_domain_not_resolvable";
  }
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "EHOSTUNREACH" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return "shopify_unreachable";
  }
  return "shopify_unavailable";
}

function extractErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if ("code" in value && typeof (value as { code?: unknown }).code === "string") {
    return (value as { code: string }).code;
  }
  return undefined;
}
