import { expect, it } from 'vitest';
import { readNoteRegistrationEvidence } from '../src/receiz/note-registration-evidence';
import { unattestedResponse } from './fixtures/note-registration';
it('reports only the actual format, flags and unsigned registration counter without qualifying them', () => {
  expect(readNoteRegistrationEvidence(unattestedResponse())).toEqual({ format: 'none', counter: '0', userVerified: true, backupEligible: true, backedUp: true });
  expect(readNoteRegistrationEvidence(unattestedResponse(1, 4294967295))).toEqual({ format: 'none', counter: '4294967295', userVerified: false, backupEligible: false, backedUp: false });
});
it.each([null, {}, { response: { attestationObject: 'private arbitrary message' } }, { response: { attestationObject: 'a'.repeat(131073) } }, { response: { attestationObject: 'ow' } }])('ignores incomplete or malformed diagnostic input', value => {
  expect(readNoteRegistrationEvidence(value)).toBeNull();
});
