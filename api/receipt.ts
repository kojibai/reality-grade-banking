import {handleReceiptPreview} from '../server/receipt-runtime/receipt-preview.mjs';

// Stateless presentation of the receipt packet; no account or ledger access.
export default {fetch(request:Request):Promise<Response>{return handleReceiptPreview(request);}};
