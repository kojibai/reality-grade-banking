import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

/** Account-entry law: this function stays at its working pre-regression
 * baseline. A presentation change cannot add onboarding inputs or waits. */
export function accountCreationContract(source) {
 const file=ts.createSourceFile('account-entry.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createFreshNativeIdentity');
 if(!fn)throw Error('BANK_ACCOUNT_ENTRY_CREATION_MISSING');
 return ts.createPrinter({removeComments:true}).printNode(ts.EmitHint.Unspecified,fn,file);
}
export function assertFrozenAccountCreation(source,baseline) {
 if(accountCreationContract(source)!==accountCreationContract(baseline))throw Error('BANK_ACCOUNT_ENTRY_FROZEN: account creation changed from its working baseline. Restore the frozen path; display naming must remain in the shared projection.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [source,baseline]=await Promise.all([readFile('src/receiz/native-identity.ts','utf8'),readFile('tests/fixtures/account-entry-frozen.ts.txt','utf8')]);
 assertFrozenAccountCreation(source,baseline);
 console.log('Verified frozen Bankeiz account creation: exact SDK input, internal custody and phrase-free Identity Record; no added prompts, requests or waits.');
}
