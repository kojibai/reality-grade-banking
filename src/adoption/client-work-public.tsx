import {createElement} from 'react';
import {hydrateRoot,type Root} from 'react-dom/client';
import {ClientWorkDemo,type ClientWorkDemoProps} from '../presentation/ClientWorkDemo';

const roots=new Map<HTMLElement,Root>();
export function init(){
 for(const [element,root] of roots)if(!element.isConnected){root.unmount();roots.delete(element);}
 for(const element of document.querySelectorAll<HTMLElement>('[data-client-work-root]')){
  if(roots.has(element))continue;
  const props=JSON.parse(element.dataset.clientWorkProps??'null') as ClientWorkDemoProps|null;
  if(!props?.idPrefix)continue;
  roots.set(element,hydrateRoot(element,createElement(ClientWorkDemo,props),{identifierPrefix:props.idPrefix+'-'}));
 }
}
addEventListener('receiz-learn:page',init);
init();
