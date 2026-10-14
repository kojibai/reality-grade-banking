import { BANK_APPLICATION_ID } from '../src/receiz/config.js';
import { BANK_NATIVE_OPERATIONS } from '../src/receiz/bank-native-readiness.js';
export interface NativeQualificationProbe { operation: string; status: number | null; requestId: string | null; }
// Optional operator diagnostics only. Qualification is read-only; no source,
// session, plan or financial route is invoked. This cannot enable transactions.
export async function probeNativeQualification(body: string, authorization?: string): Promise<NativeQualificationProbe[]> {
  if (body.length > 4096 || !authorization?.startsWith('Bearer ') || /\s/.test(authorization.slice(7)) || !authorization.slice(7)) return [];
  let input: { applicationId?: unknown; operations?: unknown };
  try { input = JSON.parse(body); } catch { return []; }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 2 || input.applicationId !== BANK_APPLICATION_ID || !Array.isArray(input.operations) || !input.operations.length || input.operations.length > BANK_NATIVE_OPERATIONS.length || new Set(input.operations).size !== input.operations.length || input.operations.some(operation => !BANK_NATIVE_OPERATIONS.includes(operation))) return [];
  return Promise.all(input.operations.map(async (operation: string) => {
    try {
      const response = await fetch(`https://receiz.com/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({ applicationId: BANK_APPLICATION_ID, operations: [operation] }), redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15000) });
      const id = response.headers.get('x-vercel-id');
      await response.body?.cancel();
      return { operation, status: response.status, requestId: id && /^[a-zA-Z0-9:.-]{1,160}$/.test(id) ? id : null };
    } catch { return { operation, status: null, requestId: null }; }
  }));
}
