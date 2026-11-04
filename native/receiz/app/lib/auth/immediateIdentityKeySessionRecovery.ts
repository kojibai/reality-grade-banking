import {
  signIdentityKeyChallenge,
  type ReceizKeyFile,
} from "@/app/utils/receizIdentityKey";

type LocalIdentityPublicationSessionPayload = {
  sessionIssued?: unknown;
  session?: unknown;
};

type LocalIdentityPublicationOutcome = {
  requestFailed?: boolean;
  responseStatus?: number;
  publishOk?: boolean;
  sessionIssued?: unknown;
};

type IdentityKeyChallengeSigner = (args: {
  keyFile: ReceizKeyFile;
  passphrase?: string;
  challengeB64Url: string;
}) => Promise<{ keyId: string; signatureB64Url: string }>;

type IdentityKeyBeginPayload = {
  ok?: unknown;
  error?: unknown;
  challenge?: {
    id?: unknown;
    keyId?: unknown;
    challengeB64Url?: unknown;
    nextPath?: unknown;
  };
};

type IdentityKeyFinishPayload = {
  ok?: unknown;
  error?: unknown;
  next?: unknown;
  session?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNextPath(value: unknown, fallback: string): string {
  const candidate = text(value);
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : fallback;
}

async function postJson<T>(args: {
  url: string;
  body: unknown;
  fetchImpl: typeof fetch;
}): Promise<{ response: Response; payload: T | null }> {
  const response = await args.fetchImpl(args.url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(args.body),
  });
  const payload = (await response.json().catch(() => null)) as T | null;
  return { response, payload };
}

export function sessionFromIssuedLocalIdentityPublication(
  payload: LocalIdentityPublicationSessionPayload,
): unknown | null {
  return payload.sessionIssued === true && isRecord(payload.session) ? payload.session : null;
}

export function shouldRecoverImmediateIdentityKeySession(
  publication: LocalIdentityPublicationOutcome,
): boolean {
  if (publication.requestFailed === true) return true;
  if (publication.publishOk === true) return publication.sessionIssued === false;
  return (
    Number.isFinite(publication.responseStatus) &&
    Number(publication.responseStatus) >= 500 &&
    Number(publication.responseStatus) <= 599
  );
}

export async function recoverImmediateIdentityKeySessionAfterLocalPublish(args: {
  keyFile: ReceizKeyFile;
  passphrase?: string;
  nextPath: string;
  publication: LocalIdentityPublicationOutcome;
  fetchImpl?: typeof fetch;
  signChallenge?: IdentityKeyChallengeSigner;
}): Promise<{ nextPath: string; session: unknown } | null> {
  if (!shouldRecoverImmediateIdentityKeySession(args.publication)) return null;

  const fetchImpl = args.fetchImpl ?? fetch;
  const begin = await postJson<IdentityKeyBeginPayload>({
    url: "/api/auth/identity-key/begin",
    body: { keyId: args.keyFile.keyId, next: args.nextPath },
    fetchImpl,
  });
  const beginError = text(begin.payload?.error);
  const challengeId = text(begin.payload?.challenge?.id);
  const challengeKeyId = text(begin.payload?.challenge?.keyId);
  const challengeB64Url = text(begin.payload?.challenge?.challengeB64Url);
  if (
    !begin.response.ok ||
    begin.payload?.ok !== true ||
    !challengeId ||
    challengeKeyId !== args.keyFile.keyId ||
    !challengeB64Url
  ) {
    throw new Error(beginError || "identity_key_begin_failed");
  }

  const signed = await (args.signChallenge ?? signIdentityKeyChallenge)({
    keyFile: args.keyFile,
    ...(args.passphrase ? { passphrase: args.passphrase } : {}),
    challengeB64Url,
  });
  if (signed.keyId !== args.keyFile.keyId || !text(signed.signatureB64Url)) {
    throw new Error("identity_key_signature_mismatch");
  }

  const finish = await postJson<IdentityKeyFinishPayload>({
    url: "/api/auth/identity-key/finish",
    body: {
      challengeId,
      keyId: signed.keyId,
      signatureB64Url: signed.signatureB64Url,
    },
    fetchImpl,
  });
  const finishError = text(finish.payload?.error);
  if (!finish.response.ok || finish.payload?.ok !== true || !isRecord(finish.payload.session)) {
    throw new Error(finishError || "identity_key_finish_failed");
  }

  const challengeNextPath = normalizeNextPath(begin.payload.challenge?.nextPath, args.nextPath);
  return {
    nextPath: normalizeNextPath(finish.payload.next, challengeNextPath),
    session: finish.payload.session,
  };
}
