import {jcsCanonicalize} from "../../utils/jcs";
import {base64UrlEncode} from "../../utils/sha256";

/** This module calculates an in-kind effect and encodes an exact consent
 * request. Neither a position-shaped value nor this calculation is admitted
 * custody. A native writer must verify complete source, fence legacy writers,
 * verify account authority/consent and retain its accepted enclosing successor
 * before any result can be presented as a transfer. */
export type VaultMarketSharePrincipal = Readonly<{userId: string; applicationId: string}>;
export type VaultMarketShareTransferRequest = Readonly<{
  schema: "receiz.vault.market-share-transfer.v1";
  applicationId: string; requestId: string; sourceAccountId: string;
  recipientAccountId: string; positionId: string; marketItemId: string;
  sourceHeadSha256: string; quantityMicro: string;
}>;
export type VaultMarketShareAmounts = Readonly<{
  shareQuantityMicro: string; costBasisUsdCents: string; costBasisPhiMicro: string;
}>;
export type VaultMarketSharePosition = VaultMarketShareAmounts & Readonly<{
  positionId: string; accountId: string; sourceHeadSha256: string;
  marketItemId: string; marketType: "asset";
  marketSource: "venture" | "assetseal" | "profile" | "starter";
  assetId: string | null; title: string; summary: string;
  verifyHref: string | null; externalHref: string | null;
  visibility: "public" | "private";
  lastPriceUsdCents: string; quoteUsdPerPhiMicrocents: string;
}>;
const MAX = 9_223_372_036_854_775_807n;
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(v);
const digest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const integer = (v: unknown, positive = false): v is string => typeof v === "string" && /^(0|[1-9][0-9]{0,18})$/u.test(v) && BigInt(v) <= MAX && (!positive || v !== "0");
const text = (v: unknown, max: number, empty = false): v is string => typeof v === "string" && (empty || v.length > 0) && v.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(v);
const itemId = (v: unknown): v is string => text(v, 240) && v.length >= 3 && v.trim() === v && !/[\x00-\x1f\x7f]/u.test(v);
function record(v: unknown, fields: readonly string[], code: string): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== fields.length || !fields.every(k => Object.hasOwn(v, k))) throw Error(code);
  return v as Record<string, unknown>;
}
export function inspectVaultMarketShareTransferRequest(input: unknown, principal: VaultMarketSharePrincipal): VaultMarketShareTransferRequest {
  const v = record(input, ["schema", "applicationId", "requestId", "sourceAccountId", "recipientAccountId", "positionId", "marketItemId", "sourceHeadSha256", "quantityMicro"], "VAULT_MARKET_SHARE_CLOSED_REQUEST");
  if (v.schema !== "receiz.vault.market-share-transfer.v1" || typeof v.applicationId !== "string" || !/^rc_[A-Za-z0-9_-]{1,128}$/u.test(v.applicationId) || typeof v.requestId !== "string" || !/^[A-Za-z0-9._:-]{8,120}$/u.test(v.requestId) || !uuid(v.sourceAccountId) || !uuid(v.recipientAccountId) || v.sourceAccountId === v.recipientAccountId || !uuid(v.positionId) || !itemId(v.marketItemId) || !digest(v.sourceHeadSha256) || !integer(v.quantityMicro, true)) throw Error("VAULT_MARKET_SHARE_REQUEST_INVALID");
  if (v.applicationId !== principal.applicationId || v.sourceAccountId !== principal.userId) throw Error("VAULT_MARKET_SHARE_ACCESS_DENIED");
  return Object.freeze(structuredClone(v)) as VaultMarketShareTransferRequest;
}
export function vaultMarketShareTransferChallenge(input: unknown, principal: VaultMarketSharePrincipal): string {
  return base64UrlEncode(new TextEncoder().encode(jcsCanonicalize({schema: "receiz.vault.market-share-transfer-consent.v1", request: inspectVaultMarketShareTransferRequest(input, principal)})));
}
function position(input: unknown): VaultMarketSharePosition {
  const v = record(input, ["positionId", "accountId", "sourceHeadSha256", "marketItemId", "marketType", "marketSource", "assetId", "title", "summary", "verifyHref", "externalHref", "visibility", "shareQuantityMicro", "costBasisUsdCents", "costBasisPhiMicro", "lastPriceUsdCents", "quoteUsdPerPhiMicrocents"], "VAULT_MARKET_SHARE_POSITION_INVALID");
  if (!uuid(v.positionId) || !uuid(v.accountId) || !digest(v.sourceHeadSha256) || !itemId(v.marketItemId) || v.marketType !== "asset" || !["venture", "assetseal", "profile", "starter"].includes(String(v.marketSource)) || v.assetId !== null && !text(v.assetId, 512) || !text(v.title, 240) || !text(v.summary, 100000, true) || v.verifyHref !== null && !text(v.verifyHref, 8192) || v.externalHref !== null && !text(v.externalHref, 8192) || !["public", "private"].includes(String(v.visibility)) || !["shareQuantityMicro", "costBasisUsdCents", "costBasisPhiMicro", "lastPriceUsdCents", "quoteUsdPerPhiMicrocents"].every(k => integer(v[k])) || v.shareQuantityMicro === "0" && (v.costBasisUsdCents !== "0" || v.costBasisPhiMicro !== "0")) throw Error("VAULT_MARKET_SHARE_POSITION_INVALID");
  return structuredClone(v) as VaultMarketSharePosition;
}
/** The split uses the existing native certificate export/import half-up
 * cost allocation. A full transfer takes the exact remaining basis. BigInt
 * intermediates avoid the PostgreSQL bigint multiplication overflow while
 * every stored result remains within its existing integer denomination. */
