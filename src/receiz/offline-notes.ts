export type BankNoteRail = 'reserve' | 'settlement';
export interface BankNoteImage { noteId: string; rail?: BankNoteRail; amountPhiMicro?: string; amountUsdCents: string; image: Uint8Array; transferred?: boolean; transferPending?: boolean; }
export interface BankNoteInspection { rail?: BankNoteRail; noteId: string; amountUsdCents: string; amountPhiMicro: string; }
export interface BankNoteDeposit { rail?: BankNoteRail; amountPhiMicro?: string; walletAfterPhiMicro?: string; noteId: string; amountUsdCents: string; proofBytes: Uint8Array; reserveAfterUsdCents: string; }
export interface BankOfflineNotes {
  savedNotes(): Promise<BankNoteImage[]>;
  pending(): Promise<{ noteId: string; rail?: BankNoteRail; amountUsdCents: string; canCancel?: boolean } | null>;
  cancelUnfunded(): Promise<void>;
  create(amount: string, rail?: BankNoteRail): Promise<BankNoteImage>;
  receivingRequest(): Promise<Uint8Array>;
  transfer(noteId: string, request?: Uint8Array): Promise<{ noteId: string; image: Uint8Array }>;
  inspect(image: Uint8Array): Promise<BankNoteInspection>;
  deposit(image: Uint8Array): Promise<BankNoteDeposit>;
}
export interface BankNoteRuntime {
  savedNotes(): Promise<BankNoteImage[]>;
  pending(): Promise<{ noteId: string; rail?: BankNoteRail; amountUsdCents: string; canCancel?: boolean } | null>;
  cancelUnfunded(): Promise<void>;
  createNote(amountUsdCents: string, accountProof: unknown, rail?: BankNoteRail): Promise<BankNoteImage & { successorAccountProof: unknown }>;
  receivingRequest(): Promise<Uint8Array>;
  transferNote(noteId: string, request?: Uint8Array): Promise<{ noteId: string; image: Uint8Array }>;
  inspectNote(image: Uint8Array): Promise<BankNoteInspection>;
  depositNote(image: Uint8Array): Promise<BankNoteDeposit>;
}
export type BankNoteRuntimeFactory = (input: {
  keyId: string; uid: string; localUid: string; origin: string; passphrase: string; fetchImpl: typeof fetch;
  request: (path: string, options: { method: 'GET' | 'POST'; body?: Record<string, unknown> }) => Promise<unknown>;
  sealDocument: (input: { fileBytes: Uint8Array; filename: string; mime: string; options?: Record<string, unknown> }) => Promise<unknown>;
  retain: (bytes: Uint8Array) => Promise<string>; restore: (digest: string) => Promise<Uint8Array>;
  read: () => Promise<unknown>; write: (next: unknown, previous: unknown) => Promise<void>; assertOpen: () => void;
  artwork: (amount: string, noteId: string, compact?: boolean, rail?: BankNoteRail) => Promise<Uint8Array>;
}) => BankNoteRuntime;
let runtime: Promise<{ createBankOfflineNotesRuntime: BankNoteRuntimeFactory; createBankNativeNoteSealer: (input: unknown) => Promise<Parameters<BankNoteRuntimeFactory>[0]['sealDocument']> }> | undefined;
export function loadBankNoteRuntime() {
  // Built from the pinned Receiz v129 host primitives. Loaded only when a note
  // action is opened; it never delays account or market first paint.
  const moduleUrl = new URL('/native/offline-notes.v129.mjs', location.origin).href;
  return runtime ??= import(/* @vite-ignore */ `${moduleUrl}?build=${noteRuntimeBuild.moduleSha256}`).catch(error => { runtime = undefined; throw error; });
}
export { bankNoteArtwork } from './note-artwork';
import noteRuntimeBuild from '../../public/native/offline-notes.v129.manifest.json';
