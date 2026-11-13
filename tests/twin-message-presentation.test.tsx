// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {TwinMessageText} from '../src/features/messages/TwinMessageText';
import {MoneyReceipts} from '../src/features/messages/MoneyReceipts';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('renders tasteful inline asset and bound account-record links without executing markup or unsafe URLs',()=>{
 const host=document.createElement('div'),root=createRoot(host),open=vi.fn();
 try{act(()=>root.render(<TwinMessageText text={'See [your asset](/asset/one/) and [your payment](bank-record:wallet%3Aone). [Earlier record](bank-record:missing). [bad](javascript:alert) <script>bad</script>'} recordLink={id=>id==='wallet:one'?{href:'/receipt/#r=exact',onClick:open}:null}/>));
 expect(host.querySelector('a[href="/asset/one/"]')?.textContent).toBe('your asset');const link=host.querySelector<HTMLAnchorElement>('a[href="/receipt/#r=exact"]')!;expect(link.textContent).toBe('your payment');act(()=>link.click());expect(open).toHaveBeenCalledOnce();expect(host.querySelector('script')).toBeNull();expect(host.querySelector('a[href^="javascript:"]')).toBeNull();expect(host.textContent).toContain('Earlier record');expect(host.textContent).not.toContain('bank-record:');
 }finally{act(()=>root.unmount());}
});
it('keeps successful financial reads behind an optional record reference while exact message review stays visible',()=>{
 const host=document.createElement('div'),root=createRoot(host),shown=vi.fn();
 try{act(()=>root.render(<MoneyReceipts onReviewShown={shown} recordLink={()=>({href:'/receipt/#r=exact',onClick(){}})} receipts={[{id:'history',tool:'money_search_history',status:'accepted',summary:'Read 20 financial rows',data:{transactions:[{recordId:'wallet:one',transactionId:'one',title:'Studio payment',description:'Raw data should not fill the reply'}]}},{id:'review',tool:'money_review_message',status:'needs-confirmation',summary:'Review your message',data:{reviewId:'review-one',username:'sam',body:'The exact approved message'}}]}/>));
 const details=host.querySelector('details')!;expect(details).toBeTruthy();expect(details.open).toBe(false);expect(details.querySelector('summary')?.textContent).toContain('Records');expect(details.querySelector('a')?.textContent).toBe('Studio payment');expect(host.querySelector('.bank-money-review')?.closest('details')).toBeNull();expect(host.textContent).not.toContain('Raw data should not fill the reply');expect(shown).toHaveBeenCalledWith('review-one');
 }finally{act(()=>root.unmount());}
});
