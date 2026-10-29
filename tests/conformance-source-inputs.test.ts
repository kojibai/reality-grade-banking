import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {baselineInputs,baselineHash} from '../scripts/conformance-sources.mjs';
it('binds the deployed manual sources with the application while excluding generated manual output',async()=>{const rows=await baselineInputs(),manual=rows.find(row=>row.path==='docs-app/articles/people.mjs');expect(manual?.sha256).toBe(baselineHash(await readFile('docs-app/articles/people.mjs')));expect(rows.some(row=>row.path==='src/features/meeting/MeetingCloseout.tsx')).toBe(true);expect(rows.some(row=>row.path.startsWith('docs-app/dist/'))).toBe(false);});
