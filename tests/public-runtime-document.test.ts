import {expect,it} from 'vitest';
import {earlyPublicRuntimeDocument} from '../scripts/public-runtime-document.mjs';
it.each(['explore','ledger','verify','conformance','receipt'])('starts the existing %s module asynchronously without changing its full root or navigation',name=>{
 const html=`<html><head><script type="module" crossorigin src="/assets/${name}-example.js"></script><script type="module" src="/assets/bank.js"></script></head><body><div id="public-${name}-root">Full existing content</div><script id="receiz-navigation" type="application/json">{"pages":{"all":"retained"}}</script></body></html>`;
 const changed=earlyPublicRuntimeDocument(html);expect(changed).toBe(html.replace(`type="module" crossorigin src="/assets/${name}`,`type="module" async crossorigin src="/assets/${name}`));expect(earlyPublicRuntimeDocument(changed)).toBe(changed);
});
it('leaves account, checkout and other documents unchanged',()=>{
 const html='<script type="module" src="/assets/index-bank.js"></script><script type="module" src="/assets/booking-example.js"></script><script type="module" src="/assets/meeting-example.js"></script><script type="module" src="/assets/checkout-example.js"></script>';
 expect(earlyPublicRuntimeDocument(html)).toBe(html);
});
