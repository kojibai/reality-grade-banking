const crypto = require("node:crypto");

const B64U_RE = /^[A-Za-z0-9_-]+$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const KID_RE = /^[a-z0-9._:-]{3,128}$/i;
const BOOL_TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function normalizedEnvText(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseJsonArray(raw) {
  const text = normalizedEnvText(raw);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") {
      const nested = parsed.trim();
      if (!nested) return [];
      const parsedNested = JSON.parse(nested);
      return Array.isArray(parsedNested) ? parsedNested : [];
    }
    return [];
  } catch {
    return [];
  }
}

function readBearerTokens() {
  const out = [];
  for (const token of parseJsonArray(process.env.RECEIZ_SIGNER_SERVICE_BEARER_TOKENS_JSON || "")) {
    if (typeof token !== "string") continue;
    const normalized = token.trim();
    if (normalized) out.push(normalized);
  }
  const single = normalizedEnvText(process.env.RECEIZ_SIGNER_SERVICE_BEARER_TOKEN);
  if (single) out.push(single);
  return [...new Set(out)];
}

function asKid(value) {
  if (typeof value !== "string") return null;
  const kid = value.trim();
  return KID_RE.test(kid) ? kid : null;
}

function asB64u(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && B64U_RE.test(text) ? text : null;
}

function readSignerKeyring() {
  const out = new Map();
  for (const entry of parseJsonArray(process.env.RECEIZ_SIGNER_SERVICE_KEYS_JSON || "")) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry;
    const kid = asKid(row.kid);
    const alg = row.alg === "Ed25519" ? "Ed25519" : null;
    const privateKeyPkcs8B64u = asB64u(row.privateKeyPkcs8B64u);
    const status = row.status === "retired" ? "retired" : "active";
    if (!kid || !alg || !privateKeyPkcs8B64u) continue;
    out.set(kid, {
      kid,
      alg,
      privateKeyPkcs8B64u,
      status,
    });
  }
  return out;
}

function parseBoolEnv(name, fallback) {
  const normalized = normalizedEnvText(process.env[name]).toLowerCase();
  if (!normalized) return fallback;
  return BOOL_TRUE_VALUES.has(normalized);
}

function allowedContexts() {
  const values = parseJsonArray(process.env.RECEIZ_SIGNER_SERVICE_ALLOWED_CONTEXTS_JSON || "")
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) values.push("receiz.governance.artifact-manifest");
  return new Set(values);
}

function safeEqual(a, b) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function readBearerToken(req) {
  const auth = String(req.headers.authorization || "").trim();
  if (!auth) return null;
  const [scheme, token] = auth.split(/\s+/, 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", resolve);
    req.on("error", reject);
  });

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      return json(res, 405, { ok: false, error: "method_not_allowed" });
    }

    const expectedTokens = readBearerTokens();
    if (expectedTokens.length === 0) {
      return json(res, 503, { ok: false, error: "signer_unavailable" });
    }

    const bearer = readBearerToken(req);
    const authorized =
      typeof bearer === "string" && expectedTokens.some((token) => safeEqual(token, bearer));
    if (!authorized) {
      return json(res, 401, { ok: false, error: "unauthorized" });
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return json(res, 400, { ok: false, error: "invalid_json" });
    }

    const kid = asKid(body.kid);
    const alg = body.alg === "Ed25519" ? "Ed25519" : null;
    const payloadB64u = asB64u(body.payloadB64u);
    const payloadHashSha256 =
      typeof body.payloadHashSha256 === "string" ? body.payloadHashSha256.trim().toLowerCase() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";

    if (!kid || !alg || !payloadB64u || !HEX64_RE.test(payloadHashSha256)) {
      return json(res, 400, { ok: false, error: "invalid_request" });
    }

    const allowed = allowedContexts();
    const requestContext = context || "receiz.governance.artifact-manifest";
    if (!allowed.has(requestContext)) {
      return json(res, 403, { ok: false, error: "context_not_allowed" });
    }

    let payloadBytes;
    try {
      payloadBytes = Buffer.from(payloadB64u, "base64url");
    } catch {
      return json(res, 400, { ok: false, error: "invalid_payload_encoding" });
    }

    const computedHash = crypto.createHash("sha256").update(payloadBytes).digest("hex");
    if (!safeEqual(computedHash, payloadHashSha256)) {
      return json(res, 400, { ok: false, error: "payload_hash_mismatch" });
    }

    const keyring = readSignerKeyring();
    const key = keyring.get(kid);
    if (!key || key.alg !== "Ed25519") {
      return json(res, 404, { ok: false, error: "unknown_signing_key" });
    }

    const allowRetiredKeys = parseBoolEnv("RECEIZ_SIGNER_SERVICE_ALLOW_RETIRED_KEYS", false);
    if (key.status === "retired" && !allowRetiredKeys) {
      return json(res, 409, { ok: false, error: "signing_key_retired" });
    }

    let signatureB64u;
    try {
      const privateKey = crypto.createPrivateKey({
        key: Buffer.from(key.privateKeyPkcs8B64u, "base64url"),
        format: "der",
        type: "pkcs8",
      });
      signatureB64u = crypto.sign(null, payloadBytes, privateKey).toString("base64url");
    } catch {
      return json(res, 503, { ok: false, error: "signer_unavailable" });
    }

    return json(res, 200, {
      ok: true,
      kid,
      alg: "Ed25519",
      sig: signatureB64u,
      signatureB64u,
      signedAt: new Date().toISOString(),
      context: requestContext,
    });
  } catch {
    return json(res, 500, { ok: false, error: "internal_error" });
  }
};
