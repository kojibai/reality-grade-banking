// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import type {PublicMarketItem} from '../src/receiz/public-market';
import type {ReactElement} from 'react';
const state=vi.hoisted(()=>({seed:null as PublicMarketItem[]|null}));
vi.mock('react-dom/client',()=>({hydrateRoot:(_host:Element,node:ReactElement<{seed:PublicMarketItem[]}>)=>{state.seed=node.props.seed;return{};}}));
const row=(id:string,sports:boolean):PublicMarketItem=>({id,assetId:id,title:id,summary:id,category:sports?'sports':'proof',mediaKind:'moment',ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});
it('selects eight eligible rows before hydrating the carried full catalog, without a replacement Source read',async()=>{
 const items=[...Array.from({length:12},(_,i)=>row('sport-'+i,true)),...Array.from({length:10},(_,i)=>row('work-'+i,false))],source={schema:'bank.public-market.document.v1',generation:'c'.repeat(64),path:'feed',catalog:{items,complete:true,revision:'cohort',observedAt:null,sourceCount:items.length},visibleCount:8,asOfPulse:14900000,format:{locale:'en-US',timeZone:'UTC'}};
 document.body.innerHTML='<div id="public-feed-root" data-public-runtime="feed"><script id="public-market-seed" type="application/json">'+JSON.stringify(source)+'</script></div><script id="receiz-navigation" type="application/json">{}</script>';
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 try{await import('../src/public-feed/main');expect(state.seed).toHaveLength(8);expect(state.seed?.every(item=>item.category==='proof')).toBe(true);expect(fetcher).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();document.body.innerHTML='';}
});
