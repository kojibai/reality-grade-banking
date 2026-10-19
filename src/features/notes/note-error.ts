import {noteFailureStage} from '../../receiz/note-stage';
/** Support details contain a bounded public error code only, never ceremony
 * responses, credentials, tickets, account identifiers or exception payloads. */
export function noteRegistrationCode(cause:unknown):string{
 const value=cause instanceof Error?cause.message:'';
 const code=value.startsWith('OFFLINE_NOTE_CUSTODY_UNSUPPORTED:')?value.slice('OFFLINE_NOTE_CUSTODY_UNSUPPORTED:'.length):value;
 return code.length<=160&&(/^(?:RECEIZ_)?OFFLINE_NOTE_(?:CUSTODY|PLATFORM_ATTESTATION|DEVICE_ATTESTATION)_[A-Z_]+$/.test(code)
  ||/^BANK_NOTE_(?:CHALLENGE_[A-Z_]+|TRANSPORT_REALM_INVALID)$/.test(code)
  ||['offline_note_attestation_issuer_unavailable','attestation_challenge_invalid','origin_mismatch','rate_limited'].includes(code))?code:'';
}
export function noteError(cause:unknown):string{
 const code=cause instanceof Error?cause.message:'';
 const stage=noteFailureStage(cause);
 if(stage&&['saved-notes','prepared-notes','saved-note-identity','offline-note-checkpoint','prepared-note-checkpoint','note-image'].includes(stage.stage))return 'Saved note custody could not be opened on this device. Keep your original proofs and this device; the saved state has not been reset.';
 if(stage?.stage==='device-signer')return 'Device signing setup could not complete. Your saved notes and exact pending attempt are preserved.';
 if(code==='BANK_NOTE_PREPARED_RECOVERY_REQUIRED')return 'A prepared note is still pending on this device. Keep its original proofs; a new note cannot start until that exact attempt is resolved.';
 if(code==='BANK_NOTE_COMPETING_ATTEMPTS')return 'Two saved note attempts need recovery. Keep this device and the original proofs; no new note has been started.';
 if(/(?:ATTESTATION_ISSUER_UNAVAILABLE|PLATFORM_ATTESTATION_ISSUER_UNAVAILABLE|offline_note_attestation_issuer_unavailable)/.test(code))return 'The device registration service is temporarily unavailable. Try again when connected.';
 if(/CUSTODY_CEREMONY_CANCELLED/.test(code))return 'Device registration was cancelled. Try again when you are ready.';
 if(/CUSTODY_(?:BACKUP_CAPABLE|BACKED_UP|BACKUP_ELIGIBLE|BACKUP_STATE)/.test(code))return 'This credential can sync to other devices. Offline Notes require custody bound to one device.';
 if(/CUSTODY_COUNTER_UNAVAILABLE/.test(code))return 'This credential does not provide the state counter required for secure offline transfers.';
 if(/CUSTODY_ROLLBACK_DETECTED/.test(code))return 'This note’s stored custody no longer matches its secure device state. Keep the original proof and recovery data.';
 if(/CUSTODY_(?:WEBAUTHN_UNAVAILABLE|PLATFORM_AUTHENTICATOR_UNAVAILABLE|CEREMONY_NOT_STARTED)/.test(code))return 'Secure device registration could not start. Open Bankeiz directly in a current browser and try again.';
 if(/CUSTODY_ATTESTATION_NOT_PROVIDED/.test(code))return 'This browser did not provide device custody evidence. Offline Notes cannot register this credential.';
 if(/CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED/.test(code))return 'This browser returned a credential format that Offline Notes cannot verify.';
 if(/CUSTODY_ATTESTATION_CHAIN_REQUIRED/.test(code))return 'This browser did not supply the device attestation required for Offline Notes.';
 if(/OFFLINE_NOTE_CUSTODY_UNSUPPORTED|ATTESTATION|ROLLBACK_CONFORMANCE|CUSTODY_(?:PROFILE_NOT_REGISTERED|ASSERTION_INVALID)/.test(code))return 'The device registration proof could not be verified. Keep this device and any original proof.';
 if(/INSUFFICIENT_PREPARED_FUNDS/.test(code))return 'This device does not have enough value ready for this note. Choose a lower amount.';
 if(/PREPARED_RESOURCE_REQUIRED|PREPARED_RECEIVER_REQUIRED/.test(code))return 'Reconnect to prepare secure note capacity on this device, then try again.';
 if(/TRANSPORT_CAPACITY/.test(code))return 'This note needs more space for its complete proof. Its current value stays held on this device.';
 if(/INSUFFICIENT_SETTLEMENT/.test(code))return 'Choose an amount within your available Settlement balance.';
 if(/INSUFFICIENT_RESERVE/.test(code))return 'This note needs enough funded Reserve. Add money or choose a lower amount.';
 if(/EXACT_HEAD|IRREVERSIBLY_CONSUMED/.test(code))return 'This device does not hold this note’s current custody. Ask the sender to use your receiving request and send the resulting note image.';
 if(/BANK_NOTE_|BANK_ALLOCATION_|503|temporarily unavailable|fetch|network/i.test(code))return 'The note service is unavailable or this result is pending. Your exact attempt stays on this device. Reopen this action to resume safely.';
 return code||'This note could not be opened. Keep the original image and try again.';
}
