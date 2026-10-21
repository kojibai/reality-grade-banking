const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const title=(value:unknown)=>typeof value==='string'&&value.length<=4096&&value.trim()?value.trim():null;
/** Display metadata only. Titles never replace original source or authority.
 * The legacy collection title can be a caption, so authored titles come first. */
export function publicAssetTitle(input:unknown):string|null{
 const source=record(input),profile=record(source.profileOriginal),media=record(profile.media);
 const kind=profile.mediaKind??media.kind;
 const authored=kind==='audio'?record(media.audioDistribution).releaseTitle:kind==='epub'?record(media.epubMetadata).title:undefined;
 for(const value of [profile.assetTitle,authored,record(media.objectProof).title,record(profile.longForm).title,profile.title,source.title]){
  const found=title(value);if(found)return found;
 }
 return null;
}
