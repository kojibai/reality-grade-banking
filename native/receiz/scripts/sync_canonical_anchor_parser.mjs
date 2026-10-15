import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The main application's implemented parser is canonical. This updates only
// that existing extracted function; signatures and artifact verification stay
// in the existing implementation and are neither replaced nor bypassed.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'app/utils/receizAnchorBundle.ts');
const extractedPath = resolve(root, 'packages/receiz-sdk/src/verifier/canonicalImplementation.js');
const sourceText = readFileSync(sourcePath, 'utf8');
const extractedText = readFileSync(extractedPath, 'utf8');
const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true);
const extracted = ts.createSourceFile(extractedPath, extractedText, ts.ScriptTarget.Latest, true);
const declaration = file => file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'coerceReceizAnchorBundle');
const from = declaration(source), to = declaration(extracted);
if (!from || !to) throw Error('Existing canonical anchor parser seam missing');
for (const name of ['coerceProfileOriginalStorageRef', 'coerceProfileOriginalStorageVariantMap', 'coerceProfileOriginalStorageVariantMapFromAny', 'coerceReceizProofBundle', 'coerceProfileOriginalLongForm', 'validReceizAnchorProofAttachments', 'coerceReceizAnchorSignalRunSubjectArt', 'isAllowedMediaUrl', 'isBase64DataUrl', 'isHex64']) {
  if (!extractedText.includes(`function ${name}(`)) throw Error(`Missing extracted parser dependency: ${name}`);
}
const generated = ts.transpileModule(from.getText(source).replace(/^export\s+/, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.trimEnd();
const updated = extractedText.slice(0, to.getStart(extracted)) + generated + extractedText.slice(to.end);
if (process.argv.includes('--check')) {
  if (updated !== extractedText) throw Error('Extracted canonical anchor parser differs from implemented app parser');
} else if (updated !== extractedText) writeFileSync(extractedPath, updated);
console.log('Canonical application anchor parser extraction aligned.');
