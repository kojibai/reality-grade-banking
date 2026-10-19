// Generated from @receiz/sdk 129.0.0 sigilValuationCore.js; do not edit.
// SDK source SHA-256: fa5a54535e27851656138c387d3775f3cb23570d58e416b39d2c8d592db426b4
// Same unsigned arithmetic; calculation tracing and reference memoization omitted for chart sampling.
const PHI = (1 + Math.sqrt(5)) / 2, DEFAULT_STEPS_PER_BEAT = 44, PULSES_PER_STEP = 11, PULSES_PER_BEAT_CANON = DEFAULT_STEPS_PER_BEAT * PULSES_PER_STEP, PULSES_PER_DAY_EXACT = 17491.270421, RARITY_ONE_OF_ONE = PHI, RARITY_EXP = 1 / PHI, QUALITY_MAP = {
  low: 1 - 1 / PHI ** 6,
  med: 1,
  high: 1 + 1 / PHI ** 6
}, CREATOR_VERIFIED_LIFT = 1 / PHI ** 6, CREATOR_REP_MAX = 1 / PHI ** 5, PROV_LOG_SLOPE = 1 / PHI ** 3, HOLD_SLOPE = 1 / PHI ** 4, HOLD_CAP = 1 + 1 / PHI ** 4, CLOSURE_CENTER = 0.7, CLOSURE_RANGE = 0.3, CLOSURE_RANGE_INV = 1 / CLOSURE_RANGE, CLOSURE_GAIN = 1 / PHI ** 6, CADENCE_GAIN = 1 / PHI ** 6, CHURN_KAPPA = 0.15, AGE_EPS = 1 / PHI ** 5, AGE_CAP = 1 + 1 / PHI ** 3, RESONANCE_GAIN = 1 / PHI ** 5, DISCOUNT_PULSE_HALFSPAN = PULSES_PER_DAY_EXACT, GEOM_EDGE_GAIN = 1 / PHI ** 7, GEOM_PHI_GAIN = 1 / PHI ** 7, GEOM_PRIME_GAIN = 1 / PHI ** 8, MOMENT_FIB_EXACT_GAIN = 1 / PHI, MOMENT_LUCAS_EXACT_GAIN = 1 / PHI ** 2, MOMENT_PHI_TRANSITION_GAIN = 1 / PHI ** 2, MOMENT_UNIFORM_GAIN = 1 / PHI ** 3, MOMENT_PAL_GAIN = 1 / PHI ** 4, MOMENT_RUN_GAIN = 1 / PHI ** 4, MOMENT_SEQ_GAIN = 1 / PHI ** 5, MOMENT_LOW_ENTROPY_GAIN = 1 / PHI ** 6, GENESIS_BIAS_GAIN = 1 / PHI ** 5, YEAR_PULSES_APPROX = PULSES_PER_DAY_EXACT * 365, ADOPTION_TAU_PULSES = YEAR_PULSES_APPROX, ADOPTION_GAIN_BASE = 1 / PHI ** 3, ADOPTION_GAIN_RARE = 1 / PHI ** 2, INDEX_SCARCITY_GAIN = 1 / PHI ** 4, FIB_STEP_GAIN = 1 / PHI ** 6, LUCAS_STEP_GAIN = 1 / PHI ** 7, BREATH_WAVE_GAIN = 1 / PHI ** 8, DAY_WAVE_GAIN = 1 / PHI ** 8, STROBE_WAVE_GAIN = 1 / PHI ** 9, MOMENT_AFFINITY_GAIN_BASE = 1 / PHI ** 4, MOMENT_AFFINITY_DIGIT_WEIGHT = 1 / PHI, POLICY = {
  RARITY_ONE_OF_ONE,
  RARITY_EXP,
  QUALITY_MAP,
  CREATOR_VERIFIED_LIFT,
  CREATOR_REP_MAX,
  PROV_LOG_SLOPE,
  HOLD_SLOPE,
  HOLD_CAP,
  CLOSURE_CENTER,
  CLOSURE_RANGE,
  CLOSURE_GAIN,
  CADENCE_GAIN,
  CHURN_KAPPA,
  AGE_EPS,
  AGE_CAP,
  RESONANCE_GAIN,
  DISCOUNT_PULSE_HALFSPAN,
  GEOM_EDGE_GAIN,
  GEOM_PHI_GAIN,
  GEOM_PRIME_GAIN,
  MOMENT_FIB_EXACT_GAIN,
  MOMENT_LUCAS_EXACT_GAIN,
  MOMENT_PHI_TRANSITION_GAIN,
  MOMENT_UNIFORM_GAIN,
  MOMENT_PAL_GAIN,
  MOMENT_RUN_GAIN,
  MOMENT_SEQ_GAIN,
  MOMENT_LOW_ENTROPY_GAIN,
  GENESIS_BIAS_GAIN,
  YEAR_PULSES_APPROX,
  ADOPTION_TAU_PULSES,
  ADOPTION_GAIN_BASE,
  ADOPTION_GAIN_RARE,
  INDEX_SCARCITY_GAIN,
  FIB_STEP_GAIN,
  LUCAS_STEP_GAIN,
  BREATH_WAVE_GAIN,
  DAY_WAVE_GAIN,
  STROBE_WAVE_GAIN,
  MOMENT_AFFINITY_GAIN_BASE,
  MOMENT_AFFINITY_DIGIT_WEIGHT,
  DEFAULT_STEPS_PER_BEAT,
  PULSES_PER_STEP,
  PULSES_PER_BEAT_CANON,
  PULSES_PER_DAY_EXACT,
  PHI
};
function stableStringifyImpl(x) {
  if (x === null)
    return "null";
  switch (typeof x) {
    case "string":
    case "number":
    case "boolean":
      return JSON.stringify(x);
    case "object": {
      if (Array.isArray(x))
        return "[" + x.map(stableStringifyImpl).join(",") + "]";
      const obj = x;
      return "{" + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ":" + stableStringifyImpl(obj[k])).join(",") + "}";
    }
    // undefined, function, symbol, bigint → encode as null for determinism
    default:
      return "null";
  }
}
function stableStringify(x) {
  return stableStringifyImpl(x);
}
function policyChecksum() {
  const s = "val-policy:" + stableStringify(POLICY);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h ^= s.charCodeAt(i), h = h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}
