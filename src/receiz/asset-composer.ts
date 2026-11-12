/** The included headless v129 contract is shared by Bank form preparation and
 * verified media opening. It carries no Receiz page components. */
export {readComposerCapacity,validateComposerAssetDraft,composerMediaKind,composerFileMime,readComposerAssetContent} from '../../native/receiz/app/lib/profile/composerPreparation';
export type {ComposerCollectionPolicy,ComposerAssetDraft as AssetComposerDraft,ComposerCapacity as AssetComposerCapacity,ComposerAssetContent,ComposerAssetFile,PreparedComposerSource} from '../../native/receiz/app/lib/profile/composerPreparation';

import {validateAssetDefinition,type AssetDefinition} from './asset-definition';
import type {ComposerAssetDraft as AssetComposerDraft} from '../../native/receiz/app/lib/profile/composerPreparation';
import {readComposerCapacity,validateComposerAssetDraft} from '../../native/receiz/app/lib/profile/composerPreparation';
/** Receiz's profile composer carries its external link in the sealed claim.
 * Keep this form-only value out of the canonical draft and proof-digest field. */
export function composerDraftWithLink(draft:AssetComposerDraft,link=''):AssetComposerDraft{
 const raw=link.trim();
 if(!raw)return validateComposerAssetDraft(draft,readComposerCapacity());
 const normalized=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
 try{const url=new URL(normalized);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||/[\s\x00-\x1f\x7f]/u.test(normalized)||raw.includes('://')&&!/^https?:\/\//i.test(raw))throw Error();}
 catch{throw new TypeError('COMPOSER_LINK_INVALID');}
 // Same oneLine(caption) + newline + `Link <normalized URL>` representation
 // as ProfileClient.shared.buildSealedClaimText, without importing its UI.
 const description=[draft.description.replace(/\s+/g,' ').trim(),`Link ${normalized}`].filter(Boolean).join('\n');
 if(description.length>2000)throw new TypeError('COMPOSER_LINK_CLAIM_CAPACITY');
 return validateComposerAssetDraft({...draft,description},readComposerCapacity());
}
export function composerDefinition(draft:AssetComposerDraft,settings:Partial<Pick<AssetDefinition,'symbol'|'units'>>={}):AssetDefinition{
 const generated=draft.title.toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^[^A-Z]+/,'').slice(0,8);
 return validateAssetDefinition({name:draft.title,symbol:settings.symbol?.trim()||(generated.length>=2?generated:'ASSET'),units:settings.units?.trim()||'1000',description:draft.description,linkedProofDigest:null});
}
