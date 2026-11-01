export const paymentGuidePage: {paymentGuide:boolean;slug:string;path:string;title:string;description:string;lines:string[];caption:string;intro:string;sections:unknown[]};
export function inertPaymentPreview(html:string):string;
export function renderPaymentExamples():Promise<{screens:Record<string,string>;css:string}>;
export function paymentGuideContent(preview:{screens:Record<string,string>;css:string}):string;
