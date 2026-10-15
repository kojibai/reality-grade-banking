// Public registration coordinate. Preserve every byte; this is never a secret or identity authority.
export const BANK_APPLICATION_ID = 'rc_uV6aT6wZJCQDspB0_SJ1DcEm';
export const BANK_PREVIOUS_CARD_APPLICATION_ID = 'rc_ELkGAUBINd9Nw4bE5zMqUsgc';
export const BANK_CARD_APPLICATION_IDS = [BANK_APPLICATION_ID, BANK_PREVIOUS_CARD_APPLICATION_ID] as const;
export const BANK_OBSERVATION_APPLICATION_IDS = [...BANK_CARD_APPLICATION_IDS, 'rc_QlCRCxBk8zyT4ajGLrIRPIQd'] as const;
export const BANK_PUBLIC_ORIGIN = 'https://bank.receiz.com';
export const BANK_READ_SCOPES = ['receiz:wallet.read', 'receiz:settlement.read', 'receiz:reserve.read'] as const;
export const BANK_CARD_SCOPES = [...BANK_READ_SCOPES, 'receiz:payments.create', 'receiz:payments.read'] as const;
// Registered native integration contract. Each device still grants its own
// exact scopes; registration is not user consent or financial authority.
export const BANK_NATIVE_SCOPES = [...BANK_CARD_SCOPES, 'receiz:subjects.read', 'receiz:subjects.write', 'receiz:domains.read', 'receiz:domains.write', 'receiz:settlement.write', 'receiz:reserve.write', 'receiz:record', 'receiz:seal'] as const;
export const BANK_NATIVE_CONSENT = 'Allow Bankeiz to open my proof-native account sources and prepare custody, ownership, sales and currency actions inside this bank. Receiz receives my protected Identity Seal and signed consent for the listed native scopes. My signing key stays on this device. Every transfer, sale, redemption and backing commitment still requires my review and explicit approval of its exact proof-bound operation.';
export const BANK_CARD_CONSENT = 'Allow Bankeiz to create and check the card deposit I approve. Receiz processes my card payment and credits my shared Reserve account. Keep the unfinished checkout encrypted on this device so I can resume it. This does not authorize sending my balance or buying assets.';
export const BANK_READ_CONSENT = 'Allow Bankeiz to open my account using my Receiz proof objects and read my Reserve and Settlement balances. Receiz receives my encrypted Identity Seal and signed consent to open this account. My signing key stays on this device. This permission does not authorize transfers, purchases or sales.';
