"use client";

export type HapticProfile = "soft" | "selection" | "medium" | "heavy" | "success" | "warning";

export type HapticElementMeta = {
  tagName: string;
  type?: string | null;
  role?: string | null;
  label?: string | null;
  className?: string | null;
  dataHaptic?: string | null;
  disabled?: boolean;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  download?: boolean;
};

type NativeHapticImpactStyle = "light" | "medium" | "heavy";
type NativeHapticNotificationType = "success" | "warning";

type NativeHapticBridgePayload = {
  schema: "receiz.haptics.profile.v1";
  profile: HapticProfile;
  impactStyle: NativeHapticImpactStyle | null;
  notificationType: NativeHapticNotificationType | null;
  pattern: number | number[];
};

type ReceizNativeHapticsBridge = {
  play?: (payload: NativeHapticBridgePayload) => unknown;
  impact?: (style: NativeHapticImpactStyle) => unknown;
  selection?: () => unknown;
  notification?: (type: NativeHapticNotificationType) => unknown;
};

type WebkitMessageHandler = {
  postMessage?: (payload: NativeHapticBridgePayload) => unknown;
};

type HapticWindow = Window & {
  receizNativeHaptics?: ReceizNativeHapticsBridge;
  webkit?: {
    messageHandlers?: {
      receizHaptics?: WebkitMessageHandler;
    };
  };
};

const HAPTIC_PATTERNS: Record<HapticProfile, number | number[]> = {
  // Web haptics are limited, so keep the pulses short and crisp.
  soft: 8,
  selection: 10,
  medium: 14,
  heavy: 20,
  success: [12, 26, 16],
  warning: [16, 30, 14, 22, 18],
};

const SELECTION_TOKENS = new Set([
  "back",
  "close",
  "copy",
  "dismiss",
  "dock",
  "filter",
  "more",
  "next",
  "pause",
  "play",
  "popover",
  "prev",
  "previous",
  "scrim",
  "secondary",
  "segment",
  "segmented",
  "tab",
  "toggle",
  "toolbar",
  "zoom",
]);

const PRIMARY_TOKENS = new Set([
  "auth",
  "begin",
  "buy",
  "checkout",
  "claim",
  "compose",
  "confirm",
  "connect",
  "continue",
  "create",
  "download",
  "join",
  "launch",
  "login",
  "mint",
  "open",
  "pay",
  "post",
  "publish",
  "receive",
  "refresh",
  "request",
  "save",
  "schedule",
  "seal",
  "sell",
  "send",
  "share",
  "sign",
  "signin",
  "start",
  "submit",
  "trade",
  "unlock",
  "upload",
  "verify",
]);

const WARNING_TOKENS = new Set([
  "cancel",
  "clear",
  "danger",
  "delete",
  "disconnect",
  "erase",
  "logout",
  "remove",
  "reset",
  "revoke",
]);

const COARSE_POINTER_QUERY = "(pointer: coarse)";
const HAPTIC_COOLDOWN_MS = 36;

let lastHapticAt = 0;

function isButtonLikeInput(type: string | null | undefined): boolean {
  return type === "button" || type === "submit" || type === "reset";
}

export function tokenizeHapticDescriptor(...values: Array<string | null | undefined>): string[] {
  return values
    .join(" ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function hasAnyToken(tokens: Set<string>, candidates: Set<string>): boolean {
  for (const token of tokens) {
    if (candidates.has(token)) return true;
  }
  return false;
}

function normalizeExplicitProfile(value: string | null | undefined): HapticProfile | "off" | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "auto") return null;
  if (normalized === "off" || normalized === "none") return "off";
  if (
    normalized === "soft" ||
    normalized === "selection" ||
    normalized === "medium" ||
    normalized === "heavy" ||
    normalized === "success" ||
    normalized === "warning"
  ) {
    return normalized;
  }
  return null;
}

export function inferHapticProfile(meta: HapticElementMeta): HapticProfile | null {
  if (meta.disabled) return null;

  const explicit = normalizeExplicitProfile(meta.dataHaptic);
  if (explicit === "off") return null;
  if (explicit) return explicit;

  const tagName = meta.tagName.trim().toLowerCase();
  const role = (meta.role ?? "").trim().toLowerCase();
  const type = (meta.type ?? "").trim().toLowerCase();
  const tokens = new Set(tokenizeHapticDescriptor(meta.className, meta.label, role, type));

  if (hasAnyToken(tokens, WARNING_TOKENS)) return "warning";

  if (role === "tab" || meta.ariaPressed) return "selection";

  if (type === "submit" || meta.download) return "medium";

  if (hasAnyToken(tokens, PRIMARY_TOKENS)) return "medium";

  if (meta.ariaExpanded || hasAnyToken(tokens, SELECTION_TOKENS)) return "selection";

  if (tagName === "button" || tagName === "summary" || role === "button" || isButtonLikeInput(type)) {
    return "soft";
  }

  return null;
}

function isButtonLikeElement(meta: HapticElementMeta): boolean {
  const explicit = normalizeExplicitProfile(meta.dataHaptic);
  if (explicit) return explicit !== "off";

  const tagName = meta.tagName.trim().toLowerCase();
  const role = (meta.role ?? "").trim().toLowerCase();
  const type = (meta.type ?? "").trim().toLowerCase();

  return tagName === "button" || tagName === "summary" || role === "button" || role === "tab" || isButtonLikeInput(type);
}

