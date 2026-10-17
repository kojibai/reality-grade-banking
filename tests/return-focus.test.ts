// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {restorePanelFocus} from '../src/core/return-focus';
it('restores a pointer opener without a persistent ring and restores keyboard indicators on the next key',()=>{
 const button=document.createElement('button');document.body.append(button);
 try {restorePanelFocus(button,true);expect(document.activeElement).toBe(button);expect(button.hasAttribute('data-pointer-focus-return')).toBe(true);
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));expect(button.hasAttribute('data-pointer-focus-return')).toBe(false);
 restorePanelFocus(button,false);expect(document.activeElement).toBe(button);expect(button.hasAttribute('data-pointer-focus-return')).toBe(false);
 }finally{button.remove();}
});
