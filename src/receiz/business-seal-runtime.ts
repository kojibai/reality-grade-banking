import build from '../../public/native/business-seal.v129.manifest.json';
import type {AssetComposerDraft,PreparedComposerSource} from './asset-composer';
import type {BankNoteRuntimeFactory} from './offline-notes';
type NativeBusinessSeal={prepareConnectedComposerSource(input:{draft:AssetComposerDraft;ownerReceizId:string;sealDocument:Parameters<BankNoteRuntimeFactory>[0]['sealDocument'];assertCurrent():void}):Promise<PreparedComposerSource>};
let runtime:Promise<NativeBusinessSeal>|undefined;
/** Canonical private Original producer, loaded only for an explicit seal. It
 * creates no public Showcase runtime and makes no profile publication request. */
export function loadBusinessSealRuntime():Promise<NativeBusinessSeal>{
 const url=new URL(`/native/business-seal.v129.mjs?build=${build.moduleSha256}`,location.origin).href;
 return runtime??=import(/* @vite-ignore */url).catch(cause=>{runtime=undefined;throw cause;});
}
