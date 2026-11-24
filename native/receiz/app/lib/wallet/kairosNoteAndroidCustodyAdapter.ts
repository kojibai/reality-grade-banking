import { canonicalizeReceizConstitution } from "../../../packages/receiz-sdk/src/constitution";
import {
  activateReceizAndroidNote,
  createReceizAndroidNoteReceivingCustody,
  qualifyReceizAndroidNoteReceivingCustody,
  signReceizAndroidNoteHandoff,
  verifyReceizAndroidNoteHandoff,
  type ReceizAndroidNoteActivation,
  type ReceizAndroidNoteHandoff,
  type ReceizAndroidNoteReceivingCustody,
  type ReceizAndroidNoteSign,
} from "../../../packages/receiz-sdk/src/offlineNoteAndroidHandoff";
import type { ReceizOfflineNoteCustodyQualificationV1 } from "../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";
import type {
  KairosNoteActivateExactSuccessorInput,
  KairosNoteConsumeExactHeadInput,
} from "./kairosNotePwaCustodyAdapter";

type ActiveSlot = Readonly<{
  schema: "receiz.bank.android-note-slot.v1";
  status: "active";
  receivingCustody: ReceizAndroidNoteReceivingCustody;
}>;
type HeldSlot = Omit<ActiveSlot, "status"> & Readonly<{
  status: "held";
  activation: ReceizAndroidNoteActivation;
}>;
type RetiredSlot = Omit<HeldSlot, "status"> & Readonly<{
  status: "retired";
  consumeInput: KairosNoteConsumeExactHeadInput;
  consumption: ReceizAndroidNoteHandoff;
}>;
type Slot = ActiveSlot | HeldSlot | RetiredSlot;

type Options = Readonly<{
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  sign: ReceizAndroidNoteSign;
  enroll(): Promise<unknown>;
  read(): Promise<Slot | null>;
  write(next: Slot, previous: Slot | null): Promise<void>;
}>;

const canonical = canonicalizeReceizConstitution;

/** All spent keys and exact retries remain fenced by Android custody even if
 * the browser restores an earlier copy of its private slot state. */
export function createKairosNoteAndroidCustodyAdapter(input: Options) {
  const roots = { roots: input.roots };

  return Object.freeze({
    read: input.read,
    async qualifyInstallation() {
      const state = await input.read();
      if (state?.status === "retired") {
        return { status: "retired", code: "OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED" } as const;
      }
      if (state) return qualifyReceizAndroidNoteReceivingCustody(state.receivingCustody, roots);
      const receivingCustody = await createReceizAndroidNoteReceivingCustody(await input.enroll(), roots);
      if (receivingCustody.attestation.purpose !== "holding") throw Error("OFFLINE_NOTE_RECEIVING_CUSTODY_MISMATCH");
      await input.write({ schema: "receiz.bank.android-note-slot.v1", status: "active", receivingCustody }, null);
      return qualifyReceizAndroidNoteReceivingCustody(receivingCustody, roots);
    },
    async createReceivingCommitment(qualification: ReceizOfflineNoteCustodyQualificationV1) {
      const state = await input.read();
      if (state?.status !== "active") throw Error("OFFLINE_NOTE_CUSTODY_QUALIFICATION_REQUIRED");
      const bound = await qualifyReceizAndroidNoteReceivingCustody(state.receivingCustody, roots);
      if (bound.qualificationDigest !== qualification.qualificationDigest) {
        throw Error("OFFLINE_NOTE_CUSTODY_QUALIFICATION_REQUIRED");
      }
      return state.receivingCustody;
    },
    async activateExactSuccessor(value: KairosNoteActivateExactSuccessorInput) {
      const state = await input.read();
      const { qualificationDigest, receivingCustodyCommitmentDigest, ...head } = structuredClone(value);
      if (!state || state.status === "retired"
        || state.receivingCustody.qualificationDigest !== qualificationDigest
        || state.receivingCustody.receivingCustodyCommitmentDigest !== receivingCustodyCommitmentDigest) {
        throw Error("OFFLINE_NOTE_RECEIVING_CUSTODY_MISMATCH");
      }
      if (state.status === "held" && canonical(state.activation.head) !== canonical(head)) {
        throw Error("OFFLINE_NOTE_EXACT_SUCCESSOR_ALREADY_ACTIVE");
      }
      const activation = await activateReceizAndroidNote({
        ...roots, head, custody: state.receivingCustody, sign: input.sign,
      });
      if (state.status === "active") await input.write({ ...state, status: "held", activation }, state);
      return activation;
    },
    async consumeExactHead(value: KairosNoteConsumeExactHeadInput) {
      const state = await input.read();
      const request = structuredClone(value);
      const { qualificationDigest, currentCustodyCommitmentDigest, ...next } = request;
      if (!state || state.status === "active"
        || state.receivingCustody.qualificationDigest !== qualificationDigest
        || state.receivingCustody.receivingCustodyCommitmentDigest !== currentCustodyCommitmentDigest) {
        throw Error("OFFLINE_NOTE_CUSTODY_QUALIFICATION_REQUIRED");
      }
      if (state.status === "retired") {
        if (canonical(request) !== canonical(state.consumeInput)) {
          throw Error("OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED");
        }
        await verifyReceizAndroidNoteHandoff(state.consumption, roots);
        return state.consumption;
      }
      const consumption = await signReceizAndroidNoteHandoff({
        ...roots, custody: state.receivingCustody, activation: state.activation, next, sign: input.sign,
      });
      await input.write({ ...state, status: "retired", consumeInput: request, consumption }, state);
      return consumption;
    },
  });
}
