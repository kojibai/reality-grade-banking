// This alias exists only inside the synthetic demonstration build. Production
// SDK defaults and application trust roots remain unchanged.
import {verifyReceizArtifactWithCanonicalRoots} from '../../node_modules/@receiz/sdk/dist/artifactVerification.js';
export {canonicalizeReceizConstitution} from '../../node_modules/@receiz/sdk/dist/constitution.js';
export {parseReceizIdentityArtifactText,serializeReceizIdentityArtifact} from '../../node_modules/@receiz/sdk/dist/identity.js';
export const fixtureRoots=new Map([['receiz.v4.test.bank-note',{kid:'receiz.v4.test.bank-note',alg:'Ed25519' as const,publicKeyRawB64u:'ny3P31kNqpcYoIohsPswku8kepJe7qyBg9FSKNL-BJM',status:'active' as const}]]);
export const verifyReceizArtifact=(input:Parameters<typeof verifyReceizArtifactWithCanonicalRoots>[0])=>verifyReceizArtifactWithCanonicalRoots(input,fixtureRoots);
