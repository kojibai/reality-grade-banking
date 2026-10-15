import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import type { SigilCalculationTerm } from "./sigilValuationCore.js";

/** A reproducible display policy. Only the enclosing verified issuance can
 * bind it to an asset; this arithmetic neither admits nor settles anything. */
export type ReceizRarityExpressionV129 = Readonly<{ constant: string }>
  | Readonly<{ input: string }>
  | Readonly<{ op: "add" | "subtract" | "multiply" | "divide" | "min" | "max"; args: readonly ReceizRarityExpressionV129[] }>;
export type ReceizRarityPolicyV129 = Readonly<{
  schema: "receiz.rarity-policy.v129";
  algorithm: string;
  version: string;
  platform: string;
  rounding: "half-up-phi-micro";
  expression: ReceizRarityExpressionV129;
}>;
export const RECEIZ_RARITY_POLICY_LIMITS_V129 = Object.freeze({
  expressionNodes: 256, expressionDepth: 16, operands: 64, decimalDigits: 128, arguments: 16,
});
type Rational = Readonly<{ n: bigint; d: bigint }>;
const fail = (code: string): never => { throw new TypeError(`V129_RARITY_${code}`); };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const key = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_.:-]{0,127}$/.test(value);
const members = (value: Record<string, unknown>, names: string[]) => Object.keys(value).sort().join(",") === names.sort().join(",");
function integer(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|-?[1-9][0-9]*)$/.test(value)
    || value.replace("-", "").length > RECEIZ_RARITY_POLICY_LIMITS_V129.decimalDigits) return fail("INTEGER_INVALID");
  return BigInt(value);
}
function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) return fail("DIVISION_BY_ZERO");
  if (d < 0n) { n = -n; d = -d; }
  let a = n < 0n ? -n : n; let b = d;
  while (b !== 0n) { const remainder = a % b; a = b; b = remainder; }
  const divisor = a || 1n; n /= divisor; d /= divisor;
  integer(n.toString()); integer(d.toString());
  return { n, d };
}
const fraction = (value: Rational) => value.d === 1n ? value.n.toString() : `${value.n}/${value.d}`;

function inspectPolicy(policy: ReceizRarityPolicyV129): Readonly<{ policy: ReceizRarityPolicyV129; inputs: Set<string> }> {
  // Reject accessors, exotic prototypes, unsupported JSON and cycles before
  // reading the immutable canonical snapshot used for hashing/evaluation.
  let snapshot: unknown;
  try { snapshot = JSON.parse(canonicalizeReceizV122(policy)); } catch { return fail("POLICY_INVALID"); }
  if (!record(snapshot) || !members(snapshot, ["schema", "algorithm", "version", "platform", "rounding", "expression"])
    || snapshot.schema !== "receiz.rarity-policy.v129" || typeof snapshot.algorithm !== "string"
    || !/^[a-zA-Z][a-zA-Z0-9_./:-]{0,127}$/.test(snapshot.algorithm) || !key(snapshot.platform)
    || typeof snapshot.version !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(snapshot.version)
    || snapshot.rounding !== "half-up-phi-micro") return fail("POLICY_INVALID");
  const inputs = new Set<string>(); let nodes = 0;
  const inspect = (expression: unknown, depth: number): void => {
    if (++nodes > RECEIZ_RARITY_POLICY_LIMITS_V129.expressionNodes || depth > RECEIZ_RARITY_POLICY_LIMITS_V129.expressionDepth) fail("EXPRESSION_LIMIT");
    if (!record(expression)) return fail("EXPRESSION_INVALID");
    if (members(expression, ["constant"])) { integer(expression.constant); return; }
    if (members(expression, ["input"]) && key(expression.input)) { inputs.add(expression.input); return; }
    if (!members(expression, ["op", "args"]) || !["add", "subtract", "multiply", "divide", "min", "max"].includes(String(expression.op))
      || !Array.isArray(expression.args) || expression.args.length < 2 || expression.args.length > RECEIZ_RARITY_POLICY_LIMITS_V129.arguments
      || (["subtract", "divide"].includes(String(expression.op)) && expression.args.length !== 2)) return fail("EXPRESSION_INVALID");
    for (const argument of expression.args) inspect(argument, depth + 1);
  };
  inspect(snapshot.expression, 0);
  if (inputs.size > RECEIZ_RARITY_POLICY_LIMITS_V129.operands) fail("OPERANDS_LIMIT");
  return { policy: snapshot as unknown as ReceizRarityPolicyV129, inputs };
}

