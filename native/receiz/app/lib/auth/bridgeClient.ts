"use client";

import { MANAGED_PROFILE_ROUTE_FALLBACK_PATH } from "@/app/lib/profile/managedRoute";

type SessionBridgeMessage = {
  source: "receiz-auth-bridge";
  kind: "session";
  state?: string;
  ok: boolean;
  token?: string;
  error?: string;
};

type ConsumeBridgeMessage = {
  source: "receiz-auth-bridge";
  kind: "consume";
  state?: string;
  ok: boolean;
  error?: string;
};

type PresenceBoundAssertion = {
  authenticatorDataB64Url: string;
  clientDataJSONB64Url: string;
  signatureB64Url: string;
  credIdB64Url: string;
  pubKeyPem: string;
};

type PbiBridgeMessage = {
  source: "receiz-auth-bridge";
  kind: "pbi";
  state?: string;
  ok: boolean;
  assertion?: PresenceBoundAssertion;
  error?: string;
};

type BridgeMessage = SessionBridgeMessage | ConsumeBridgeMessage | PbiBridgeMessage;

type RedeemResponse = {
  ok?: boolean;
  next?: string;
  returnToUrl?: string | null;
  session?: {
    uid: string;
    email: string | null;
    username?: string | null;
    displayName?: string | null;
    plan?: string | null;
    entitlementPlan?: string | null;
  } | null;
  error?: string;
};

const DEFAULT_CANONICAL_ORIGIN = "https://receiz.com";

function normalizeOrigin(input: string | null | undefined): string | null {
  const value = (input || "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function canonicalOrigin(): string {
  return normalizeOrigin(process.env.NEXT_PUBLIC_RECEIZ_APP_URL) ?? DEFAULT_CANONICAL_ORIGIN;
}

function canonicalHost(): string {
  return new URL(canonicalOrigin()).hostname.trim().toLowerCase();
}

function isLocalhost(hostnameRaw: string): boolean {
  const hostname = hostnameRaw.trim().toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function isPreviewHostname(hostnameRaw: string): boolean {
  const hostname = hostnameRaw.trim().toLowerCase();
  return hostname.endsWith(".vercel.app");
}

export function isCustomDomainRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.trim().toLowerCase();
  if (!hostname) return false;
  if (isLocalhost(hostname) || isPreviewHostname(hostname)) return false;
  return hostname !== canonicalHost() && hostname !== "receiz.com" && hostname !== "www.receiz.com";
}

function randomState(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; json: T }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as T;
  return {
    ok: response.ok,
    status: response.status,
    json,
  };
}

async function issueBridgeToken(args: {
  targetOrigin: string;
  nextPath?: string;
  returnToUrl?: string;
}): Promise<string | null> {
  const targetOrigin = normalizeOrigin(args.targetOrigin);
  if (!targetOrigin) return null;

  const response = await postJson<{ ok?: boolean; token?: string; error?: string }>("/api/auth/bridge/issue", {
    targetOrigin,
    next: args.nextPath,
    returnToUrl: args.returnToUrl,
  });

  if (!response.ok) {
    if (response.status === 401) return null;
    throw new Error(response.json.error || "bridge_issue_failed");
  }

  return typeof response.json.token === "string" ? response.json.token : null;
}

async function redeemBridgeToken(token: string): Promise<{
  nextPath: string;
  returnToUrl: string | null;
  session?: RedeemResponse["session"];
}> {
  const response = await postJson<RedeemResponse>("/api/auth/bridge/redeem", { token });
  if (!response.ok || !response.json.ok) {
    throw new Error(response.json.error || "bridge_redeem_failed");
  }

  const nextPath =
    typeof response.json.next === "string" && response.json.next.startsWith("/")
      ? response.json.next
      : MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
  const returnToUrl = typeof response.json.returnToUrl === "string" ? response.json.returnToUrl : null;
  return { nextPath, returnToUrl, session: response.json.session ?? null };
}

function popupFeatures(args: { width: number; height: number }): string {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - args.width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - args.height) / 2));
  return [
    "popup=yes",
    "toolbar=no",
    "location=yes",
    "status=no",
    "menubar=no",
    "scrollbars=yes",
    "resizable=yes",
    `width=${args.width}`,
    `height=${args.height}`,
    `left=${left}`,
    `top=${top}`,
  ].join(",");
}

function openBridgePopup(url: string, name: string, args: { width: number; height: number }): Window | null {
  return window.open(url, name, popupFeatures(args));
}

export function reserveCanonicalPbiAssertionPopup(): Window | null {
  if (typeof window === "undefined" || !isCustomDomainRuntime()) return null;
  return openBridgePopup("about:blank", "receiz-pbi-bridge", { width: 460, height: 760 });
}

export function releaseCanonicalPbiAssertionPopup(popup: Window | null | undefined): void {
  if (!popup) return;
  try {
    if (!popup.closed) popup.close();
  } catch {
    // A navigated bridge window may already have closed itself.
  }
}

async function waitForBridgeMessage<T extends BridgeMessage>(args: {
  popup: Window;
  state: string;
  kind: T["kind"];
  targetOrigin: string;
  timeoutMs: number;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let closePoll: number | null = null;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (closePoll !== null) {
        window.clearInterval(closePoll);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("message", onMessage);
    };

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler();
    };

    const onMessage = (event: MessageEvent<BridgeMessage>) => {
      if (event.origin !== args.targetOrigin) return;
      const data = event.data;
      if (!data || data.source !== "receiz-auth-bridge") return;
      if (data.kind !== args.kind) return;
      if ((data.state || "") !== args.state) return;
      finish(() => resolve(data as T));
    };

    window.addEventListener("message", onMessage);

    closePoll = window.setInterval(() => {
      if (args.popup.closed) {
        finish(() => reject(new Error("bridge_popup_closed")));
      }
    }, 250);

    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("bridge_timeout")));
    }, args.timeoutMs);
  });
}

