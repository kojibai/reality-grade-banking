import {InlineOpening} from '../../components/InlineOpening';
export function TwinWorkspaceOpening({view,active=true}:{view:'settings'|'mind'|'work'|'embed';active?:boolean}){
 const labels={settings:'Preparing your Twin settings',mind:'Preparing your saved continuity',work:'Preparing your agent work',embed:'Preparing your website Twin'};
 return <InlineOpening label={labels[view]} active={active}/>;
}
