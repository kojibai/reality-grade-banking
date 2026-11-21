import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

export function assetPublicationContracts(path, source, names) {
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);
 const printer=ts.createPrinter({removeComments:true});
 const requested=new Set(names),contracts=new Map();
 function visit(node) {
  const declaration=ts.isFunctionDeclaration(node)&&node.body||ts.isVariableDeclaration(node)&&node.initializer;
  if(declaration&&node.name&&ts.isIdentifier(node.name)&&requested.has(node.name.text)) {
   const name=node.name.text;
   if(contracts.has(name))throw Error('BANK_ASSET_PUBLICATION_FROZEN: duplicate '+path+'#'+name);
   const canonical=printer.printNode(ts.EmitHint.Unspecified,node,file);
   contracts.set(name,createHash('sha256').update(canonical).digest('hex'));
  }
  ts.forEachChild(node,visit);
 }
 visit(file);
 return Object.fromEntries(names.map(name=>{
  if(!contracts.has(name))throw Error('BANK_ASSET_PUBLICATION_FROZEN: missing '+path+'#'+name);
  return [name,contracts.get(name)];
 }));
}

export function assertFrozenAssetPublicationSource(path,source,expected) {
 const actual=assetPublicationContracts(path,source,Object.keys(expected));
 for(const [name,digest] of Object.entries(expected)) {
  if(actual[name]!==digest)throw Error('BANK_ASSET_PUBLICATION_FROZEN: '+path+'#'+name+' changed. Review the Original creation and publication invariants before changing the baseline.');
 }
}

export async function checkFrozenAssetPublication() {
 const baseline=JSON.parse(await readFile(new URL('../tests/fixtures/asset-publication-freeze.json',import.meta.url),'utf8'));
 await Promise.all(Object.entries(baseline.files).map(async([path,expected])=>{
  const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
  assertFrozenAssetPublicationSource(path,source,expected);
 }));
}
