import type {ProposalDraft} from '../receiz/chat-proposal';
import type {BusinessDocumentDraft} from '../receiz/business-document';
export type ClientWorkScenario={
 id:string;title:string;brief:string;
 owner:{name:string;role?:string};client:{name:string;company?:string;initials?:string};
 suggestedReply:string;scriptedTwinReply:string;
 proposal:ProposalDraft;invoice:ProposalDraft;document:BusinessDocumentDraft;agreement:BusinessDocumentDraft;
 delivery:{title:string;body:string};followup:{title:string;body:string};resources:{label:string;href:string}[];
};
export const clientWorkScenarios:ClientWorkScenario[];
export function clientWorkScenario(id?:string):ClientWorkScenario;
