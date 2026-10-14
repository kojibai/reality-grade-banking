import { handleBankApi } from '../server/bank-api.js';

// Web-standard entry keeps proof-bearing request bytes out of parsed-body
// helpers. All route, method, origin and upstream restrictions stay shared
// with the existing local handlers.
export default { fetch: handleBankApi };
