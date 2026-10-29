/** Scheduling only: preserve the complete document and its existing module. */
export function earlyPublicRuntimeDocument(html){
 return html.replace(/<script\b[^>]*>/gi,tag=>/\btype="module"/.test(tag)&&/\bsrc="\/assets\/(?:explore|ledger|verify|conformance|receipt)-[^"/]+\.js"/.test(tag)&&!/\basync(?:\s|>|=)/.test(tag)?tag.replace('type="module"','type="module" async'):tag);
}
