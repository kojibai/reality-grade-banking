/** The included headless v129 contract is shared by Bank form preparation and
 * verified media opening. It carries no Receiz page components. */
export {readComposerCapacity,validateComposerAssetDraft,composerMediaKind,composerFileMime,readComposerAssetContent} from '../../native/receiz/app/lib/profile/composerPreparation';
export type {ComposerAssetDraft as AssetComposerDraft,ComposerCapacity as AssetComposerCapacity,ComposerAssetContent,ComposerAssetFile,PreparedComposerSource} from '../../native/receiz/app/lib/profile/composerPreparation';

import {validateAssetDefinition,type AssetDefinition} from './asset-definition';
import type {ComposerAssetDraft as AssetComposerDraft} from '../../native/receiz/app/lib/profile/composerPreparation';
export function composerDefinition(draft:AssetComposerDraft,settings:Partial<Pick<AssetDefinition,'symbol'|'units'>>={}):AssetDefinition{
 const generated=draft.title.toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^[^A-Z]+/,'').slice(0,8);
 return validateAssetDefinition({name:draft.title,symbol:settings.symbol?.trim()||(generated.length>=2?generated:'ASSET'),units:settings.units?.trim()||'1000',description:draft.description,linkedProofDigest:null});
}
