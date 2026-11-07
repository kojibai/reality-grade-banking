import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';
import {expect,it} from 'vitest';

it('includes the installed SDK declaration when Vercel compiles its verifier source separately',()=>{
 const root=process.cwd(),config=ts.parseJsonConfigFileContent(JSON.parse(readFileSync('tsconfig.json','utf8')),ts.sys,root);
 const verifier=resolve('native/receiz/packages/receiz-sdk/src/verifier/groth16.ts');
 // The normal application graph consumes SDK declarations. Vercel also traces
 // and compiles the native verifier source, so qualify that exact program root.
 const program=ts.createProgram([verifier,...config.fileNames.filter(path=>path.endsWith('.d.ts'))],config.options);
 const diagnostics=program.getSemanticDiagnostics(program.getSourceFile(verifier)!);
 expect(diagnostics.map(value=>ts.flattenDiagnosticMessageText(value.messageText,'\n'))).toEqual([]);
 expect(program.getSourceFiles().some(file=>file.fileName.endsWith('/receiz-sdk/src/snarkjs.d.ts'))).toBe(true);
});
