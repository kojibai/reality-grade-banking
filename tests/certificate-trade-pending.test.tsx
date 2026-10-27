// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';import {act} from 'react';import {createRoot} from 'react-dom/client';import {CertificateTrade} from '../src/features/certificates/CertificateTrade';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;afterEach(async()=>{if(root)await act(()=>root.unmount());host?.remove();});
it('does not resume or label another certificate operation as this purchase',async()=>{
 const resume=vi.fn(),cancel=vi.fn(),token='current-certificate-token',other='another-certificate-token',api={status:async()=>({kind:'trade',status:'pending',token:other,body:{side:'buy'}}),state:async()=>({note:{title:'Current asset',remainingShareQuantityMicro:'1000000',status:'minted'},viewer:{isOwner:false}}),resume,cancel};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(<CertificateTrade identity={{shareCertificates:async()=>api} as never} token={token} side="buy" onRefresh={()=>{}}/>));
 expect(host.textContent).toContain('another certificate');expect([...host.querySelectorAll('button')].some(b=>b.textContent?.includes('Continue saved operation'))).toBe(false);expect(resume).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();
});
