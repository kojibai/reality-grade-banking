import type { ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";

/**
 * Deterministic public vector produced by the unchanged Receiz KaiSigil
 * BLAKE3 -> Poseidon -> Groth16 circuit and verified with the pinned v125 key.
 */
export const RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR = Object.freeze({
  schema: "receiz.kks-v1.proof-coordinate.v1",
  kksVersion: "KKSv1.0",
  kaiPulse: "1000",
  kaiUpulse: "1000000004",
  source: "live-monotonic-frequency-from-genesis",
  kaiSigil: {
    schema: "receiz.kaisigil.temporal-proof.v1",
    payload: {
      schema: "receiz.kaisigil.temporal-payload.v1",
      kksVersion: "KKSv1.0",
      kaiPulse: "1000",
      kaiUpulse: "1000000004",
      source: "live-monotonic-frequency-from-genesis",
      beat: 2,
      stepIndex: 2,
      weekday: "Solhara",
      chakraDay: "Root",
      previousKaiSigilProofHead: null,
    },
    payloadHashBlake3: "2faf35a035c36d1d06386c6be957831265253c700a5922afcd8bfc5e7239aeaf",
    zkPoseidonHash: "13681199337287042400924975185156606169911507686656279280951387227492607914059",
    groth16: {
      schema: "receiz.kaisigil.groth16-poseidon.v1",
      verificationKeyId: "sha256:7889fc795b72acb774d72c86bb5c09cf726dcffdbb95c9c7b8ffb6337fbf2b21",
      proof: {
        pi_a: [
          "13763543022134416459805597986482040019312794810149931479093904126301602012739",
          "11517113613713336185558445007665478940156878889775245065415167316907989211445",
          "1",
        ],
        pi_b: [
          [
            "18650529834441511681638169240361141889445249806976464032353538512488390946594",
            "2814573905932919931924946763849334876256136013037916372780136812497940517782",
          ],
          [
            "14184006927075378275208637646123414146876182447680267825319769412663493745728",
            "3982951718603281976558101956079983678033482123288909972368389825288257648593",
          ],
          ["1", "0"],
        ],
        pi_c: [
          "12608244442578978549382566531729794979051539306992296939071811978746553733754",
          "18004982553197078138224625275829107985819846939836191117861573657729487418190",
          "1",
        ],
        protocol: "groth16",
        curve: "bn128",
      },
      publicSignals: [
        "13681199337287042400924975185156606169911507686656279280951387227492607914059",
        "13681199337287042400924975185156606169911507686656279280951387227492607914059",
      ],
    },
    proofHead: "90b1367aa5b01ebefb8fe01b29e83beec8f825853f8821461836ca9adc5da665",
  },
  authority: {
    temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis",
    intrinsicProof: "kaisigil-blake3-poseidon-groth16",
    causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse",
    chronosRole: "descriptive-projection-only",
    createdAtAuthority: false,
    networkRequired: false,
  },
} as const satisfies ReceizKksV1ProofCoordinate);