const POLICY_CHECKSUM = policyChecksum(), SIGIL_VALUATION_ALGORITHM = "phi/kosmos-v\u03C6-5", SIGIL_VALUATION_POLICY_CHECKSUM = POLICY_CHECKSUM, SIGIL_VALUATION_ROUNDING = Object.freeze({
  numberSemantics: "ECMAScript Number (IEEE-754 binary64), ECMAScript Math functions",
  canonicalNumberSerialization: "JSON.stringify(number); nonfinite numbers serialize as null; -0 serializes as 0",
  oscillator: Object.freeze({ scale: 1e6, formula: "Math.round(x * 1000000) / 1000000", nonfiniteResult: 0 }),
  phiMicroDisplay: Object.freeze({ scale: 1e6, formula: "Math.round(valuePhi * 1000000)", purpose: "display projection; intrinsic value remains the original Number" })
}), SIGIL_VALUATION_LEGACY_DEFAULTS = Object.freeze({
  originPulse: "kaiPulse when numeric, else pulse when numeric, else explicit evaluation pulse (low-level compatibility only)",
  stepsPerBeat: "finite positive stepsPerBeat is truncated; otherwise 44",
  stepIndex: "finite supplied stepIndex is truncated and clamped; otherwise derive from origin pulse",
  beat: "finite supplied beat is truncated; otherwise floor(originPulse / pulsesPerBeat)",
  seriesSize: 1,
  quality: "med",
  creatorVerified: !1,
  creatorRep: 0,
  transfers: "empty array when absent; policy uniqueHolders floor 1, closure 1, cadence 1, median hold 0",
  resonancePhi: "0.5 when frequencyHz is missing, nonfinite, zero or negative",
  ip: "zero present value when cashflows absent; legacy KS cashflows retain their original Phi alias behavior",
  cumulativeTransfers: "supplied count, else transfers.length",
  policyId: "unpinned when absent"
});
Object.freeze(POLICY.QUALITY_MAP);
const SIGIL_VALUATION_POLICY = Object.freeze({
  algorithm: SIGIL_VALUATION_ALGORITHM,
  checksum: POLICY_CHECKSUM,
  checksumDomain: "val-policy:",
  checksumAlgorithm: "original 32-bit FNV-like accumulation over UTF-16 code units; noncryptographic policy identifier",
  constants: Object.freeze(POLICY),
  canonicalSerialization: stableStringify(POLICY),
  rounding: SIGIL_VALUATION_ROUNDING,
  legacyDefaults: SIGIL_VALUATION_LEGACY_DEFAULTS,
  baseUnit: "1 coherent breath = 1 \u03A6",
  formula: "valuePhi = rarityFloor + premiumBandBase * combinedOsc + pv_phi",
  affinityWeights: Object.freeze({ step: 0.3, breath: 0.3, phiFraction: 0.2, digit: 0.2 })
});
function recordCalculation(trace, id, label, formula, operands, result, unit = "factor", sourceReferences = ["app/utils/valuation.ts#computeIntrinsicUnsigned"]) {
  if (!trace)
    return;
  const serialized = Object.fromEntries(Object.entries(operands).map(([key, value]) => [
    key,
    typeof value == "object" ? stableStringify(value) : String(value)
  ]));
  trace.push(Object.freeze({
    id,
    label,
    formula,
    operands: Object.freeze(serialized),
    result: String(result),
    unit,
    sourceReferences: Object.freeze([...sourceReferences])
  }));
}
const VALUATION_MEMO_LIMIT = 256;
function setBoundedMemo(memo, key, value) {
  if (!memo.has(key) && memo.size >= VALUATION_MEMO_LIMIT) {
    const oldest = memo.keys().next();
    oldest.done || memo.delete(oldest.value);
  }
  memo.set(key, value);
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), log1p = (x) => Math.log(1 + Math.max(0, x)), frac = (x) => x - Math.floor(x), OSC_QUANT = 1e6, quantizeOsc = (x) => Number.isFinite(x) ? Math.round(x * OSC_QUANT) / OSC_QUANT : 0;
function median(arr) {
  if (!arr.length)
    return 0;
  const a = arr.slice().sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function distinctReceivers(transfers) {
  const uniq = /* @__PURE__ */ new Set();
  for (const t of transfers)
    t.receiverSignature && uniq.add(t.receiverSignature);
  return Math.max(uniq.size, 1);
}
function closedTransfers(transfers) {
  return transfers.filter((t) => t.receiverSignature && t.receiverKaiPulse != null);
}
function interSendDeltas(transfers) {
  if (transfers.length < 2)
    return [];
  const deltas = [];
  for (let i = 1; i < transfers.length; i++) {
    const a = transfers[i - 1].senderKaiPulse, b = transfers[i].senderKaiPulse;
    Number.isFinite(a) && Number.isFinite(b) && b >= a && deltas.push(b - a);
  }
  return deltas;
}
function cadenceRegularity01(deltas) {
  if (deltas.length === 0)
    return 1;
  const m = median(deltas) || 1;
  let sum = 0;
  for (const d of deltas)
    sum += Math.abs(d - m) / m;
  return 1 / (1 + sum / deltas.length);
}
function presentValueIP(ip, nowPulse, trace) {
  const cfPhi = ip?.expectedCashflowPhi?.map((c, index) => ({ atPulse: c.atPulse, amount: c.amountPhi, id: `ip.phi.${index}` })) ?? [], cfKS = ip?.expectedCashflowKS?.map((c, index) => ({ atPulse: c.atPulse, amount: c.amountKS, id: `ip.ks.${index}` })) ?? [];
  return [...cfPhi, ...cfKS].reduce((s, c) => {
    const dp = c.atPulse - nowPulse, disc = 1 / (1 + Math.max(0, dp) / DISCOUNT_PULSE_HALFSPAN), contribution = c.amount * disc;
    return `${c.id}`, c.atPulse, `${c.id}`, `${c.id}`, `${c.id}`, `${c.id}`, c.amount, `${c.id}`, s + contribution;
  }, 0);
}
function phiResonance01(f, trace) {
  if (!f || !Number.isFinite(f) || f <= 0)
    return 0.5;
  const x = Math.log(f) / Math.log(PHI), dist = Math.abs(x - Math.round(x)), closeness = clamp(1 - 2 * dist, 0, 1);
  return Math.round(x), 0.5 + 0.5 * closeness;
}
function isPrime(n) {
  if (typeof n != "number" || !Number.isFinite(n) || n < 2)
    return !1;
  const k = Math.floor(n);
  if (k % 2 === 0)
    return k === 2;
  for (let i = 3; i * i <= k; i += 2)
    if (k % i === 0)
      return !1;
  return !0;
}
function geometryLift(meta, stepsPerBeat, resonancePhi, trace) {
  let lift = 1;
  const isEdge = typeof meta.stepIndex == "number" && (meta.stepIndex === 0 || meta.stepIndex === (stepsPerBeat > 0 ? stepsPerBeat - 1 : -1)), edgeFactor = isEdge ? 1 + GEOM_EDGE_GAIN : 1;
  meta.stepIndex, isEdge && (lift *= edgeFactor);
  const primeBeat = isPrime(meta.beat), primeFactor = primeBeat ? 1 + GEOM_PRIME_GAIN : 1;
  if (meta.beat, primeBeat && (lift *= primeFactor), resonancePhi > 0.9) {
    const t = (resonancePhi - 0.9) / 0.1, factor = 1 + GEOM_PHI_GAIN * clamp(t, 0, 1);
    lift *= factor;
  }
  return lift;
}
function bigintSqrt(n) {
  if (n < 0n)
    throw new Error("sqrt of negative");
  if (n < 2n)
    return n;
  let x0 = n, x1 = (n >> 1n) + 1n;
  for (; x1 < x0; )
    x0 = x1, x1 = x1 + n / x1 >> 1n;
  return x0;
}
function isPerfectSquareBig(n) {
  if (n < 0n)
    return !1;
  const r = bigintSqrt(n);
  return r * r === n;
}
const __fibMemo = /* @__PURE__ */ new Map();
function isFibonacciExact(pulse) {
  if (!Number.isFinite(pulse) || pulse < 0)
    return !1;
  const nSafe = Math.trunc(Math.abs(pulse)), cached = __fibMemo.get(nSafe);
  if (cached !== void 0)
    return cached;
  const n = BigInt(nSafe), a = 5n * n * n + 4n, b = 5n * n * n - 4n, ok = isPerfectSquareBig(a) || isPerfectSquareBig(b);
  return setBoundedMemo(__fibMemo, nSafe, ok), ok;
}
const __lucMemo = /* @__PURE__ */ new Map();
function isLucasExact(pulse) {
  if (!Number.isFinite(pulse) || pulse < 0)
    return !1;
  const nSafe = Math.trunc(Math.abs(pulse)), cached = __lucMemo.get(nSafe);
  if (cached !== void 0)
    return cached;
  const n = BigInt(nSafe);
  let a = 2n, b = 1n;
  for (; b < n; ) {
    const t = a + b;
    a = b, b = t;
  }
  const ok = b === n;
  return setBoundedMemo(__lucMemo, nSafe, ok), ok;
}
function absDigits(pulse) {
  return Math.abs(Math.trunc(pulse)).toString();
}
function allSameDigit(s) {
  if (s.length <= 1)
    return !1;
  for (let i = 1; i < s.length; i++)
    if (s[i] !== s[0])
      return !1;
  return !0;
}
function isPalindromeDigits(s) {
  if (s.length <= 1)
    return !1;
  for (let i = 0, j = s.length - 1; i < j; i++, j--)
    if (s[i] !== s[j])
      return !1;
  return !0;
}
function longestRunSameDigit(s) {
  if (s.length === 0)
    return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < s.length; i++)
    s[i] === s[i - 1] ? (cur++, cur > max && (max = cur)) : cur = 1;
  return max;
}
function longestConsecutiveSequenceLen(s) {
  if (s.length <= 1)
    return 1;
  let maxLen = 1, curLen = 1, dir = 0;
  for (let i = 1; i < s.length; i++) {
    const prev = s.charCodeAt(i - 1) - 48, step = s.charCodeAt(i) - 48 - prev;
    step === dir && (step === 1 || step === -1) ? curLen++ : step === 1 || step === -1 ? (dir = step, curLen = 2) : (dir = 0, curLen = 1), curLen > maxLen && (maxLen = curLen);
  }
  return maxLen;
}
function digitEntropy01(s, trace, prefix = "digitEntropy") {
  if (s.length === 0)
    return 1;
  const cnt = Array(10).fill(0);
  for (const ch of s)
    cnt[ch.charCodeAt(0) - 48]++;
  let H = 0;
  for (let digit = 0; digit < cnt.length; digit++) {
    const c = cnt[digit];
    if (c) {
      const p = c / s.length, term = p * Math.log(p);
      H -= term, `${prefix}${digit}`, s.length, -term;
    }
  }
  const Hmax = Math.log(Math.min(10, s.length)), result = clamp(H / (Hmax || 1), 0, 1);
  return result;
}
function genesisProximityLift(claimPulse) {
  if (!Number.isFinite(claimPulse) || claimPulse < 0)
    return 1;
  const t = claimPulse / (claimPulse + YEAR_PULSES_APPROX);
  return 1 + GENESIS_BIAS_GAIN * (1 - 2 * t);
}
const __phiTransMemo = /* @__PURE__ */ new Map();
function phiTransitionIndexFromPulse(pulse) {
  if (!Number.isFinite(pulse) || pulse < 1)
    return null;
  const nSafe = Math.trunc(pulse), cached = __phiTransMemo.get(nSafe);
  if (cached !== void 0)
    return cached;
  const N = nSafe, nApprox = Math.log(N) / Math.log(PHI), start = Math.max(1, Math.floor(nApprox) - 2);
  let hit = null;
  for (let k = start; k <= start + 6; k++)
    if (Math.ceil(Math.pow(PHI, k)) === N) {
      hit = k;
      break;
    }
  return setBoundedMemo(__phiTransMemo, nSafe, hit), hit;
}
function momentRarityLiftFromPulse(pulse, trace, prefix = "moment") {
  if (!Number.isFinite(pulse) || pulse < 0)
    return `${prefix}`, 1;
  const s = absDigits(pulse), len = s.length;
  let lift = 1;
  const fib = isFibonacciExact(pulse), lucas = isLucasExact(pulse), phiTransition = phiTransitionIndexFromPulse(pulse), uniform = allSameDigit(s), palindrome = isPalindromeDigits(s), fibFactor = fib ? 1 + MOMENT_FIB_EXACT_GAIN : 1, lucasFactor = lucas ? 1 + MOMENT_LUCAS_EXACT_GAIN : 1, transitionFactor = phiTransition !== null ? 1 + MOMENT_PHI_TRANSITION_GAIN : 1, uniformFactor = uniform ? 1 + MOMENT_UNIFORM_GAIN : 1, palindromeFactor = palindrome ? 1 + MOMENT_PAL_GAIN : 1;
  fib && (lift *= fibFactor), lucas && (lift *= lucasFactor), phiTransition !== null && (lift *= transitionFactor), uniform && (lift *= uniformFactor), palindrome && (lift *= palindromeFactor);
  const run = longestRunSameDigit(s), runNorm = clamp((run - 2) / Math.max(3, len - 2), 0, 1), runFactor = run >= 3 ? 1 + MOMENT_RUN_GAIN * runNorm : 1;
  run >= 3 && (lift *= runFactor);
  const seq = longestConsecutiveSequenceLen(s), seqNorm = clamp((seq - 3) / Math.max(4, len - 3), 0, 1), seqFactor = seq >= 4 ? 1 + MOMENT_SEQ_GAIN * seqNorm : 1;
  seq >= 4 && (lift *= seqFactor);
  const ent = digitEntropy01(s, trace, `${prefix}.digitEntropy`), entropyFactor = 1 + MOMENT_LOW_ENTROPY_GAIN * (1 - ent);
  lift *= entropyFactor;
  const refs = [`pulse:${pulse}`, "app/utils/valuation.ts#momentRarityLiftFromPulse"];
  return `${prefix}`, `${prefix}`, `${prefix}`, `${prefix}`, `${prefix}`, `${prefix}`, `${prefix}`, `${prefix}`, `${prefix}`, lift;
}
function momentRarityScore01FromPulse(pulse, trace, prefix = "rarityScore") {
  if (!Number.isFinite(pulse) || pulse < 0)
    return 0;
  const s = absDigits(pulse), len = s.length;
  let score = 0, weightSum = 0;
  const fib = isFibonacciExact(pulse) ? 1 : 0;
  score += 1 * fib, weightSum += 1;
  const luc = isLucasExact(pulse) ? 1 : 0;
  score += 1 / PHI * luc, weightSum += 1 / PHI;
  const uniform = allSameDigit(s) ? 1 : 0;
  score += 1 / PHI * uniform, weightSum += 1 / PHI;
  const pal = isPalindromeDigits(s) ? 1 : 0;
  score += 1 / PHI ** 2 * pal, weightSum += 1 / PHI ** 2;
  const run = longestRunSameDigit(s), runNorm = clamp((run - 2) / Math.max(3, len - 2), 0, 1);
  score += 1 / PHI ** 2 * runNorm, weightSum += 1 / PHI ** 2;
  const seq = longestConsecutiveSequenceLen(s), seqNorm = clamp((seq - 3) / Math.max(4, len - 3), 0, 1);
  score += 1 / PHI ** 3 * seqNorm, weightSum += 1 / PHI ** 3;
  const ent = digitEntropy01(s, trace, `${prefix}.digitEntropy`);
  if (score += 1 / PHI ** 3 * (1 - ent), weightSum += 1 / PHI ** 3, weightSum <= 0)
    return 0;
  const result = clamp(score / weightSum, 0, 1);
  return `${pulse}`, result;
}
function geometricMean(xs, trace) {
  if (!xs.length)
    return 1;
  let sum = 0;
  for (let index = 0; index < xs.length; index++) {
    const x = xs[index], term = Math.log(Math.max(x, 1e-12));
    sum += term, `${index}`;
  }
  return xs.length, sum / xs.length, Math.exp(sum / xs.length);
}
function circularSim01(a, b, period) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || period <= 0)
    return 0.5;
  const da = ((a - b) % period + period) % period, theta = 2 * Math.PI * da / period;
  return 0.5 * (1 + Math.cos(theta));
}
function stepIndexFromPulse(pulse, stepsPerBeat) {
  return !Number.isFinite(pulse) || stepsPerBeat <= 0 ? 0 : Math.floor(Math.floor(Math.max(0, pulse)) / PULSES_PER_STEP) % stepsPerBeat;
}
function breathResidFromPulse(pulse) {
  return Number.isFinite(pulse) ? Math.floor(Math.max(0, pulse)) % PULSES_PER_STEP : 0;
}
function logPhiFrac01(n) {
  if (!Number.isFinite(n) || n <= 0)
    return 0;
  const x = Math.log(n) / Math.log(PHI);
  return frac(x);
}
function jaccard01(featuresA, featuresB) {
  if (featuresA.size === 0 && featuresB.size === 0)
    return 0;
  const u = /* @__PURE__ */ new Set([...featuresA, ...featuresB]);
  let inter = 0;
  for (const f of featuresA)
    featuresB.has(f) && inter++;
  return inter / u.size;
}
function motifFeatureSet(pulse) {
  const s = /* @__PURE__ */ new Set();
  isFibonacciExact(pulse) && s.add("fib"), isLucasExact(pulse) && s.add("lucas");
  const ds = absDigits(pulse);
  return allSameDigit(ds) && s.add("uniform"), isPalindromeDigits(ds) && s.add("pal"), longestRunSameDigit(ds) >= 4 && s.add("longrun"), longestConsecutiveSequenceLen(ds) >= 5 && s.add("longseq"), s;
}
function adoptionIndex01(pulse) {
  return !Number.isFinite(pulse) || pulse <= 0 ? 0 : 1 - Math.pow(PHI, -pulse / ADOPTION_TAU_PULSES);
}
function countFibLevelsSince(agePulses) {
  if (!Number.isFinite(agePulses) || agePulses <= 0)
    return 0;
  let a = 1n, b = 1n, levels = 0;
  const A = BigInt(Math.trunc(agePulses));
  for (; b <= A; ) {
    levels++;
    const t = a + b;
    a = b, b = t;
  }
  return levels;
}
function countLucasLevelsSince(agePulses) {
  if (!Number.isFinite(agePulses) || agePulses <= 0)
    return 0;
  let a = 2n, b = 1n, levels = 0;
  const A = BigInt(Math.trunc(agePulses));
  for (; b <= A; ) {
    levels++;
    const t = a + b;
    a = b, b = t;
  }
  return levels;
}
function strobeWave(claimPulse, nowPulse) {
  const u = frac((claimPulse + nowPulse) * PHI), wave = 1 + STROBE_WAVE_GAIN * (2 * u - 1);
  return { phase01: u, wave };
}
function coerceStepsPerBeat(metaSteps) {
  return Number.isFinite(metaSteps) && metaSteps > 0 ? Math.trunc(metaSteps) : DEFAULT_STEPS_PER_BEAT;
}
function resolveClaimPulse(meta, nowPulse) {
  return typeof meta.kaiPulse == "number" ? meta.kaiPulse : typeof meta.pulse == "number" ? meta.pulse : nowPulse;
}
function resolveStepIndex(meta, stepsPerBeat, claimPulse) {
  return typeof meta.stepIndex == "number" && Number.isFinite(meta.stepIndex) ? clamp(Math.trunc(meta.stepIndex), 0, stepsPerBeat - 1) : stepIndexFromPulse(claimPulse, stepsPerBeat);
}
function resolveBeat(meta, pulsesPerBeat, claimPulse) {
  return typeof meta.beat == "number" && Number.isFinite(meta.beat) ? Math.trunc(meta.beat) : Math.floor(claimPulse / pulsesPerBeat);
}
function computeIntrinsicUnsigned(meta, nowPulse) {
  const calculation = [], STEPS_PER_BEAT = coerceStepsPerBeat(meta.stepsPerBeat), pulsesPerBeat = STEPS_PER_BEAT * PULSES_PER_STEP, claimPulse = resolveClaimPulse(meta, nowPulse), transfers = meta.transfers ?? [], closed = closedTransfers(transfers), beatsSinceClaim = Math.max(1, (nowPulse - claimPulse) / pulsesPerBeat), velocityPerBeat = transfers.length / beatsSinceClaim, uniqueHolders = distinctReceivers(transfers), closedFraction = transfers.length === 0 ? 1 : closed.length / transfers.length, cadenceRegularity = cadenceRegularity01(interSendDeltas(transfers)), holdBeats = closed.map((t) => (t.receiverKaiPulse - t.senderKaiPulse) / pulsesPerBeat).filter((x) => x >= 0), medHoldBeats = median(holdBeats), resonancePhi = phiResonance01(meta.frequencyHz, calculation), claimStepResolved = resolveStepIndex(meta, STEPS_PER_BEAT, claimPulse), claimBeatResolved = resolveBeat(meta, pulsesPerBeat, claimPulse), metaForGeometry = {
    ...meta,
    stepIndex: claimStepResolved,
    beat: claimBeatResolved
  }, geomLift = geometryLift(metaForGeometry, STEPS_PER_BEAT, resonancePhi, calculation), agePulses = Math.max(0, nowPulse - claimPulse), pv_phi = presentValueIP(meta.ip, nowPulse, calculation), size = meta.seriesSize ?? 1, rarity = size <= 1 ? RARITY_ONE_OF_ONE : Math.pow(size, -RARITY_EXP), quality = meta.quality ?? "med", qf = QUALITY_MAP[quality], creator = (meta.creatorVerified ? 1 + CREATOR_VERIFIED_LIFT : 1) + (meta.creatorRep ?? 0) * CREATOR_REP_MAX, prov = 1 + PROV_LOG_SLOPE * log1p(uniqueHolders - 1), closureCentered = clamp((closedFraction - CLOSURE_CENTER) * CLOSURE_RANGE_INV, -1, 1), closureLift = 1 + CLOSURE_GAIN * closureCentered, cadenceLift = 1 + CADENCE_GAIN * (2 * cadenceRegularity - 1), holdLift = clamp(1 + HOLD_SLOPE * log1p(medHoldBeats), 1, HOLD_CAP), resonanceLift = 1 + RESONANCE_GAIN * (2 * resonancePhi - 1), ageBeats = agePulses / pulsesPerBeat, ageLift = Math.min(AGE_CAP, 1 + AGE_EPS * log1p(ageBeats)), churnPenalty = 1 / (1 + CHURN_KAPPA * Math.max(0, velocityPerBeat)), claimMoment = momentRarityLiftFromPulse(claimPulse, calculation, "claimMoment"), lineageMoments = closed.map((t, index) => Number.isFinite(t.receiverKaiPulse) ? momentRarityLiftFromPulse(t.receiverKaiPulse, calculation, `lineage.${index}.moment`) : 1), lineageGM = geometricMean(lineageMoments, calculation), genesisBias = genesisProximityLift(claimPulse), momentLift = claimMoment * Math.max(1, lineageGM) * genesisBias, baselinePremium = rarity * qf * creator * prov * closureLift * cadenceLift * holdLift * resonanceLift * ageLift * churnPenalty * geomLift * momentLift, adoptionAtClaim = adoptionIndex01(claimPulse), adoptionNow = adoptionIndex01(nowPulse), adoptionDelta = Math.max(0, adoptionNow - adoptionAtClaim), rarityScore01 = momentRarityScore01FromPulse(claimPulse, calculation, "claimRarityScore"), k = ADOPTION_GAIN_BASE + ADOPTION_GAIN_RARE * rarityScore01, adoptionLift = Math.exp(k * adoptionDelta), indexScarcity = 1 + INDEX_SCARCITY_GAIN * (1 - adoptionAtClaim), fibLevels = countFibLevelsSince(agePulses), lucasLevels = countLucasLevelsSince(agePulses), fibAccrualLift = Math.exp(FIB_STEP_GAIN * fibLevels), lucasAccrualLift = Math.exp(LUCAS_STEP_GAIN * lucasLevels), dynamicGrowth = indexScarcity * adoptionLift * fibAccrualLift * lucasAccrualLift, rarityFloor = 1 * claimMoment * indexScarcity * adoptionLift * fibAccrualLift * lucasAccrualLift * Math.max(1, genesisBias), breathPhase01 = pulsesPerBeat > 0 ? quantizeOsc(nowPulse % pulsesPerBeat / pulsesPerBeat) : 0, breathAmp = BREATH_WAVE_GAIN * (0.5 + 0.5 * cadenceRegularity), breathWave = quantizeOsc(1 + breathAmp * Math.sin(2 * Math.PI * breathPhase01)), dayPhase01 = quantizeOsc(frac(nowPulse / PULSES_PER_DAY_EXACT)), claimDayPhase01 = quantizeOsc(frac(claimPulse / PULSES_PER_DAY_EXACT)), daySim = 1 - Math.abs((dayPhase01 - claimDayPhase01 + 1) % 1 - 0.5) * 2, dayAmp = DAY_WAVE_GAIN * (0.5 + 0.5 * resonancePhi) * (0.5 + 0.5 * cadenceRegularity), dayWave = quantizeOsc(1 + dayAmp * (2 * daySim - 1)), { phase01: strobePhaseRaw, wave: strobeWaveRaw } = strobeWave(claimPulse, nowPulse), strobePhase01 = quantizeOsc(strobePhaseRaw), strobeWaveVal = quantizeOsc(strobeWaveRaw), claimStep = claimStepResolved, nowStep = stepIndexFromPulse(nowPulse, STEPS_PER_BEAT), stepSim = circularSim01(nowStep, claimStep, STEPS_PER_BEAT), claimResid = breathResidFromPulse(claimPulse), nowResid = breathResidFromPulse(nowPulse), breathSim = circularSim01(nowResid, claimResid, PULSES_PER_STEP), phiFracSim = 1 - Math.abs((logPhiFrac01(nowPulse + 1) - logPhiFrac01(claimPulse + 1) + 1) % 1 - 0.5) * 2, claimRareScore = rarityScore01, nowRareScore = momentRarityScore01FromPulse(nowPulse, calculation, "nowRarityScore"), rareSim = 1 - Math.abs(claimRareScore - nowRareScore), claimMotifs = motifFeatureSet(claimPulse), nowMotifs = motifFeatureSet(nowPulse), motifSim = jaccard01(claimMotifs, nowMotifs), w_step = 0.3, w_breath = 0.3, w_phi = 0.2, w_digit = 0.2, digitBlend = MOMENT_AFFINITY_DIGIT_WEIGHT * motifSim + (1 - MOMENT_AFFINITY_DIGIT_WEIGHT) * rareSim, momentAffinitySim01 = quantizeOsc(w_step * stepSim + w_breath * breathSim + w_phi * phiFracSim + w_digit * digitBlend), momentAffinityAmp = quantizeOsc(MOMENT_AFFINITY_GAIN_BASE * (0.5 + 0.5 * claimRareScore) * (0.5 + 0.5 * resonancePhi)), momentAffinityOsc = quantizeOsc(1 + momentAffinityAmp * (2 * momentAffinitySim01 - 1)), combinedOsc = quantizeOsc(breathWave * dayWave * strobeWaveVal * momentAffinityOsc), premiumPreWave = baselinePremium * dynamicGrowth, premiumBandBase = Math.max(0, premiumPreWave - rarityFloor), premium = rarityFloor + premiumBandBase * combinedOsc, valuePhi = 1 * premium + pv_phi;
  stableStringify(meta), meta.kaiPulse, meta.pulse, meta.stepsPerBeat, meta.stepIndex, meta.beat, transfers.length, transfers.map((t) => t.receiverSignature ?? null), transfers.length, closed.length;
  const sendDeltas = interSendDeltas(transfers), sendMedian = median(sendDeltas) || 1, sendMadNorm = sendDeltas.reduce((sum, delta) => sum + Math.abs(delta - sendMedian) / sendMedian, 0) / (sendDeltas.length || 1);
  transfers.map((t) => t.senderKaiPulse), meta.frequencyHz, meta.creatorVerified, meta.creatorRep, lineageMoments.length, logPhiFrac01(nowPulse + 1), logPhiFrac01(claimPulse + 1), [...claimMotifs], [...nowMotifs], meta.ip?.expectedCashflowPhi, meta.ip?.expectedCashflowKS, String(OSC_QUANT);
  const headRef = {
    headHash: void 0,
    transfersWindowRoot: meta.transfersWindowRoot,
    cumulativeTransfers: meta.cumulativeTransfers ?? transfers.length
  }, inputs = {
    // existing
    size,
    quality,
    creatorVerified: !!meta.creatorVerified,
    creatorRep: meta.creatorRep ?? 0,
    uniqueHolders,
    closedFraction,
    cadenceRegularity,
    medianHoldBeats: medHoldBeats,
    velocityPerBeat,
    resonancePhi,
    pulsesPerBeat,
    agePulses,
    geometryLift: geomLift,
    momentLift,
    pv_phi,
    // growth & rarity diagnostics
    algorithmVersion: "phi/kosmos-v\u03C6-5",
    adoptionAtClaim,
    adoptionNow,
    adoptionDelta,
    rarityScore01,
    fibAccrualLevels: fibLevels,
    lucasAccrualLevels: lucasLevels,
    indexScarcity,
    adoptionLift,
    fibAccrualLift,
    lucasAccrualLift,
    // live moment diagnostics
    breathPhase01,
    breathWave,
    dayPhase01,
    dayWave,
    strobePhase01,
    strobeWave: strobeWaveVal,
    momentAffinitySim01,
    momentAffinityAmp,
    momentAffinityOsc,
    combinedOsc,
    // band/floor
    dynamicGrowth,
    rarityFloor,
    premiumBandBase
  }, checksum = POLICY_CHECKSUM;
  return {
    version: 1,
    unit: "\u03A6",
    algorithm: "phi/kosmos-v\u03C6-5",
    policyId: meta.valuationPolicyId,
    policyChecksum: checksum,
    valuePhi,
    premium,
    inputs,
    computedAtPulse: nowPulse,
    headRef
  };
}
export {
  SIGIL_VALUATION_ALGORITHM,
  SIGIL_VALUATION_LEGACY_DEFAULTS,
  SIGIL_VALUATION_POLICY,
  SIGIL_VALUATION_POLICY_CHECKSUM,
  SIGIL_VALUATION_ROUNDING,
  computeIntrinsicUnsigned,
  stableStringify
};