export async function attemptReceizSessionReuse(args: {
  nextPath: string;
}): Promise<{ reused: boolean; nextPath: string | null }> {
  if (typeof window === "undefined" || !isCustomDomainRuntime()) {
    return { reused: false, nextPath: null };
  }

  const state = randomState();
  const url = new URL("/auth/bridge", canonicalOrigin());
  url.searchParams.set("targetOrigin", window.location.origin);
  url.searchParams.set("next", args.nextPath);
  url.searchParams.set("silent", "1");
  url.searchParams.set("state", state);

  const popup = openBridgePopup(url.toString(), "receiz-auth-bridge", { width: 480, height: 720 });
  if (!popup) return { reused: false, nextPath: null };

  try {
    const message = await waitForBridgeMessage<SessionBridgeMessage>({
      popup,
      state,
      kind: "session",
      targetOrigin: canonicalOrigin(),
      timeoutMs: 30_000,
    });
    if (!message.ok || !message.token) {
      if (message.error === "login_required") return { reused: false, nextPath: null };
      throw new Error(message.error || "bridge_session_failed");
    }

    const redeemed = await redeemBridgeToken(message.token);
    return { reused: true, nextPath: redeemed.nextPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : "bridge_session_failed";
    if (message === "bridge_popup_closed" || message === "bridge_timeout") {
      return { reused: false, nextPath: null };
    }
    throw error;
  }
}

export async function startReceizBridgeSignIn(args: {
  nextPath: string;
  email?: string;
}): Promise<{ nextPath: string; session?: RedeemResponse["session"] }> {
  if (typeof window === "undefined" || !isCustomDomainRuntime()) {
    throw new Error("bridge_not_required");
  }

  const state = randomState();
  const url = new URL("/auth/bridge", canonicalOrigin());
  url.searchParams.set("targetOrigin", window.location.origin);
  url.searchParams.set("next", args.nextPath);
  url.searchParams.set("state", state);
  if (args.email) {
    url.searchParams.set("email", args.email.trim());
  }

  const popup = openBridgePopup(url.toString(), "receiz-auth-bridge", { width: 480, height: 760 });
  if (!popup) {
    window.location.assign(url.toString());
    return new Promise<{ nextPath: string; session?: RedeemResponse["session"] }>(() => {});
  }

  const message = await waitForBridgeMessage<SessionBridgeMessage>({
    popup,
    state,
    kind: "session",
    targetOrigin: canonicalOrigin(),
    timeoutMs: 5 * 60_000,
  });

  if (!message.ok || !message.token) {
    throw new Error(message.error || "bridge_session_failed");
  }

  const redeemed = await redeemBridgeToken(message.token);
  return { nextPath: redeemed.nextPath, session: redeemed.session ?? null };
}

export async function promoteCurrentSessionToCanonical(): Promise<boolean> {
  if (typeof window === "undefined" || !isCustomDomainRuntime()) {
    return false;
  }

  try {
    const token = await issueBridgeToken({
      targetOrigin: canonicalOrigin(),
    });
    if (!token) return false;

    const state = randomState();
    const url = new URL("/auth/bridge/consume", canonicalOrigin());
    url.searchParams.set("token", token);
    url.searchParams.set("close", "1");
    url.searchParams.set("state", state);

    const popup = openBridgePopup(url.toString(), "receiz-auth-promote", { width: 420, height: 560 });
    if (!popup) return false;

    const message = await waitForBridgeMessage<ConsumeBridgeMessage>({
      popup,
      state,
      kind: "consume",
      targetOrigin: canonicalOrigin(),
      timeoutMs: 20_000,
    });
    return message.ok;
  } catch {
    return false;
  }
}

export async function requestCanonicalPbiAssertion(args: {
  challengeB64Url: string;
  credIdB64Url?: string;
  pubKeyPem?: string;
  needsCanonicalSession: boolean;
  reservedPopup?: Window | null;
}): Promise<PresenceBoundAssertion> {
  if (typeof window === "undefined" || !isCustomDomainRuntime()) {
    throw new Error("pbi_bridge_not_required");
  }

  const popup = args.reservedPopup ?? reserveCanonicalPbiAssertionPopup();
  if (!popup) {
    throw new Error("popup_blocked");
  }
  try {
    const state = randomState();
    const url = new URL("/auth/bridge/pbi", canonicalOrigin());
    url.searchParams.set("targetOrigin", window.location.origin);
    url.searchParams.set("challenge", args.challengeB64Url);
    url.searchParams.set("state", state);
    if (args.credIdB64Url) {
      url.searchParams.set("credId", args.credIdB64Url);
    }
    if (args.pubKeyPem) {
      url.searchParams.set("pubKeyPem", args.pubKeyPem);
    }
    if (args.needsCanonicalSession) {
      const token = await issueBridgeToken({
        targetOrigin: canonicalOrigin(),
      });
      if (token) {
        url.searchParams.set("token", token);
      }
    }

    popup.location.replace(url.toString());
    const message = await waitForBridgeMessage<PbiBridgeMessage>({
      popup,
      state,
      kind: "pbi",
      targetOrigin: canonicalOrigin(),
      timeoutMs: 90_000,
    });

    if (!message.ok || !message.assertion) {
      throw new Error(message.error || "pbi_bridge_failed");
    }

    return message.assertion;
  } finally {
    releaseCanonicalPbiAssertionPopup(popup);
  }
}
