import{readFileSync}from'node:fs';import{transformSync}from'esbuild';import{canonicalizeReceizConstitution}from'@receiz/sdk';import{expect,it}from'vitest';
it('passive trace and exact display-unit fields cannot alter the existing native execution tuple match',()=>{
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),start=source.indexOf('  function matchesNoteDisplay('),end=source.indexOf('  let noteRuntime:',start);
 expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
 const code=transformSync(`function harness(){const sdk={canonicalizeReceizConstitution};const isWalletQuoteHeld=()=>false,hasSettledAccountView=()=>false;${source.slice(start,end)}return matchesNoteDisplay;}`,{loader:'ts',target:'es2022'}).code;
 const matches=new Function('canonicalizeReceizConstitution',code+';return harness();')(canonicalizeReceizConstitution),wallet={userId:'owner',totalUsdCents:'1900',reserveUsdCents:'1900',settlementUsdCents:'0',balancePhiMicro:'8000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'1',kaiUpulse:'1000000'};
 const richer={...wallet,reservePhiMicro:'8000000',settlementPhiMicro:'0',balanceSourceSha256:'a'.repeat(64),originalProofReferences:{A:{sourceSha256:'b'.repeat(64),pbiReceiptHash:'c'.repeat(64)}},reserveFundingSource:{passive:true},currentBalanceSource:{passive:true}};
 expect(matches(wallet,{wallet:richer,walletScope:'native-cash-only'})).toBe(true);expect(matches({...wallet,balancePhiMicro:'8000001'},{wallet:richer,walletScope:'native-cash-only'})).toBe(false);expect(matches({...wallet,kaiUpulse:'1000001'},{wallet:richer,walletScope:'native-cash-only'})).toBe(false);
});
