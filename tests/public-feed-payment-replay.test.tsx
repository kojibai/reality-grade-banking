// @vitest-environment happy-dom
import{act,StrictMode,useEffect}from'react';import{createRoot}from'react-dom/client';import{expect,it,vi}from'vitest';
const state=vi.hoisted(()=>({session:null as any,opened:{binding:'existing identity'}}));
vi.mock('../src/checkout/checkout-identity',()=>({createCheckoutIdentitySession:()=>{let closed=false;return{open:()=>closed?Promise.reject(Error('closed')):Promise.resolve(state.opened),import:()=>Promise.resolve(state.opened),recoverPbi:()=>Promise.resolve(state.opened),close:()=>{closed=true;}}}}));
vi.mock('../src/checkout/HostedCheckout',()=>({HostedCheckout:(p:any)=>{state.session=p.identitySession;useEffect(()=>()=>p.identitySession.close(),[p.identitySession]);return <span>Existing checkout</span>;}}));
import FeedPayment from'../src/public-feed/FeedPayment';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('public checkout still opens its existing identity session after an enclosing development replay',async()=>{const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<StrictMode><FeedPayment username="creator"/></StrictMode>));await expect(state.session.open()).resolves.toBe(state.opened);}finally{act(()=>root.unmount());}});
