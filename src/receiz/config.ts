// Public registration coordinate. Preserve every byte; this is never a secret or identity authority.
export const BANK_APPLICATION_ID = 'rc_uV6aT6wZJCQDspB0_SJ1DcEm';
export const BANK_PREVIOUS_CARD_APPLICATION_ID = 'rc_ELkGAUBINd9Nw4bE5zMqUsgc';
export const BANK_CARD_APPLICATION_IDS = [BANK_APPLICATION_ID, BANK_PREVIOUS_CARD_APPLICATION_ID] as const;
export const BANK_OBSERVATION_APPLICATION_IDS = [...BANK_CARD_APPLICATION_IDS, 'rc_QlCRCxBk8zyT4ajGLrIRPIQd'] as const;
export const BANK_PUBLIC_ORIGIN = 'https://bankeiz.com';
// Existing QR/NFC requests remain readable; new requests use the public Bankeiz origin.
export const BANK_PAYMENT_ORIGINS = [BANK_PUBLIC_ORIGIN, 'https://bank.receiz.com'] as const;
const BANK_NOTE_REALMS: Readonly<Record<string, string>> = Object.freeze({
  'https://bankeiz.com': 'bankeiz.com',
  'https://bank.receiz.com': 'receiz.com',
  'http://localhost:4173': 'localhost',
  'http://localhost:5173': 'localhost',
});
export const bankNoteRpId = (origin: string): string | null => Object.hasOwn(BANK_NOTE_REALMS, origin) ? BANK_NOTE_REALMS[origin] : null;
export const BANK_READ_SCOPES = ['receiz:wallet.read', 'receiz:settlement.read', 'receiz:reserve.read'] as const;
export const BANK_RECOVERY_SCOPES = ['receiz:domains.read'] as const;
export const BANK_RECOVERY_CONSENT = 'Allow Bankeiz to read the recorded result of my retained transaction using its original operation reference. Receiz receives my protected Identity Seal and signed consent for receiz:domains.read. This read-only access does not authorize a transfer, purchase, sale or new execution.';
export const BANK_CARD_SCOPES = [...BANK_READ_SCOPES, 'receiz:payments.create', 'receiz:payments.read'] as const;
// Registered native integration contract. Each device still grants its own
// exact scopes; registration is not user consent or financial authority.
export const BANK_NATIVE_SCOPES = [...BANK_CARD_SCOPES, 'receiz:subjects.read', 'receiz:subjects.write', 'receiz:domains.read', 'receiz:domains.write', 'receiz:settlement.write', 'receiz:reserve.write', 'receiz:record', 'receiz:seal'] as const;
export const BANK_NATIVE_CONSENT = 'Allow Bankeiz to open my proof-native account sources and prepare custody, ownership, sales and currency actions inside this bank. Receiz receives my protected Identity Seal and signed consent for the listed native scopes. My signing key stays on this device. Every transfer, sale, redemption and backing commitment still requires my review and explicit approval of its exact proof-bound operation.';
export const BANK_CARD_CONSENT = 'Continuing authorizes only your selected card deposit and its status checks. Receiz processes the payment and credits your Reserve after settlement. Unfinished checkout details are encrypted on this device so you can resume. This does not authorize transfers or asset purchases.';
export const BANK_READ_CONSENT = 'Allow Bankeiz to open my account using my proof objects and read my Reserve and Settlement balances. Receiz receives my encrypted Identity Seal and signed consent to open this account. My signing key stays on this device. This permission does not authorize transfers, purchases or sales.';
