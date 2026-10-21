import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function writeAssetTitleIndex(check=false){
 const source=JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8')),titles={};
 for(const row of source.transport.publicOriginals){
  const profile=row.profileOriginal,media=profile?.media,title=profile?.assetTitle,digest=media?.originalDownloadSha256Hex??media?.material?.sealedArtifactSha256Hex;
  if(typeof title!=='string'||!title.trim()||title.length>4096||typeof digest!=='string'||!/^[a-f0-9]{64}$/i.test(digest))continue;
  titles[row.id]=[row.receizId,digest.toLowerCase(),title.trim()];
 }
 const output='// Generated from the existing public snapshot. Display metadata only; no request or proof authority.\nexport const publicAssetTitles:Readonly<Record<string,readonly [string,string,string]>>='+JSON.stringify(titles,null,1)+';\n';
 const file=new URL('../src/content/public-asset-titles.ts',import.meta.url);
 if(check){if(await readFile(file,'utf8')!==output)throw Error('Public asset title index is stale. Run node scripts/build-asset-title-index.mjs.');}
 else await writeFile(file,output);
 console.log(`${check?'Verified':'Built'} ${Object.keys(titles).length} source-bound public titles without a runtime lookup.`);
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await writeAssetTitleIndex(process.argv.includes('--check'));
