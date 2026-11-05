import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {economyState,chainState,formatMoney,comparisonSteps,evidenceLayers} from '../public/learn/accept-money-model.js';
import {acceptMoneyContent,acceptMoneyPage} from '../scripts/accept-money-page.mjs';

describe('deterministic receiving demonstration',()=>{
 it('conserves the original $100 through every accepted onward payment',()=>{
  for(let step=0;step<=5;step++){
   const state=economyState(step);
   expect(Object.values(state.balances).reduce((a,b)=>a+b,0)).toBe(10000);
   expect(Object.values(state.balances).every(amount=>Number.isSafeInteger(amount)&&amount>=0)).toBe(true);
   expect(state.transitions).toHaveLength(step);
   expect(state.transitions.map(t=>t.predecessor)).toEqual(state.transitions.map((_,i)=>i===0?'demo-admission':`demo-transfer-${i}`));
   expect(new Set(state.transitions.map(t=>t.id)).size).toBe(step);
  }
  expect(economyState(5).balances).toEqual({restaurant:4000,supplier:2000,wholesaler:1500,distributor:1000,contractor:500,merchant:1000});
 });
 it('reselects a state without crediting it again and rejects invalid steps',()=>{
  expect(economyState(3)).toEqual(economyState(3));
  const a=economyState(5);a.balances.restaurant=0;
  expect(economyState(5).balances.restaurant).toBe(4000);
  for(const n of [-1,6,1.5,NaN])expect(()=>economyState(n)).toThrow();
 });
 it('preserves the $250 source through the second-payment chain',()=>{
  expect(chainState(3).balances).toEqual({restaurant:7000,supplier:6000,distributor:5000,contractor:7000});
  for(let step=0;step<=3;step++)expect(Object.values(chainState(step).balances).reduce((a,b)=>a+b,0)).toBe(25000);
  expect(formatMoney(480000)).toBe('$4,800');
 });
 it('separates authenticity, authority and accepted state',()=>{
  expect(comparisonSteps).toHaveLength(4);
  expect(evidenceLayers.map(item=>item.key)).toEqual(['source','identity','ownership','time','funding','continuity','verification']);
 });
 it('ships readable public content and links before JavaScript without fake verification',()=>{
  const html=acceptMoneyContent(),plain=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  expect(acceptMoneyPage.path).toBe('/accept/');
  const routes=JSON.parse(readFileSync('vercel.json','utf8')).rewrites;
  for(const source of ['/accept','/accept/'])expect(routes.find((r:{source:string})=>r.source===source)?.destination).toBe('/accept/index.html');
  for(const id of ['difference','second-payment','email-payments','the-original','independent','developers','comparison','economy','institutions','entrance','keep-moving'])expect(html).toContain(`id="${id}"`);
  for(const text of ['ACCEPT THE MONEY.','NOT JUST THE PAYMENT NOTIFICATION.','Deterministic demonstration','No money moves','Current authority','Accepted transition','verifyTransitionSet','prepareCommitSet','receiveReserve'])expect(plain.includes(text)).toBe(true);
  expect(html).not.toMatch(/[a-f0-9]{64}/);
  expect(html).not.toContain('onclick=');
  expect(html).toContain('data-public-script="accept-money"');
 });
});
