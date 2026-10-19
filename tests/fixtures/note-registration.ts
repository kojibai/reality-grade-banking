// Hand-encoded diagnostic CBOR, not authentic attestation or qualification.
export function unattestedResponse(flags = 0x1d, counter = 0) {
  const authData = new Uint8Array(37); authData[32] = flags; new DataView(authData.buffer).setUint32(33, counter);
  const bytes = new Uint8Array([0xa3,0x63,0x66,0x6d,0x74,0x64,0x6e,0x6f,0x6e,0x65,0x67,0x61,0x74,0x74,0x53,0x74,0x6d,0x74,0xa0,0x68,0x61,0x75,0x74,0x68,0x44,0x61,0x74,0x61,0x58,0x25,...authData]);
  return { id: 'never-display-credential-id', response: { attestationObject: Buffer.from(bytes).toString('base64url'), clientDataJSON: 'never-display-client-data' }, clientExtensionResults: { secret: 'never-display-extension-data' } };
}
