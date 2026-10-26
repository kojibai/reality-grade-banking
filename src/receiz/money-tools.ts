export const moneyToolNames=['money_find_person','money_search_history','money_list_commitments','money_record_commitment','money_cancel_commitment','money_report_completed','money_prepare_request','money_check_payments','money_review_message','money_send_reviewed'] as const;
export type MoneyAction={tool:string;args:Record<string,unknown>};
const fields:Record<typeof moneyToolNames[number],readonly string[]>={money_find_person:['query'],money_search_history:['query','from','to','direction','offset','limit'],money_list_commitments:['direction','dueBefore','query','includeClosed','offset','limit'],money_record_commitment:['title','direction','counterparty','amountUsdCents','dueAt','note'],money_cancel_commitment:['id'],money_report_completed:['id'],money_prepare_request:['id','amountUsdCents'],money_check_payments:[],money_review_message:['id','username','message'],money_send_reviewed:['reviewId']};
export function parseMoneyAction(value:unknown):MoneyAction{
 const v=value as MoneyAction;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='args,tool'||!moneyToolNames.includes(v.tool as typeof moneyToolNames[number])||!v.args||typeof v.args!=='object'||Array.isArray(v.args)||![Object.prototype,null].includes(Object.getPrototypeOf(v.args))||Object.keys(v.args).some(key=>!fields[v.tool as typeof moneyToolNames[number]].includes(key))||Object.values(v.args).some(child=>child!==null&&typeof child==='object')||JSON.stringify(v.args).length>6000)throw Error('MONEY_ACTION_INVALID');
 return structuredClone(v);
}

export function moneyActionFingerprint(action:MoneyAction){return JSON.stringify({tool:action.tool,args:Object.fromEntries(Object.entries(action.args).sort(([a],[b])=>a.localeCompare(b)))});}
