import type { SigilCalculationTerm } from "./sigilValuationCore.js";
/** A reproducible display policy. Only the enclosing verified issuance can
 * bind it to an asset; this arithmetic neither admits nor settles anything. */
export type ReceizRarityExpressionV129 = Readonly<{
    constant: string;
}> | Readonly<{
    input: string;
}> | Readonly<{
    op: "add" | "subtract" | "multiply" | "divide" | "min" | "max";
    args: readonly ReceizRarityExpressionV129[];
}>;
export type ReceizRarityPolicyV129 = Readonly<{
    schema: "receiz.rarity-policy.v129";
    algorithm: string;
    version: string;
    platform: string;
    rounding: "half-up-phi-micro";
    expression: ReceizRarityExpressionV129;
}>;
export declare const RECEIZ_RARITY_POLICY_LIMITS_V129: Readonly<{
    expressionNodes: 256;
    expressionDepth: 16;
    operands: 64;
    decimalDigits: 128;
    arguments: 16;
}>;
export declare function digestReceizRarityPolicyV129(policy: ReceizRarityPolicyV129): Promise<string>;
export declare function evaluateReceizRarityPolicyV129(policyInput: ReceizRarityPolicyV129, operandsInput: Readonly<Record<string, string>>): Readonly<{
    valuePhiMicro: string;
    exactNumerator: string;
    exactDenominator: string;
    calculation: readonly SigilCalculationTerm[];
}>;
//# sourceMappingURL=proofValuePolicyV129.d.ts.map