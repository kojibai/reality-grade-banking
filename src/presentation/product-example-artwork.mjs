import{exampleAssets}from'../content/product-example-assets.mjs';
/** Build-only normalization of the exact local illustration allowlist.
 * Native artwork admission is unchanged. This never maps Original or API URLs. */
export function localizeProductExampleArtwork(html){return exampleAssets.reduce((result,asset)=>{const canonical=new URL(asset.image,'https://receiz.com').href;return result.replaceAll('src="'+canonical+'"','src="'+asset.image+'"').replaceAll('href="'+canonical+'"','href="'+asset.image+'"');},html);}
