import {
  runReceizOfflineNoteRollbackConformance,
  verifyReceizOfflineNoteRollbackConformanceEvidence,
  type ReceizOfflineNoteRollbackConformanceEvidenceV1,
} from "../../../packages/receiz-sdk/src/offlineNoteRollbackConformance";
import type {
  KairosNotePwaCredential,
  KairosNotePwaWebAuthnClient,
} from "./kairosNotePwaCustodyAdapter";

export type KairosNotePwaRollbackConformance = ReceizOfflineNoteRollbackConformanceEvidenceV1;

export async function runKairosNotePwaRollbackConformance(input: Readonly<{
  credential: KairosNotePwaCredential;
  webAuthn: KairosNotePwaWebAuthnClient;
  registrationCounter: string;
}>): Promise<KairosNotePwaRollbackConformance> {
  return runReceizOfflineNoteRollbackConformance(input);
}

export async function verifyKairosNotePwaRollbackConformanceEvidence(input: Readonly<{
  evidence: KairosNotePwaRollbackConformance;
  credential: KairosNotePwaCredential;
  registrationCounter: string;
}>): Promise<KairosNotePwaRollbackConformance> {
  return verifyReceizOfflineNoteRollbackConformanceEvidence(input);
}
