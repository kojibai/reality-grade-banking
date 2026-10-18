// Runtime composition from the included, pinned v129 preferred source. Kept
// behind a lazy import so the public reader never loads private account code.
import {readVerifiedReceizDocumentBytesCanonical} from '../../native/receiz/packages/receiz-sdk/src/verifier/canonical.ts';
import {receizCurrentPinnedSignatureV4Roots} from '../../native/receiz/packages/receiz-sdk/src/verifier/roots.ts';
export function readPublicOriginal(fileBytes,filename){return readVerifiedReceizDocumentBytesCanonical({fileBytes,filename,signatureV4RootPublicKeys:receizCurrentPinnedSignatureV4Roots()});}
