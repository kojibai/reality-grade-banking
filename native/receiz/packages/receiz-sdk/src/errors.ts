export type ReceizErrorRail =
  | "identity"
  | "proof"
  | "continuity"
  | "offline"
  | "ownership"
  | "settlement"
  | "publicStore"
  | "commerce"
  | "media"
  | "world"
  | "webhook"
  | "compiler"
  | "testing"
  | "mcp"
  | "sdk";

export type ReceizErrorDescriptor = Readonly<{
  schema: "receiz.sdk.error.v1";
  code: string;
  message: string;
  rail: ReceizErrorRail;
  retryable: boolean;
  missingScope?: string;
  documentationUrl: string;
  suggestedRepair: string;
  authorityBoundary: string;
}>;

export type ReceizErrorContext = Readonly<{
  rail?: ReceizErrorRail;
  retryable?: boolean;
  missingScope?: string;
  documentationUrl?: string;
  suggestedRepair?: string;
  authorityBoundary?: string;
}>;

const PRIVATE_KEY_RE = /-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/gi;
const AUTHORIZATION_RE = /\bauthorization\s*:\s*(?:bearer\s+)?[^\s,;]+/gi;
const BEARER_RE = /\bbearer\s+[^\s,;]+/gi;
const SECRET_FIELD_RE = /\b(access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?secret|webhook[_-]?secret|receiz[_-]?key)\s*[:=]\s*[^\s,;]+/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export function sanitizeReceizErrorMessage(message: string): string {
  return message
    .replace(PRIVATE_KEY_RE, "[REDACTED]")
    .replace(AUTHORIZATION_RE, "Authorization: [REDACTED]")
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(SECRET_FIELD_RE, "$1=[REDACTED]")
    .replace(JWT_RE, "[REDACTED]");
}

function inferredRail(code: string): ReceizErrorRail {
  if (code.includes("continuity")) return "continuity";
  if (code.includes("identity") || code.includes("scope") || code.includes("unauthorized")) return "identity";
  if (code.includes("ownership")) return "ownership";
  if (code.includes("settlement")) return "settlement";
  if (code.includes("webhook")) return "webhook";
  if (code.includes("compiler") || code.includes("contract") || code.includes("project")) return "compiler";
  if (code.includes("proof") || code.includes("artifact")) return "proof";
  return "sdk";
}

function inferredRepair(code: string): string {
  if (code === "missing_scope") return "Request the missing delegated scope through Receiz Connect.";
  if (code.includes("continuity")) return "Recreate the proof object through authenticated Receiz Record and Seal continuity.";
  if (code.startsWith("http_5")) return "Retry the same idempotent SDK operation after the Receiz service recovers.";
  if (code.startsWith("http_4")) return "Correct the request or delegated authorization before retrying.";
  if (code.includes("validation")) return "Correct the invalid fields and submit the same Receiz operation again.";
  return "Inspect the affected Receiz rail and retry only after correcting the reported condition.";
}

function normalizeCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && error.code.trim()) {
    return error.code;
  }
  if (error instanceof Error && error.name !== "Error") return error.name;
  return "receiz_sdk_error";
}

function normalizeMessage(error: unknown): string {
  if (error instanceof Error) return sanitizeReceizErrorMessage(error.message || error.name);
  if (typeof error === "string") return sanitizeReceizErrorMessage(error);
  return "Receiz SDK operation failed.";
}

function descriptorFor(code: string, message: string, context: ReceizErrorContext = {}): ReceizErrorDescriptor {
  const rail = context.rail ?? inferredRail(code);
  const retryable = context.retryable ?? /^http_5\d\d$/.test(code);
  return {
    schema: "receiz.sdk.error.v1",
    code,
    message: sanitizeReceizErrorMessage(message),
    rail,
    retryable,
    ...(context.missingScope ? { missingScope: context.missingScope } : {}),
    documentationUrl: context.documentationUrl ?? "https://receiz.com/developers",
    suggestedRepair: context.suggestedRepair ?? inferredRepair(code),
    authorityBoundary: context.authorityBoundary ?? "sdk-mechanics-beneath-receiz-proof-object-truth",
  };
}

export class ReceizError<Code extends string = string> extends Error {
  readonly code: Code;
  readonly descriptor: ReceizErrorDescriptor;

  constructor(code: Code, message: string, context: ReceizErrorContext = {}) {
    const descriptor = descriptorFor(code, message, context);
    super(descriptor.message);
    this.name = "ReceizError";
    this.code = code;
    this.descriptor = descriptor;
  }
}

export function describeReceizError(error: unknown, context: ReceizErrorContext = {}): ReceizErrorDescriptor {
  if (error instanceof ReceizError && Object.keys(context).length === 0) return error.descriptor;
  const code = normalizeCode(error);
  return descriptorFor(code, normalizeMessage(error), context);
}
