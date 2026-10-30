// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
const supplied=vi.hoisted(()=>({request:null as null|{username:string},identitySession:null as unknown}));
vi.mock('../src/checkout/HostedCheckout',()=>({HostedCheckout:(props:{request:{username:string};identitySession:unknown})=>{supplied.request=props.request;supplied.identitySession=props.identitySession;return <section>Existing hosted payment</section>;}}));
import FeedPayment from '../src/public-feed/FeedPayment';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('passes the actual recipient to the existing hosted checkout without any feed-specific execution or default charge',async()=>{const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<FeedPayment username="bjklock"/>));expect(supplied.request).toEqual({username:'bjklock'});expect(supplied.identitySession).toMatchObject({open:expect.any(Function),import:expect.any(Function),close:expect.any(Function)});expect(host.textContent).toContain('Existing hosted payment');expect(fetcher).not.toHaveBeenCalled();}finally{act(()=>root.unmount());vi.unstubAllGlobals();}});
