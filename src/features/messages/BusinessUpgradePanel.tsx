import {ArrowRight} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import {TwinUpgradePanel} from './TwinUpgradePanel';
import './messages.css';

/** Explicit public purchase intent, composed after normal account entry. */
export function BusinessUpgradePanel({identity,onOpenAssistant,active=true}:{identity:OpenIdentity;onOpenAssistant():void;active?:boolean}){
 if(identity.knownTwinAccess?.()===true)return <div className="bank-twin-upgrade"><h3>Business is active.</h3><p>Bring the payment, cash-flow question or follow-up you want off your list. Keep the client, work and money records together, then prepare the next step for your review.</p><button className="primary-button" type="button" onClick={onOpenAssistant}>Open your agent<ArrowRight size={16}/></button></div>;
 return <TwinUpgradePanel identity={identity} initialReview onUpgraded={()=>{if(active&&location.pathname==='/')onOpenAssistant();}}/>;
}
