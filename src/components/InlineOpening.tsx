import './inline-opening.css';

/** An inline resource indicator. It never covers retained content or adds a wait. */
export function InlineOpening({label='Preparing this view',active=true,compact=false}:{label?:string;active?:boolean;compact?:boolean}){
 return <span className={compact?'inline-opening is-compact':'inline-opening'} role="status" aria-label={label} data-active={active}><span className="inline-opening-trace" aria-hidden="true"><i/><i/><i/></span></span>;
}
