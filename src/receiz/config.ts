// Public registration coordinate. Preserve every byte; this is never a secret or identity authority.
export const BANK_APPLICATION_ID = 'rc_ELkGAUBINd9Nw4bE5zMqUsgc';
export const BANK_OBSERVATION_APPLICATION_IDS = [BANK_APPLICATION_ID, 'rc_QlCRCxBk8zyT4ajGLrIRPIQd'] as const;
export const BANK_PUBLIC_ORIGIN = 'https://bank.receiz.com';
export const BANK_READ_SCOPES = ['receiz:wallet.read', 'receiz:settlement.read', 'receiz:reserve.read'] as const;
export const BANK_CARD_SCOPES = [...BANK_READ_SCOPES, 'receiz:payments.create', 'receiz:payments.read'] as const;
export const BANK_CARD_CONSENT = 'Allow Receiz Bank to create and check the card deposit I approve. Receiz processes my card payment and credits my shared Reserve account. Keep the unfinished checkout encrypted on this device so I can resume it. This does not authorize sending my balance or buying assets.';
export const BANK_READ_CONSENT = 'Allow Receiz Bank to read my Receiz wallet, Reserve and Settlement. Receiz receives my encrypted Identity Seal and signed consent to open this account. My signing key stays on this device. This permission does not authorize transfers, purchases or sales.';
