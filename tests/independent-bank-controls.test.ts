import {afterEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {independentBankContent} from '../scripts/independent-bank-page.mjs';
import {independentState,independentOwners,formatMoney} from '../public/learn/independent-bank-model.js';
import {comparisonSteps} from '../public/learn/accept-money-model.js';
const windows:Window[]=[];
afterEach(()=>{vi.unstubAllGlobals();for(const window of windows)window.happyDOM.abort();windows.length=0;});
function open(loadVerifier:()=>Promise<unknown>=async()=>{throw Error('Unavailable fixture');}){
 const window=new Window({url:'https://bankeiz.com/build/'});windows.push(window);const document=window.document;document.body.innerHTML=independentBankContent();
 vi.stubGlobal('document',document);vi.stubGlobal('location',window.location);vi.stubGlobal('navigator',window.navigator);vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('addEventListener',window.addEventListener.bind(window));vi.stubGlobal('removeEventListener',window.removeEventListener.bind(window));
 const source=readFileSync('public/learn/independent-bank.js','utf8').replace(/^import .*\n/gm,'').replace('export function init','function init').replace('import(/* @vite-ignore */ url)','loadVerifier(url)');
 const init=new Function('independentState','independentOwners','formatMoney','comparisonSteps','loadVerifier',source+';return init;')(independentState,independentOwners,formatMoney,comparisonSteps,loadVerifier);init();
 const click=(selector:string)=>document.querySelector(selector)!.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));return{document,click,init};
}
it('keeps exact portions and predecessor views when controls are reselected or initialized again',()=>{
 const {document,click,init}=open();click('[data-ib-send="second"]');expect(document.querySelector('[data-ib-total]')!.textContent).toBe('$1,000');
 click('[data-ib-send="first"]');click('[data-ib-send="first"]');init();
 expect([...document.querySelectorAll('[data-ib-balance]')].map(node=>node.textContent)).toEqual(['$600','$400','$0']);
 click('[data-ib-send="second"]');click('[data-ib-send="second"]');click('[data-ib-view="proof"]');
 expect([...document.querySelectorAll('[data-ib-phi]')].map(node=>node.textContent)).toEqual(['6.000000 Φ','1.500000 Φ','2.500000 Φ']);
 expect(document.querySelector('[data-ib-proof]')!.hasAttribute('hidden')).toBe(false);expect(document.querySelector('[data-ib-proof-fields]')!.textContent).toContain('demo-head-B-1');
 click('[data-ib-dev-step="8"]');expect(document.querySelector('[data-ib-dev-title]')!.textContent).toBe('Support the next legitimate transfer');expect(document.querySelector('[data-ib-dev-description]')!.textContent).toContain('Qualify the receiver');
 click('[data-ib-reset]');expect([...document.querySelectorAll('[data-ib-balance]')].map(node=>node.textContent)).toEqual(['$1,000','$0','$0']);
});
it('does not turn malformed or credit-authorizing verifier output into a displayed proof pass',async()=>{
 const result={schema:'bankeiz.synthetic-note-demo.result.v1',scope:'synthetic-source-and-delivery-authority',results:[{fixture:'authentic',synthetic:true,verified:true,amountUsdCents:'200',carriedSourceVerified:true,deliveryAuthorityBound:true,currentSpendabilityChecked:false,creditAuthorized:true},{fixture:'wrong-delivery-authority',synthetic:true,verified:false,error:'BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH',currentSpendabilityChecked:false,creditAuthorized:false}]};
 const {document,click}=open(async()=>({runIndependentVerification:async()=>result}));click('[data-ib-verify]');
 await vi.waitFor(()=>expect(document.querySelector('[data-ib-verifier-status]')!.textContent).toContain('No pass or refusal is asserted'));
 expect(document.querySelector('[data-ib-verification="authentic"]')!.textContent).toContain('Not run');expect(document.querySelector('[data-ib-verify]')!.hasAttribute('disabled')).toBe(false);
});
it('can fade the implementation brands while retaining the Original and its evidence',()=>{
 const {document,click}=open();expect(document.querySelector('[data-ib-focus-proof]')).not.toBeNull();
 click('[data-ib-focus-proof]');expect(document.querySelector('.ib-final-lineage')!.getAttribute('data-focus-proof')).toBe('true');expect(document.querySelector('.ib-final-lineage strong')!.textContent).toBe('Financial Original');
 click('[data-ib-focus-proof]');expect(document.querySelector('.ib-final-lineage')!.getAttribute('data-focus-proof')).toBe('false');
});
