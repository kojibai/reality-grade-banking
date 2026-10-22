// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import {BankeizCredential} from '../src/conformance/BankeizCredential';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows the exact public original and scoped identity without loading private identity or proving runtime',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 const record={recorded:true as const,url:'/conformance/bankeiz-public-conformance.png',artifactSha256:'a'.repeat(64),evidenceSha256:'b'.repeat(64),holderReceizId:'bjklock.receiz.id',implementationBuildSha256:'c'.repeat(64),cases:33};
 try{act(()=>root.render(<BankeizCredential record={record}/>));expect(host.textContent).toContain('bjklock.receiz.id');expect(host.textContent).toContain('Public integration contract');expect(host.querySelector<HTMLAnchorElement>('a[download]')?.href).toContain(record.url);expect(host.querySelector('input')).toBeNull();expect(host.querySelector('img')?.getAttribute('src')).toBe(record.url);}finally{act(()=>root.unmount());}
});
it('never represents an unissued original as a passing signed credential',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<BankeizCredential record={{recorded:false}}/>));expect(host.querySelector('a[download]')).toBeNull();expect(host.textContent).not.toContain('Verified original');}finally{act(()=>root.unmount());}
});
