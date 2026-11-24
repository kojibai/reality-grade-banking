import {useSyncExternalStore} from 'react';
import {ChevronDown, SunMoon} from 'lucide-react';
import {readAppAppearance,setAppAppearance,subscribeAppAppearance,type AppAppearance} from '../../core/app-appearance.mjs';
import './appearance-settings.css';

const choices = [
 {mode:'system',label:'System'},
 {mode:'light',label:'Light'},
 {mode:'dark',label:'Dark'},
] as const;
const initialAppearance=():AppAppearance=>'system';

export function AppearanceSettings(){
 const active=useSyncExternalStore(subscribeAppAppearance,readAppAppearance,initialAppearance);
 return <details className="account-appearance">
  <summary>
   <span className="account-appearance-icon"><SunMoon size={19} strokeWidth={1.65} aria-hidden="true"/></span>
   <strong>Appearance</strong>
   <span>{choices.find(choice=>choice.mode===active)?.label}</span>
   <ChevronDown size={15} aria-hidden="true"/>
  </summary>
  <div className="account-appearance-choices" role="group" aria-label="Appearance">
   {choices.map(({mode,label})=><button key={mode} type="button" aria-pressed={mode===active} onClick={()=>setAppAppearance(mode)}>{label}</button>)}
  </div>
 </details>;
}
