// Public registration coordinate. Preserve every byte; this is never a secret or identity authority.
export const BANK_APPLICATION_ID = 'rc_QlCRCxBk8zyT4ajGLrIRPIQd';
export const BANK_READ_SCOPES = ['receiz:wallet.read', 'receiz:settlement.read', 'receiz:reserve.read'] as const;
export const BANK_READ_CONSENT = 'Allow Receiz Bank to read my existing Receiz wallet, Reserve and Settlement. Receiz receives my encrypted Identity Seal and signed consent to open this account. My signing key stays on this device. This permission does not authorize transfers, purchases or sales.';
