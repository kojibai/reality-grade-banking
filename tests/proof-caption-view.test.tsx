// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it} from 'vitest';
import {ProofCaption} from '../src/features/media/ProofCaption';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('renders escaped prose and accessible, deduplicated external destination pills',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofCaption caption={'Read the [complete report](https://example.com/report). https://example.com/report\n<script>alert(1)</script> javascript:alert(1)'}/>));
  expect(host.querySelector('p')?.textContent).toContain('Read the complete report.');expect(host.querySelectorAll('a')).toHaveLength(1);const link=host.querySelector('a')!;expect(link.href).toBe('https://example.com/report');expect(link.target).toBe('_blank');expect(link.rel).toBe('noopener noreferrer');expect(link.getAttribute('aria-label')).toBe('Open https://example.com/report');expect(host.querySelector('script')).toBeNull();expect(host.textContent).toContain('javascript:alert(1)');expect(host.textContent).not.toContain('verified');
 }finally{act(()=>root.unmount());}
});
it('retains long caption prose as a bounded number of escaped text nodes',()=>{
 const text=('A long caption paragraph.\n\n').repeat(300),host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofCaption caption={text}/>));expect(host.querySelector('p')?.textContent).toBe(text);expect(host.querySelector('p')?.childNodes).toHaveLength(1);expect(host.querySelector('p')?.children).toHaveLength(0);}finally{act(()=>root.unmount());}
});
