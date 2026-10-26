import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const toolingIndex=process.argv.indexOf('--esbuild-from');
const require=createRequire(toolingIndex<0?import.meta.resolve('tsx'):resolve(process.argv[toolingIndex+1],'package.json')),{build}=require('esbuild');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Extract the actual application calculators, following the existing canonical
// valuation/seal extraction. This module never admits funds or commits a head.
const entry=`export {compileBankOfflineMarketPricing} from './app/lib/wallet/bankNotes/offlineMarketPricing';
export {compileBankOfflineWalletValuation,inspectBankOfflineWalletLedger} from './app/lib/wallet/bankNotes/offlineWalletValuation';
export {deriveMarketShareAccounting} from './app/lib/market/shareTradeAccounting';
export {marketShareBuyPreviewFromBudgetUsdCentsAtAsk,marketShareSellPreviewFromBudgetUsdCentsAtBid} from './app/lib/market/shareFees';
export {marketNotionalPhiMicroFromUsdCents} from './app/lib/market/shareMath';`;
const built=await build({absWorkingDir:root,stdin:{contents:entry,sourcefile:'account-financial-math-entry.ts',resolveDir:root,loader:'ts'},bundle:true,metafile:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none',external:['@noble/hashes/*'],plugins:[{name:'reuse-canonical-sdk-valuation',setup(build){build.onResolve({filter:/valuation(?:\.[jt]s)?$/},args=>{
 if(args.path==='@/app/utils/valuation'||resolve(args.resolveDir,args.path).replace(/\.[jt]s$/u,'')===resolve(root,'app/utils/valuation'))return {path:'./sigilValuationCore.js',external:true};
});}}]});
if(Object.keys(built.metafile.inputs).includes('app/utils/valuation.ts'))throw Error('ACCOUNT_FINANCIAL_VALUATION_DUPLICATED');
const output='// Generated from the canonical Wallet/Market calculators by scripts/sync_account_financial_math.mjs.\n'+built.outputFiles[0].text;
const target=resolve(root,'packages/receiz-sdk/src/accountFinancialMath.generated.js');
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('ACCOUNT_FINANCIAL_MATH_DRIFT');}
else writeFileSync(target,output);
if(process.argv.includes('--dist-types')){
 // TypeScript infers loose declarations from minified JS. Ship the reviewed
 // exact input/output declarations rather than those inferred internals.
 copyFileSync(resolve(root,'packages/receiz-sdk/src/accountFinancialMath.generated.d.ts'),resolve(root,'packages/receiz-sdk/dist/accountFinancialMath.generated.d.ts'));
 rmSync(resolve(root,'packages/receiz-sdk/dist/accountFinancialMath.generated.d.ts.map'),{force:true});
}
console.log('Canonical Wallet/Market arithmetic extraction aligned.');
