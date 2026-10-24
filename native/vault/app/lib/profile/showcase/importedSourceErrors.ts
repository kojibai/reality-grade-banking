/** Inability to inspect/open a source is distinct from a failed proof. */
export class ImportedProofSourceUnavailableError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly artifactValidity: "verified" | "not-evaluated",
  ) {
    super(message);
    this.name = "ImportedProofSourceUnavailableError";
  }
}
