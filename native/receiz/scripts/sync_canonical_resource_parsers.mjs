import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Synchronize only the existing parser seams. The canonical verifier, trust
// roots, proof schemas and history checks remain the same implementation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputArgument = process.argv.indexOf('--output');
if (outputArgument >= 0 && !process.argv[outputArgument + 1]) throw Error('Canonical resource output path required');
const outputPath = outputArgument < 0 ? resolve(root, 'packages/receiz-sdk/src/verifier/canonicalImplementation.js') : resolve(process.argv[outputArgument + 1]);
let output = readFileSync(outputPath, 'utf8');
const initial = output;
const parse = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
const functions = [
  ['app/utils/pngChunks.ts', [
    'pngTextCapacity', 'pngTextBudget', 'pngTextKeyword', 'pngTextValue',
    'parseITXtData', 'parseTextData', 'parseZTxtData', 'readPngTextChunks',
    'readPngTextChunk', 'countPngTextChunksByKeyword', 'stripPngTextChunksByKeyword',
  ]],
  ['app/utils/receizProofBundle.ts', ['decodeReceizProofBundlePayload', 'decodeReceizProofBundle']],
  ['packages/receiz-sdk/src/verifier/canonicalSource.ts', [
    'canonicalResourceRefusalCode', 'verifyPngArtifact', 'verifyPdfArtifact', 'verifySvgArtifact', 'verifyJsonArtifact',
  ]],
];
const newFunctions = new Set(['pngTextCapacity', 'pngTextBudget', 'pngTextKeyword', 'pngTextValue', 'canonicalResourceRefusalCode', 'decodeReceizProofBundlePayload']);
const replacements = [];
const additions = [];
for (const [path, names] of functions) {
  const source = parse(path, readFileSync(resolve(root, path), 'utf8'));
  const target = parse(outputPath, output);
  for (const name of names) {
    const find = file => file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    const from = find(source), to = find(target);
    if (!from || !to && !newFunctions.has(name)) throw Error('Missing canonical resource seam: ' + name);
    const generated = ts.transpileModule(from.getText(source).replace(/^export\s+/, ''), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText.trimEnd();
    if (to) replacements.push({ start: to.getStart(target), end: to.end, generated });
    else additions.push(generated);
  }
}
for (const edit of replacements.sort((a, b) => b.start - a.start)) {
  output = output.slice(0, edit.start) + edit.generated + output.slice(edit.end);
}
const pngSourcePath = 'app/utils/pngChunks.ts';
const pngSource = parse(pngSourcePath, readFileSync(resolve(root, pngSourcePath), 'utf8'));
for (const name of ['PNG_TEXT_RUNTIME_BYTES', 'PNG_TEXT_TOTAL_RUNTIME_BYTES', 'PNG_TEXT_ENTRY_RUNTIME_COUNT']) {
  const from = pngSource.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(pngSource) === name));
  if (!from) throw Error('Missing parser resource constant: ' + name);
  const generated = ts.transpileModule(from.getText(pngSource), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.trimEnd();
  const target = parse(outputPath, output);
  const to = target.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(target) === name));
  if (to) output = output.slice(0, to.getStart(target)) + generated + output.slice(to.end);
  else additions.unshift(generated);
}
if (!output.includes('from "./boundedInflate.js"')) output = 'import { inflateReceizBounded } from "./boundedInflate.js";\n' + output;
if (additions.length) {
  const seam = output.indexOf('var PNG_SIGNATURE');
  if (seam < 0) throw Error('Missing canonical PNG module seam');
  output = output.slice(0, seam) + additions.join('\n') + '\n' + output.slice(seam);
}
if (process.argv.includes('--check')) {
  if (output !== initial) throw Error('Canonical resource parsers differ from implemented source');
} else if (output !== initial) writeFileSync(outputPath, output);
console.log('Canonical source resource parsers aligned.');
