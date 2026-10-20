import { boundedIsoTrailerApplicability, detectDocumentFormat } from "./fileFormat";
import { currentReceizVerificationRuntimeAvailable, executeReceizCurrentTrailerSource, type ReceizStreamingTrailerInput, type ReceizStreamingTrailerVerification } from "../../../packages/receiz-sdk/src/verifier/canonical";
import { receizProtocolOperationalDenial } from "../../../packages/receiz-sdk/src/verificationLimits";

export type SelectedSourceExecution =
  | Readonly<{ execution: "complete"; bytes: Uint8Array }>
  | Readonly<{ execution: "streamed" | "unavailable"; result: ReceizStreamingTrailerVerification }>;

export function unavailableSelectedSourceExecution(): Extract<SelectedSourceExecution, { result: unknown }> {
  return { execution: "unavailable", result: {
    verification: { ok: false, integrity: { ok: false, errors: [] }, kind: "trailer", errors: [], warnings: [], bundle: null, anchor: null, package: null,
      denial: receizProtocolOperationalDenial("VERIFICATION_RESOURCE_UNAVAILABLE") },
    artifactSha256: null, payloadSha256: null, payloadByteLength: null,
  } };
}

/** Selects mechanics beneath canonical proof. Consumers keep their own strict
 * append opener or read-only/privacy projector. Never used for held first paint. */
export async function executeSelectedSource(input: ReceizStreamingTrailerInput & { filename?: string; mime?: string }): Promise<SelectedSourceExecution> {
  try {
    const byteLength = input.file.size;
    const file = input.file.slice(0, byteLength);
    if (file.size !== byteLength) return unavailableSelectedSourceExecution();
    const filename = input.filename;
    const mime = input.mime;
    const roots = input.signatureV4RootPublicKeys && new Map([...input.signatureV4RootPublicKeys].map(([kid, root]) => [kid, Object.freeze({ ...root })]));
    const complete = async (): Promise<SelectedSourceExecution> => {
      if (!(await currentReceizVerificationRuntimeAvailable())) return unavailableSelectedSourceExecution();
      const bytes = new Uint8Array(await file.arrayBuffer());
      return bytes.byteLength === byteLength ? { execution: "complete", bytes } : unavailableSelectedSourceExecution();
    };
    if (byteLength <= 16 * 1024 * 1024) return await complete();
    const prefixLength = Math.min(byteLength, 4096);
    const part = file.slice(0, prefixLength);
    if (part.size !== prefixLength) return unavailableSelectedSourceExecution();
    const prefix = new Uint8Array(await part.arrayBuffer());
    if (prefix.byteLength !== prefixLength) return unavailableSelectedSourceExecution();
    const format = detectDocumentFormat(prefix, { filename, mime });
    const iso = boundedIsoTrailerApplicability(prefix);
    const text = new TextDecoder().decode(prefix).replace(/^\uFEFF/, "").trimStart();
    if (["png", "pdf", "jpeg", "zip", "svg", "json"].includes(format)
      || iso === "complete-required" || !text || /^[<{\[]/.test(text)) return await complete();
    const streamed = await executeReceizCurrentTrailerSource({ file, signatureV4RootPublicKeys: roots });
    if (streamed.execution === "needs-existing-full-executor") return await complete();
    return streamed;
  } catch {
    // Actual IO/allocation/runtime inability is never an invalid proof verdict
    // or a reason to retry through whole-source allocation.
    return unavailableSelectedSourceExecution();
  }
}
