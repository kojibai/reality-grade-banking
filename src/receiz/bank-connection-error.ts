const PUBLIC_CODES = new Set(['APPLICATION_MISMATCH', 'UNAUTHORIZED', 'SCOPE_NOT_GRANTED', 'NOT_FOUND_OR_NOT_AUTHORIZED', 'SERVICE_CAPACITY_UNAVAILABLE', 'EXACT_BYTES_INVALID', 'REQUEST_TOO_LARGE', 'INVALID_PROOF', 'CONSENT_REQUIRED', 'AUDIENCE_MISMATCH', 'SCOPE_MISMATCH', 'NAMESPACE_MISMATCH', 'STALE_HEAD', 'EXPIRED', 'REVOKED', 'CHALLENGE_REPLAYED', 'DEPENDENCY_UNAVAILABLE', 'IDEMPOTENCY_CONFLICT', 'SUBJECT_PROOF_CONFLICT', 'SUBJECT_OWNER_CONFLICT', 'INVALID_ENCLOSING_PROOF', 'INVALID_OWNER_PROOF', 'REGISTRY_INCOMPATIBLE', 'REDUCER_INCOMPATIBLE']);
const PROTOCOL_CODES = new Set(['V124_RUNTIME_TRANSPORT_UNAUTHENTICATED', 'V124_RUNTIME_RESPONSE_ENVELOPE_INVALID', 'V124_QUALIFICATION_RESPONSE_INVALID', 'V124_QUALIFICATION_APPLICATION_INVALID']);
// Retain only fixed public diagnostics. Never retain/log the response body,
// token, source, challenge or arbitrary exception message in the UI error.
export class BankConnectionError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  constructor(readonly stage: 'account-access' | 'native-services' | 'account-proof' | 'source-publication' | 'authority-session', error: unknown) {
    super('The bank connection could not be checked. Your held proofs are preserved.');
    this.name = 'BankConnectionError';
    const record = error instanceof Error ? error as Error & { status?: unknown; payload?: { code?: unknown }; failure?: { reasonCode?: unknown } } : null;
    this.status = typeof record?.status === 'number' && Number.isInteger(record.status) && record.status >= 400 && record.status <= 599 ? record.status : null;
    const code = record?.payload?.code ?? record?.failure?.reasonCode;
    this.code = typeof code === 'string' && PUBLIC_CODES.has(code) ? code : error instanceof TypeError && PROTOCOL_CODES.has(error.message) ? error.message : null;
  }
}
