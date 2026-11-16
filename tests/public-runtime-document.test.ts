import {expect,it} from 'vitest';
import {earlyPublicRuntimeDocument} from '../scripts/public-runtime-document.mjs';
it.each(['discover','feed','explore','ledger','verify','conformance','receipt'])('starts the existing %s module asynchronously without changing its full root or navigation',name=>{
 const html=`<html><head><script type="module" crossorigin src="/assets/${name}-example.js"></script><script type="module" src="/assets/bank.js"></script></head><body><div id="public-${name}-root">Full existing content</div><script id="receiz-navigation" type="application/json">{"pages":{"all":"retained"}}</script></body></html>`;
 const changed=earlyPublicRuntimeDocument(html);expect(changed).toBe(html.replace(`type="module" crossorigin src="/assets/${name}`,`type="module" async${name==='explore'?' data-public-runtime-entry="explore"':''} crossorigin src="/assets/${name}`));expect(earlyPublicRuntimeDocument(changed)).toBe(changed);
});
it('leaves account, checkout and other documents unchanged',()=>{
 const html='<script type="module" src="/assets/index-bank.js"></script><script type="module" src="/assets/booking-example.js"></script><script type="module" src="/assets/meeting-example.js"></script><script type="module" src="/assets/checkout-example.js"></script>';
 expect(earlyPublicRuntimeDocument(html)).toBe(html);
});

it('marks the actual compiled Explore facade as initial delivery even when its mount code is in a shared chunk',()=>{
 const html='<script type="module" async crossorigin src="/assets/explore-facade.js"></script><script type="module" src="/assets/index-shared.js"></script>';
 const changed=earlyPublicRuntimeDocument(html);expect(changed).toContain('data-public-runtime-entry="explore"');expect(changed.match(/data-public-runtime-entry/g)).toHaveLength(1);expect(earlyPublicRuntimeDocument(changed)).toBe(changed);
});
