import {bankMarkPaths} from '../../branding/bank-mark.mjs';
/** The shared bank geometry, drawn in ink for the quiet header surface. */
export function BankMark(){
 return <svg viewBox="112 112 288 288" fill="currentColor" focusable="false" aria-hidden="true" dangerouslySetInnerHTML={{__html:bankMarkPaths}}/>;
}
