import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";
import {jcsCanonicalize} from "@/app/utils/jcs";

/** Existing Original locator from its verified ownership genesis. This pure
 * projection supplies no admission or ownership authority. */
export function importedProofSourceOriginalId(identity:Readonly<{artifactId:string;namespace:string;genesisOwnerReceizId:string}>|string):string {
 const value=typeof identity==="string"?identity:jcsCanonicalize({artifactId:identity.artifactId,
  namespace:identity.namespace,genesisOwnerReceizId:identity.genesisOwnerReceizId});
 return `imported-${bytesToHex(sha256(new TextEncoder().encode(value)))}`;
}
