export type ReceizGlobalCoordinationOperation =
  | "admission.read-aggregate"
  | "admission.read-idempotency"
  | "admission.commit"
  | "admission.seed"
  | "admission.inspect"
  | "transition.stage"
  | "transition.resolve"
  | "transition.commit"
  | "reconciliation.plan"
  | "reconciliation.stage"
  | "reconciliation.commit"
  | "reconciliation.resolve-head"
  | "reconciliation.resolve-attempt"
  | "reconciliation.resolve-effect";

export type ReceizGlobalCoordinationTransport = (
  operation: ReceizGlobalCoordinationOperation,
  input: unknown,
) => Promise<unknown>;

export type ReceizRemoteTransportOptions = Readonly<{
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}>;

const OPERATION_PATHS: Readonly<Record<ReceizGlobalCoordinationOperation, string>> = Object.freeze({
  "admission.read-aggregate": "/api/sdk/v1/coordination/admission/read-aggregate",
  "admission.read-idempotency": "/api/sdk/v1/coordination/admission/read-idempotency",
  "admission.commit": "/api/sdk/v1/coordination/admission/commit",
  "admission.seed": "/api/sdk/v1/coordination/admission/seed",
  "admission.inspect": "/api/sdk/v1/coordination/admission/inspect",
  "transition.stage": "/api/sdk/v1/coordination/transition/stage",
  "transition.resolve": "/api/sdk/v1/coordination/transition/resolve",
  "transition.commit": "/api/sdk/v1/coordination/transition/commit",
  "reconciliation.plan": "/api/sdk/v1/coordination/plan",
  "reconciliation.stage": "/api/sdk/v1/coordination/stage",
  "reconciliation.commit": "/api/sdk/v1/coordination/commit",
  "reconciliation.resolve-head": "/api/sdk/v1/coordination/resolve",
  "reconciliation.resolve-attempt": "/api/sdk/v1/coordination/attempt",
  "reconciliation.resolve-effect": "/api/sdk/v1/coordination/effects",
});

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function createReceizGlobalCoordinationHttpTransport(
  options: ReceizRemoteTransportOptions,
): ReceizGlobalCoordinationTransport {
  if (!options.accessToken || !options.baseUrl) throw new TypeError("REMOTE_COORDINATION_OPTIONS_REQUIRED");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("REMOTE_COORDINATION_FETCH_REQUIRED");
  const baseUrl = trimSlash(options.baseUrl);
  const accessToken = options.accessToken;
  return async (operation, input) => {
    const response = await fetchImpl(`${baseUrl}${OPERATION_PATHS[operation]}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
    let payload: unknown;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
      if (response.status === 401 || response.status === 404) return Object.freeze({ status: "not-found-or-not-authorized" });
      if (response.status >= 500) return Object.freeze({ status: "failed", code: "NETWORK_UNAVAILABLE" });
      return payload ?? Object.freeze({ status: "failed", code: "NETWORK_UNAVAILABLE" });
    }
    return payload;
  };
}
