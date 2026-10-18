import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

it('distributes the exact pinned v129 pricing source and changes only its SDK valuation imports in the browser adapter',()=>{
  const root=new URL('../',import.meta.url);
  const original=readFileSync(new URL('native/receiz/app/utils/phi-issuance.ts',root),'utf8');
  const adapted=readFileSync(new URL('src/receiz/valuation/phi-issuance.v129.ts',root),'utf8');
  const manifest=JSON.parse(readFileSync(new URL('native/manifest.json',root),'utf8'));
  const hash=createHash('sha256').update(original).digest('hex');
  expect(hash).toBe('69622c017e955734525e121a7b27bdaa42066932657b145e02be493792de9c74');
  expect(manifest.historicalValuation).toMatchObject({sourceCommit:'528e397e1d4821e3591258227b9739e1f9856f52',sourceSha256:hash,sdkVersion:'129.0.0',historicalPointsAreRecordedQuotes:false});
  expect(adapted).toBe('// Canonical Receiz v129 pricing source; only the two valuation imports are\n// redirected to the installed SDK. Exact original: native/receiz/app/utils/phi-issuance.ts.\n'+original.replaceAll('from "./valuation"','from "@receiz/sdk/valuation"'));
});
