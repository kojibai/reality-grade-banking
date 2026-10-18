import { handleBankApi } from '../server/bank-api.js';
import { relayPublicLedger } from '../server/public-ledger-proof.js';

// Web-standard entry keeps proof-bearing request bytes out of parsed-body
// helpers. All route, method, origin and upstream restrictions stay shared
// with the existing local handlers.
export default {
  fetch(request: Request): Promise<Response> {
    // Keep the public source entry in the emitted function's own dispatch
    // graph. It uses the same bounded relay as the local Ledger reader.
    if (new URL(request.url).pathname.startsWith('/api/bank/ledger-proof')) return relayPublicLedger(request);
    return handleBankApi(request);
  },
};
