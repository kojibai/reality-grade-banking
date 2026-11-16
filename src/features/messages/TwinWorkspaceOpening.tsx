import {BankMark} from '../../components/BankMark';
import './twin-presence.css';
/** Only genuinely missing Twin resources use this nonblocking presence. */
export function TwinWorkspaceOpening({view,active=true}:{view:'settings'|'mind'|'work'|'embed';active?:boolean}){
 const labels={settings:'Opening your Twin settings',mind:'Opening your saved continuity',work:'Opening your agent work',embed:'Opening your website Twin'};
 return <div className="bank-twin-presence" role="status" aria-label={labels[view]} data-active={active}><span className="bank-twin-presence-mark" aria-hidden="true"><BankMark/><i/></span><span>{labels[view]}<small>Your workspace stays right here.</small></span></div>;
}
