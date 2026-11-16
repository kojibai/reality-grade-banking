import type {BusinessDocumentDraft} from './business-document';
export type DocumentBranding=Readonly<{issuerName:string;issuerDetails:string;clientName:string;clientDetails:string}>;
export function readDocumentBranding(value:unknown,allowBlank=false):DocumentBranding{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!=='clientDetails|clientName|issuerDetails|issuerName')throw Error('DOCUMENT_BRANDING_INVALID');const v=value as Record<string,unknown>;
 for(const [key,max]of [['issuerName',160],['clientName',160],['issuerDetails',1200],['clientDetails',1200]] as const)if(typeof v[key]!=='string'||v[key].length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v[key]))throw Error('DOCUMENT_BRANDING_INVALID');
 if(!allowBlank&&!(v.issuerName as string).trim())throw Error('DOCUMENT_BRANDING_INVALID');return structuredClone(v) as DocumentBranding;
}
export const documentTemplateLabels={document:'Document',letter:'Letter',report:'Report',brief:'Project brief',plan:'Plan',statement:'Statement',agreement:'Agreement / contract'} as const;
export type DocumentTemplate=keyof typeof documentTemplateLabels;
export function documentTemplate(template:DocumentTemplate):BusinessDocumentDraft{
 const headings:Record<DocumentTemplate,string[]>={document:['Content'],letter:['Message'],report:['Overview','Findings','Next steps'],brief:['Purpose','Scope','Deliverables','Timeline'],plan:['Objective','Actions','Schedule'],statement:['Statement','Details'],agreement:['Parties and purpose','Scope and responsibilities','Dates and payment','Other terms']};
 if(!Object.hasOwn(headings,template))throw Error('DOCUMENT_TEMPLATE_INVALID');return{kind:template==='agreement'?'agreement':'document',title:documentTemplateLabels[template],summary:'',sections:headings[template].map(heading=>({heading,body:''})),tables:[]};
}
