// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductScreen,productScreenNames} from '../src/presentation/ProductScreen';

it('shows the actual sealed unsigned result and its PBI Sign control as an inert example',()=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="created-asset"/>),'text/html');
 expect(doc.querySelector('.creation-complete h1')?.textContent).toBe('Your Original is sealed.');
 expect(doc.querySelector('.creation-complete')?.textContent).toContain('Your Original is already public on Receiz');
 expect([...doc.querySelectorAll('.creation-complete button')].some(button=>button.textContent==='Sign')).toBe(true);
 expect(doc.querySelector('[data-source-components]')?.getAttribute('data-source-components')).toContain('CreatedAssetResult');
 expect(doc.querySelector('.creation-complete')?.closest('[inert]')).not.toBeNull();
 expect(doc.body.textContent).toContain('Actual interface · Example data');
 expect(productScreenNames).toContain('created-asset');
});

it('shows the actual signed public result without asking for another PBI signature',()=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="signed-asset"/>),'text/html');
 const result=doc.querySelector('.creation-complete');
 expect(result?.textContent??'').toContain('Your Original is public on Receiz.');
 expect(result?.textContent).not.toContain('Sign');
 expect(result?.querySelector('a.primary-button')?.textContent).toContain('Open your asset');
 expect(result?.textContent).toContain('Save original proof');
 expect(productScreenNames).toContain('signed-asset');
});
