import {readFixedSale,type FixedSale} from '../../src/receiz/fixed-checkout';
import {buildFixedPaymentTools} from '../../src/receiz/payment-tools';
/** Use the same public request as Counter. Persist the merchant sale before
 * presenting its link; fulfillment still requires its matching received original. */
export async function fixedCheckoutInstallation(sale:FixedSale){return buildFixedPaymentTools(await readFixedSale(sale));}
