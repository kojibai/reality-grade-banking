import {publicAssetTitles} from '../content/public-asset-titles.js';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const title=(value:unknown)=>typeof value==='string'&&value.length<=4096&&value.trim()?value.trim():null;
/** Display metadata only. Titles never replace original source or authority.
 * The legacy collection title can be a caption, so authored titles come first. */
export function publicAuthoredAssetTitle(input:unknown):string|null{
 const source=record(input),profile=record(source.profileOriginal),media=record(profile.media);
 const kind=profile.mediaKind??media.kind;
 const authored=kind==='audio'?record(media.audioDistribution).releaseTitle:kind==='epub'?record(media.epubMetadata).title:undefined;
 for(const value of [profile.assetTitle,authored,record(media.objectProof).title,record(profile.longForm).title,profile.title]){
  const found=title(value);if(found)return found;
 }
 return null;
}
export function publicAssetTitle(input:unknown):string|null{
 const authored=publicAuthoredAssetTitle(input);if(authored)return authored;
 const source=record(input),media=record(record(source.profileOriginal).media),digest=media.originalDownloadSha256Hex??record(media.material).sealedArtifactSha256Hex;
 const retained=typeof source.id==='string'?publicAssetTitles[source.id]:undefined;
 // Old retained rows lost their authored title during curation. Correct only
 // the same asset and exact original; never carry a title to changed evidence.
 if(retained&&retained[0]===source.receizId&&typeof digest==='string'&&retained[1]===digest.toLowerCase())return retained[2];
 const caption=title(source.title);if(!caption)return null;
 // The caption remains complete in its own surface. Only its headline is
 // reduced to the first sentence when no authored title was supplied.
 const line=caption.split(/\r?\n/).find(line=>line.trim())?.trim()??caption,period=line.search(/\.(?=\s|$)/);
 return period>=0?line.slice(0,period+1):line;
}
