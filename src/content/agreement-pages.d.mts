export type AgreementPage={agreementPage:'documents'|'signing';slug:string;path:string;title:string;description:string;heading:string;intro:string;supporting:string;lines:string[];caption:string;sections:unknown[]};
export const agreementPages:AgreementPage[];
export const agreementQuestions:Record<AgreementPage['agreementPage'],Array<[string,string]>>;
export const agreementSteps:Array<[string,string,string]>;
