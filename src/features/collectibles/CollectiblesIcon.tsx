import type {SVGProps} from 'react';

/** A small display of originals: three upright cards, rather than data layers. */
export function CollectiblesIcon({size=20,strokeWidth=1.5,...props}:SVGProps<SVGSVGElement>&{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
  <rect x="1.5" y="6" width="5.5" height="13" rx="1.2"/>
  <rect x="8.75" y="4" width="6.5" height="16" rx="1.3"/>
  <rect x="17" y="6" width="5.5" height="13" rx="1.2"/>
  <path d="m12 9 1.5 2-1.5 2-1.5-2Z"/>
 </svg>;
}