export function getHapticElementMeta(element: Element): HapticElementMeta {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const type = element.getAttribute("type");
  const disabled =
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    (element instanceof HTMLButtonElement && element.disabled) ||
    (element instanceof HTMLInputElement && element.disabled);

  return {
    tagName,
    type,
    role,
    label:
      element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      (element.textContent ? element.textContent.slice(0, 160) : null),
    className:
      typeof (element as { className?: unknown }).className === "string"
        ? ((element as { className: string }).className ?? "")
        : (element.getAttribute("class") ?? ""),
    dataHaptic: element.getAttribute("data-haptic"),
    disabled,
    ariaPressed: element.getAttribute("aria-pressed") === "true",
    ariaExpanded: element.getAttribute("aria-expanded") === "true",
    download: element.hasAttribute("download"),
  };
}

export function resolveHapticTarget(target: EventTarget | null): Element | null {
  let node = target instanceof Element ? target : null;

  while (node) {
    const meta = getHapticElementMeta(node);
    if (normalizeExplicitProfile(meta.dataHaptic) === "off") return null;
    if (isButtonLikeElement(meta)) return node;
    node = node.parentElement;
  }

  return null;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function reduceProfile(profile: HapticProfile): HapticProfile {
  switch (profile) {
    case "heavy":
    case "warning":
      return "medium";
    case "success":
      return "selection";
    default:
      return profile;
  }
}

export function supportsVibrationHaptics(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function hapticImpactStyle(profile: HapticProfile): NativeHapticImpactStyle | null {
  if (profile === "soft" || profile === "selection") return "light";
  if (profile === "heavy") return "heavy";
  if (profile === "medium") return "medium";
  return null;
}

function hapticNotificationType(profile: HapticProfile): NativeHapticNotificationType | null {
  if (profile === "success") return "success";
  if (profile === "warning") return "warning";
  return null;
}

function hapticBridgePayload(profile: HapticProfile, pattern: number | number[]): NativeHapticBridgePayload {
  return {
    schema: "receiz.haptics.profile.v1",
    profile,
    impactStyle: hapticImpactStyle(profile),
    notificationType: hapticNotificationType(profile),
    pattern,
  };
}

function receizNativeHapticsBridge(): ReceizNativeHapticsBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as HapticWindow).receizNativeHaptics;
  return bridge && typeof bridge === "object" ? bridge : null;
}

function webkitReceizHapticsMessageHandler(): WebkitMessageHandler | null {
  if (typeof window === "undefined") return null;
  const handler = (window as HapticWindow).webkit?.messageHandlers?.receizHaptics;
  return handler && typeof handler.postMessage === "function" ? handler : null;
}

export function supportsNativeHapticBridge(): boolean {
  return Boolean(receizNativeHapticsBridge() || webkitReceizHapticsMessageHandler());
}

export function supportsHapticFeedback(): boolean {
  return supportsNativeHapticBridge() || supportsVibrationHaptics();
}

export function hapticTransportLabel(): "native" | "vibrate" | "visual" {
  if (supportsNativeHapticBridge()) return "native";
  if (supportsVibrationHaptics()) return "vibrate";
  return "visual";
}

function playNativeHapticBridge(profile: HapticProfile, pattern: number | number[]): boolean {
  const payload = hapticBridgePayload(profile, pattern);
  const bridge = receizNativeHapticsBridge();
  if (bridge) {
    try {
      if (typeof bridge.play === "function") {
        void bridge.play(payload);
        return true;
      }
      if (profile === "selection" && typeof bridge.selection === "function") {
        void bridge.selection();
        return true;
      }
      if (payload.notificationType && typeof bridge.notification === "function") {
        void bridge.notification(payload.notificationType);
        return true;
      }
      if (payload.impactStyle && typeof bridge.impact === "function") {
        void bridge.impact(payload.impactStyle);
        return true;
      }
    } catch {
      return false;
    }
  }

  const handler = webkitReceizHapticsMessageHandler();
  if (!handler?.postMessage) return false;
  try {
    void handler.postMessage(payload);
    return true;
  } catch {
    return false;
  }
}

export function isLikelyTouchDevice(): boolean {
  if (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0) return true;
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(COARSE_POINTER_QUERY).matches
    : false;
}

export function playHapticPattern(pattern: number | number[], profile: HapticProfile = "medium", options?: { force?: boolean }): boolean {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;

  const reducedMotion = prefersReducedMotion();
  const resolvedProfile = reducedMotion ? reduceProfile(profile) : profile;
  const resolvedPattern = reducedMotion ? HAPTIC_PATTERNS[resolvedProfile] : pattern;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!options?.force && now - lastHapticAt < HAPTIC_COOLDOWN_MS) return false;

  if (playNativeHapticBridge(resolvedProfile, resolvedPattern)) {
    lastHapticAt = now;
    return true;
  }

  if (!supportsVibrationHaptics()) return false;

  try {
    const ok = navigator.vibrate(resolvedPattern);
    lastHapticAt = now;
    return ok;
  } catch {
    return false;
  }
}

export function playHapticProfile(profile: HapticProfile, options?: { force?: boolean }): boolean {
  return playHapticPattern(HAPTIC_PATTERNS[profile], profile, options);
}
