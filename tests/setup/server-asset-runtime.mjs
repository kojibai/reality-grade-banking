import {execFileSync} from 'node:child_process';

// The emitted API graph and its module mocks use the same generated reader as
// production. Build once before test collection, including in a clean checkout.
export default function prepareAssetRuntime(){
 execFileSync(process.execPath,['scripts/build-asset-preview.mjs'],{stdio:'inherit'});
}
