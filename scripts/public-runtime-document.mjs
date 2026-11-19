/** Scheduling only: preserve the complete document and its existing module. */
export function earlyPublicRuntimeDocument(html){
 return html.replace(/<script\b[^>]*>/gi,tag=>{
  if(/\btype="module"/.test(tag)&&/\bsrc="\/assets\/explore-[^"/]+\.js"/.test(tag)&&!/\bdata-public-runtime-entry=/.test(tag))tag=tag.replace('type="module"','type="module" data-public-runtime-entry="explore"');
  return /\btype="module"/.test(tag)&&/\bsrc="\/assets\/(?:discover|feed|explore|ledger|verify|conformance|receipt|vote)-[^"/]+\.js"/.test(tag)&&!/\basync(?:\s|>|=)/.test(tag)?tag.replace('type="module"','type="module" async'):tag;});
}