export async function digestReceizRarityPolicyV129(policy: ReceizRarityPolicyV129): Promise<string> {
  return digestReceizCanonicalV122(inspectPolicy(policy).policy);
}

export function evaluateReceizRarityPolicyV129(policyInput: ReceizRarityPolicyV129, operandsInput: Readonly<Record<string, string>>): Readonly<{
  valuePhiMicro: string;
  exactNumerator: string;
  exactDenominator: string;
  calculation: readonly SigilCalculationTerm[];
}> {
  const { policy, inputs } = inspectPolicy(policyInput);
  let operands: Record<string, string>;
  try { operands = JSON.parse(canonicalizeReceizV122(operandsInput)); } catch { return fail("OPERANDS_INVALID"); }
  if (!record(operands) || Object.keys(operands).length !== inputs.size
    || Object.keys(operands).some(name => !inputs.has(name))) return fail("OPERANDS_INVALID");
  for (const name of inputs) integer(operands[name]);
  const calculation: SigilCalculationTerm[] = [];
  const evaluate = (expression: ReceizRarityExpressionV129, path: string): Rational => {
    let value: Rational; let formula: string; let argumentsByName: Record<string, string>;
    if ("constant" in expression) {
      value = rational(integer(expression.constant)); formula = "published constant"; argumentsByName = { constant: expression.constant };
    } else if ("input" in expression) {
      value = rational(integer(operands[expression.input])); formula = "sealed issuance operand"; argumentsByName = { [expression.input]: operands[expression.input]! };
    } else {
      const args = expression.args.map((argument, index) => evaluate(argument, `${path}.${index}`));
      argumentsByName = Object.fromEntries(args.map((argument, index) => [`arg${index}`, fraction(argument)])); formula = expression.op;
      value = args.slice(1).reduce((a, b) => {
        switch (expression.op) {
          case "add": return rational(a.n * b.d + b.n * a.d, a.d * b.d);
          case "subtract": return rational(a.n * b.d - b.n * a.d, a.d * b.d);
          case "multiply": return rational(a.n * b.n, a.d * b.d);
          case "divide": return rational(a.n * b.d, a.d * b.n);
          case "min": return a.n * b.d <= b.n * a.d ? a : b;
          case "max": return a.n * b.d >= b.n * a.d ? a : b;
        }
      }, args[0]!);
    }
    calculation.push(Object.freeze({ id: `rarity.${path}`, label: `Rarity ${path}`, formula,
      operands: Object.freeze(argumentsByName), result: fraction(value), unit: "PhiMicro (exact rational)",
      sourceReferences: Object.freeze([`rarity-policy:${policy.algorithm}@${policy.version}#${path}`]) }));
    return value;
  };
  const value = evaluate(policy.expression, "root");
  if (value.n < 0n) return fail("NEGATIVE_VALUE");
  const rounded = ((2n * value.n + value.d) / (2n * value.d)).toString(); integer(rounded);
  calculation.push(Object.freeze({ id: "rarity.rounding", label: "Market reference Phi micro-units", formula: "floor((2 × numerator + denominator) / (2 × denominator))",
    operands: Object.freeze({ numerator: value.n.toString(), denominator: value.d.toString() }), result: rounded, unit: "PhiMicro",
    sourceReferences: Object.freeze([`rarity-policy:${policy.algorithm}@${policy.version}`, "rounding:half-up-phi-micro"]) }));
  return Object.freeze({ valuePhiMicro: rounded, exactNumerator: value.n.toString(), exactDenominator: value.d.toString(), calculation: Object.freeze(calculation) });
}
