import { receizBase64UrlEncode, receizBase64UrlDecode } from "../../../../packages/receiz-sdk/src/identity";
import type { BankFundedNoteSource } from "./fundedNote";
export function encodeBankFundedSource(source: BankFundedNoteSource) { return { ...source, fundingArtifactBytes: receizBase64UrlEncode(source.fundingArtifactBytes), noteArtifacts: source.noteArtifacts.map(receizBase64UrlEncode) }; }
export function decodeBankFundedSource(value: unknown): BankFundedNoteSource {
    const v = value as ReturnType<typeof encodeBankFundedSource>;
    if (!v || v.schema !== "receiz.bank.funded-note-source.v1" || Object.keys(v).sort().join("|") !== "fundingArtifactBytes|fundingCustody|noteArtifacts|reserveConsumptions|schema" || typeof v.fundingArtifactBytes !== "string" || !Array.isArray(v.noteArtifacts) || !v.noteArtifacts.length || v.noteArtifacts.length > 128 || !Array.isArray(v.reserveConsumptions) || v.reserveConsumptions.length > 128 || v.noteArtifacts.some(x => typeof x !== "string"))
        throw Error("BANK_NOTE_COMPLETE_FUNDING_SOURCE_REQUIRED");
    return { ...v, fundingArtifactBytes: receizBase64UrlDecode(v.fundingArtifactBytes), noteArtifacts: v.noteArtifacts.map(receizBase64UrlDecode) };
}