export function deriveVaultMarketShareTransfer(input: Readonly<{
  principal: VaultMarketSharePrincipal; request: unknown; source: VaultMarketSharePosition;
  recipient: VaultMarketSharePosition | null; recipientPositionId: string;
}>) {
  const request = inspectVaultMarketShareTransferRequest(input.request, input.principal), source = position(input.source);
  if (source.accountId !== request.sourceAccountId || source.positionId !== request.positionId || source.marketItemId !== request.marketItemId || source.sourceHeadSha256 !== request.sourceHeadSha256) throw Error("VAULT_MARKET_SHARE_SOURCE_MISMATCH");
  if (!uuid(input.recipientPositionId) || input.recipientPositionId === source.positionId) throw Error("VAULT_MARKET_SHARE_RECIPIENT_MISMATCH");
  const recipient = input.recipient === null ? {...source, positionId: input.recipientPositionId, accountId: request.recipientAccountId, shareQuantityMicro: "0", costBasisUsdCents: "0", costBasisPhiMicro: "0"} : position(input.recipient);
  const terms = ["marketItemId", "marketType", "marketSource", "assetId", "title", "summary", "verifyHref", "externalHref", "visibility"] as const;
  if (recipient.positionId !== input.recipientPositionId || recipient.accountId !== request.recipientAccountId || terms.some(k => recipient[k] !== source[k])) throw Error("VAULT_MARKET_SHARE_RECIPIENT_MISMATCH");
  const owned = BigInt(source.shareQuantityMicro), quantity = BigInt(request.quantityMicro);
  if (quantity > owned) throw Error("VAULT_MARKET_SHARE_INSUFFICIENT_SHARES");
  const split = (v: string) => (quantity === owned ? BigInt(v) : (BigInt(v) * quantity + owned / 2n) / owned).toString();
  const moved = {shareQuantityMicro: quantity.toString(), costBasisUsdCents: split(source.costBasisUsdCents), costBasisPhiMicro: split(source.costBasisPhiMicro)};
  const sourceAfter = {...source}, recipientAfter = {...recipient};
  for (const k of ["shareQuantityMicro", "costBasisUsdCents", "costBasisPhiMicro"] as const) {
    sourceAfter[k] = (BigInt(source[k]) - BigInt(moved[k])).toString();
    const credited = BigInt(recipient[k]) + BigInt(moved[k]);
    if (credited > MAX) throw Error("VAULT_MARKET_SHARE_CAPACITY");
    recipientAfter[k] = credited.toString();
  }
  return Object.freeze({request, moved: Object.freeze(moved), sourceAfter: Object.freeze(sourceAfter), recipientAfter: Object.freeze(recipientAfter)});
}
