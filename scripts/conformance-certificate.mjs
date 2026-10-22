// Adopt only a verified public original. Identity Records never belong here.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {openSealedConformanceEvidenceObject} from '../src/conformance/receiz-evidence-seal.ts';
const root=new URL('../',import.meta.url),metadata=new URL('src/content/conformance-certificate.json',root),url='/conformance/bankeiz-public-conformance.png';
async function inspect(path){
 const original=await openSealedConformanceEvidenceObject(new Uint8Array(await readFile(path)),{filename:'bankeiz-public-conformance.png'}),report=original.object.report;
 if(report.implementation.name!=='Bankeiz'||report.credentialHolder?.receizId!=='bjklock.receiz.id')throw Error('BANKEIZ_GOVERNANCE_CREDENTIAL_REQUIRED');
 return{recorded:true,url,artifactSha256:original.artifactSha256,evidenceSha256:original.object.digest,holderReceizId:report.credentialHolder.receizId,implementationBuildSha256:report.implementation.buildSha256,cases:report.cases.length};
}
try{
 if(process.argv[2]==='--adopt'&&process.argv[3]){
  const record=await inspect(process.argv[3]);
  await copyFile(process.argv[3],new URL('public'+url,root));await writeFile(metadata,JSON.stringify(record,null,2)+'\n');
  console.log(`Adopted independently verified public Bankeiz credential: ${record.cases} cases, holder ${record.holderReceizId}.`);
 }else if(process.argv[2]==='--check'){
  const saved=JSON.parse(await readFile(metadata,'utf8'));
  if(saved.recorded===false)console.log('No public Bankeiz credential has been issued; no signed result is displayed.');
  else{
   if(saved.url!==url)throw Error('PUBLIC_CREDENTIAL_PATH_INVALID');
   const actual=await inspect(new URL('public'+url,root));
   if(JSON.stringify(actual)!==JSON.stringify(saved))throw Error('PUBLIC_CREDENTIAL_MANIFEST_MISMATCH');
   console.log(`Verified public Bankeiz original, complete evidence, artwork and holder ${actual.holderReceizId}.`);
  }
 }else throw Error('Usage: node scripts/conformance-certificate.mjs --adopt public-original.png | --check');
}catch(error){console.error(error instanceof Error?error.message:'PUBLIC_CREDENTIAL_FAILED');process.exitCode=1;}
