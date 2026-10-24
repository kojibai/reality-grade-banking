// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Entrance} from '../src/features/identity/Entrance';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('uses the same fingerprint and no added visible text as the optional PBI button while keeping Enter independent',()=>{
 const host=document.createElement('div'),root=createRoot(host),onPbi=vi.fn(),onCreate=vi.fn();
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',vi.fn());
 try{
  act(()=>root.render(<Entrance opening={false} busy={false} error={null} onCreate={onCreate} onImport={vi.fn()} onPbi={onPbi}/>));
  const button=host.querySelector<HTMLButtonElement>('button.entrance-symbol')!;expect(button).not.toBeNull();expect(button.textContent).toBe('');expect(button.getAttribute('aria-label')).toBe('Continue with PBI');expect(button.querySelector('svg')?.getAttribute('width')).toBe('39');expect(button.querySelector('svg')?.getAttribute('stroke-width')).toBe('1.4');expect(host.querySelectorAll('.lucide-fingerprint')).toHaveLength(1);expect(onPbi).not.toHaveBeenCalled();
  act(()=>button.click());expect(onPbi).toHaveBeenCalledOnce();expect(onCreate).not.toHaveBeenCalled();
  act(()=>[...host.querySelectorAll('button')].find(value=>value.textContent?.trim()==='Enter')!.click());expect(onCreate).toHaveBeenCalledWith(true);expect(onPbi).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
