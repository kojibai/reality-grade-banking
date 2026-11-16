import {InlineOpening} from '../../components/InlineOpening';
import './twin-presence.css';
/** A flush edge trace; the mark and its geometry never rotate or resize. */
export function TwinPresenceLight(){return <svg className="bank-twin-presence-light" viewBox="0 0 46 46" preserveAspectRatio="none" aria-hidden="true"><rect x=".5" y=".5" width="45" height="45" rx="14" pathLength="100"/></svg>;}
/** Only genuinely missing Twin resources use this nonblocking presence. */
export function TwinWorkspaceOpening({view,active=true}:{view:'settings'|'mind'|'work'|'embed';active?:boolean}){
 const labels={settings:'Opening your Twin settings',mind:'Opening your saved continuity',work:'Opening your agent work',embed:'Opening your website Twin'};
 return <InlineOpening label={labels[view]} active={active}/>;
}
