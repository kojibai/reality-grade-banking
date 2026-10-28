import type { SVGProps } from 'react';

/** Identity Record entry: a carried passport and its key. */
export function IdentityRecordIcon({ size = 24, strokeWidth = 1.6, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    <path d="M19 11V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4M7 2v20" />
    <circle cx="13" cy="7.5" r="1.8" />
    <path d="M9.8 14.5v-.8a3.2 3.2 0 0 1 6.4 0v.8" />
    <circle cx="18" cy="16" r="2.7" />
    <path d="m16 18-4 4h2v-2h2v-2" />
  </svg>;
}
