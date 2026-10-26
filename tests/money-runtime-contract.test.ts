import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
it('keeps financial tools lazy, same-owner, and composed from existing custody, proof and payment primitives',()=>{
 const code=readFileSync('src/receiz/native-identity.ts','utf8');
 expect(code.includes('async function moneyTools()')).toBe(true);expect(code.includes('createMoneyWorkspace')).toBe(true);expect(code.includes('searchMoneyHistory')).toBe(true);expect(code.includes('heldAccountProofBytes')).toBe(true);expect(code.includes('money-workspace')).toBe(true);
 expect(code.includes('loadMoneyWorkspaceState')).toBe(true);expect(code.includes('saveMoneyWorkspaceState')).toBe(true);
});
