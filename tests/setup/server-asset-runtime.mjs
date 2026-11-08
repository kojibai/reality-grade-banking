import {execFileSync} from 'node:child_process';
import {buildProfileShareHistory} from '../../scripts/build-profile-share-history.mjs';

// The emitted API graph and its module mocks use the same generated reader as
// production. Build once before test collection, including in a clean checkout.
export default async function prepareAssetRuntime(){
 // Generate the release's existing profile partitions before any worker reads
 // them. Tests cannot depend on ignored files left by a prior production build.
 await buildProfileShareHistory();
 execFileSync(process.execPath,['scripts/build-asset-preview.mjs'],{stdio:'inherit'});
 execFileSync(process.execPath,['scripts/build-profile-preview.mjs'],{stdio:'inherit'});
}
