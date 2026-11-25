type BalanceAction = 'read' | 'enable' | 'moveBack';
export type WalletBalanceNotice = {
  title: string;
  message: string;
  support?: { code: string; requirement: string };
  bankeizHelp?: true;
  offerNearby?: true;
};

export function walletBalanceNotice(cause: unknown, action: BalanceAction): WalletBalanceNotice {
  const notice = balanceNotice(cause, action);
  return action === 'enable' ? { ...notice, offerNearby: true } : notice;
}

function balanceNotice(cause: unknown, action: BalanceAction): WalletBalanceNotice {
  const error = cause as { message?: unknown; payload?: { error?: unknown; code?: unknown } } | null;
  const value = error?.payload?.error ?? error?.payload?.code ?? error?.message;
  const code = typeof value === 'string' ? value.replace(/^OFFLINE_NOTE_CUSTODY_UNSUPPORTED:/, '') : '';
  const device = (title: string, message: string, requirement: string): WalletBalanceNotice =>
    ({ title, message, support: { code, requirement } });

  switch (code) {
    case 'BANK_ANDROID_WALLET_BRIDGE_UNAVAILABLE':
      return device('Android secure setup is unavailable',
        'Open Bankeiz from the installed app icon with Chrome up to date, then try again. You can still make nearby payments from your regular balance.',
        'A verified connection between the Bankeiz app and Android Keystore');
    case 'ANDROID_WALLET_ATTESTATION_HARDWARE':
    case 'BANK_ANDROID_WALLET_HARDWARE_UNAVAILABLE':
      return device('This setup needs device hardware support',
        'Try the Bankeiz Android app on a supported phone. You can keep using nearby payments from your regular balance.',
        'A hardware-backed signing key with a verified one-use limit');
    case 'OFFLINE_NOTE_CUSTODY_WEBAUTHN_UNAVAILABLE':
    case 'OFFLINE_NOTE_CUSTODY_PLATFORM_AUTHENTICATOR_UNAVAILABLE':
    case 'OFFLINE_NOTE_CUSTODY_CREDENTIAL_CREATION_FAILED':
      return device('Secure device approval is unavailable',
        'Open Bankeiz directly in an up-to-date browser and make sure your device has a screen lock. Then try enabling offline funds again.',
        'WebAuthn with a built-in authenticator and user verification');
    case 'OFFLINE_NOTE_CUSTODY_BACKUP_CAPABLE':
    case 'OFFLINE_NOTE_CUSTODY_BACKUP_ELIGIBLE':
    case 'OFFLINE_NOTE_CUSTODY_BACKED_UP':
    case 'OFFLINE_NOTE_CUSTODY_BACKUP_STATE':
      return device('This credential can sync across devices',
        'Offline Cash needs a credential that stays on one device. Choose a device-bound credential if your device offers one.',
        'A built-in WebAuthn credential with backup eligibility and backup state both disabled');
    case 'OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED':
    case 'OFFLINE_NOTE_CUSTODY_ATTESTATION_CHAIN_REQUIRED':
    case 'OFFLINE_NOTE_CUSTODY_ATTESTED_CREDENTIAL_REQUIRED':
      return device('Device attestation was missing',
        'Wallet didn’t receive the device evidence needed to protect Offline Cash. Try in your regular browser window with the browser and operating system up to date.',
        'Direct WebAuthn attestation with a verifiable device certificate chain');
    case 'OFFLINE_NOTE_CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED':
    case 'OFFLINE_NOTE_CUSTODY_P256_PUBLIC_KEY_REQUIRED':
      return device('The device proof format isn’t supported',
        'This browser returned an attestation format Wallet cannot verify. Check the supported device credential options before retrying.',
        'Verifiable direct WebAuthn attestation for a device-bound P-256 credential');
    case 'OFFLINE_NOTE_CUSTODY_COUNTER_UNAVAILABLE':
      return device('The device didn’t provide a signing counter',
        'Wallet uses this counter to prevent an older copy from spending the same offline funds.',
        'A WebAuthn signing counter that advances by one for each approved assertion');
    case 'OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED':
      return device('The signing counter check didn’t complete',
        'Try again and complete every device prompt. If the check still stops, ask about the counter this device supplies.',
        'A WebAuthn signing counter that advances by one for each approved assertion');
    case 'BANK_EXECUTION_DEVICE_LOCK_REQUIRED':
      return device('Offline Cash needs browser locking',
        'This browser session couldn’t lock the shared Wallet state while setting up offline funds. Open Bankeiz in an up-to-date browser and try again.',
        'Web Locks API support for websites');
    case 'OFFLINE_NOTE_CUSTODY_INDEXEDDB_UNAVAILABLE':
      return device('Site storage is unavailable',
        'Open Bankeiz in a regular browser window with site storage enabled, then try again.',
        'IndexedDB storage for this site');
    case 'OFFLINE_NOTE_CUSTODY_CEREMONY_CANCELLED':
      return { title: 'Device approval was interrupted', message: 'Tap Enable offline when you’re ready to complete the device prompts.' };
    case 'BANK_LOCAL_FINANCIAL_OFFLINE':
      return { title: 'Connect to continue', message: 'Offline balance changes need a connection. Try again when you’re online.' };
    case 'BANK_WALLET_ACCOUNT_REQUIRED':
    case 'BANK_WALLET_IDENTITY_CHANGED':
    case 'BANK_WALLET_DEVICE_REQUIRED':
      return { title: 'Reopen your Wallet on this device', message: 'Wallet couldn’t match this setup to the open account or its secure device credential. Reopen your Identity Record and try again.', bankeizHelp: true };
    case 'BANK_WALLET_MOVE_BACK_PENDING':
      return { title: 'Finish the pending move back', message: 'Complete the existing move back before changing your offline balance again.' };
    case 'BANK_WALLET_PREVIOUS_SEND_PENDING':
      return { title: 'Continue the saved Wallet request', message: 'Finish the previous Wallet action before changing the requested amount.' };
    case 'BANK_WALLET_MOVE_BACK_AMOUNT':
      return { title: 'Check the amount', message: 'Enter an amount within your available offline balance.' };
    case 'Enter an amount with up to two decimal places.':
    case 'Enter an amount greater than zero.':
      return { title: 'Check the amount', message: code };
    case 'OFFLINE_NOTE_DEVICE_ATTESTATION_INSUFFICIENT':
    case 'OFFLINE_NOTE_CUSTODY_ATTESTATION_INVALID':
    case 'RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_INVALID':
      return { title: 'Device proof could not be verified', message: 'Wallet couldn’t confirm the credential’s attestation. Bankeiz support can help identify which part of the registration needs attention.', bankeizHelp: true };
    case 'Unsupported Receiz bank transport.':
      return { title: 'Offline Cash setup is incomplete', message: 'The setup request didn’t reach Receiz. Your balance is available for nearby payments.' };
    case 'android_wallet_enrollment_unavailable':
      return { title: 'Android setup is temporarily unavailable', message: 'The Android enrollment service is temporarily unavailable. Try enabling Offline Cash again later.' };
    case 'BANK_WALLET_FUNDED_TRANSPORT_UNAVAILABLE':
    case 'OFFLINE_NOTE_CUSTODY_CEREMONY_NOT_STARTED':
    case 'OFFLINE_NOTE_CUSTODY_ATTESTATION_ISSUER_UNAVAILABLE':
    case 'offline_note_attestation_issuer_unavailable':
    case 'BANK_NOTE_CHALLENGE_INVALID':
      return { title: 'Wallet setup could not be confirmed', message: 'The account service didn’t confirm this request. Reopen your balance to check its status before retrying.', bankeizHelp: true };
    default:
      if (action === 'enable') return {
        title: 'Offline Cash setup is incomplete',
        message: 'Bankeiz couldn’t confirm Offline Cash setup. Check the Offline Cash balance before trying again.',
      };
      return {
        title: action === 'read' ? 'Offline balance is unavailable' : 'Move back was not confirmed',
        message: 'Reopen your balance to check its status. If this continues, contact Bankeiz support.',
        bankeizHelp: true,
      };
  }
}
