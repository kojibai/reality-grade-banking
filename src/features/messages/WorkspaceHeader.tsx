import {ArrowLeft,Boxes,MessagesSquare,Sparkles} from 'lucide-react';
export type RelationshipWorkspaceTab='twin'|'work'|'context';
export function WorkspaceHeader({title,tab,onTab,onBack}:{title:string;tab:RelationshipWorkspaceTab;onTab(tab:RelationshipWorkspaceTab):void;onBack():void}){
 return <header className="bank-relationship-header"><div><button type="button" aria-label="Back to main thread" title="Back to main thread" onClick={onBack}><ArrowLeft size={17}/></button><span><strong>{title}</strong><small>Relationship workspace</small></span></div><nav aria-label="Relationship workspace views">{([['twin','Twin',Sparkles],['work','Work',Boxes],['context','Context',MessagesSquare]] as const).map(([key,label,Icon])=><button key={key} type="button" aria-current={tab===key?'page':undefined} onClick={()=>onTab(key)}><Icon size={15}/>{label}</button>)}</nav></header>;
}
