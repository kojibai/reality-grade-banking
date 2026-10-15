// Rebuild the shared pinned closure before writing either native artifact.
// No private Receiz checkout is required.
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/rebuild-native.mjs', '--output', 'public/native'], { stdio: 'inherit' });
