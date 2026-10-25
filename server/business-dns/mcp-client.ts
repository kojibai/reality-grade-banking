const namecheapTools=['domains_list','dns_records_get','dns_records_save'],porkbunTools=['ping','list_domains','list_dns_records','create_dns_record'];
const object=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('DNS_MCP_RESPONSE_INVALID');return value as Record<string,unknown>;};
/** Fixed official DNS endpoint only; no model-controlled URL, executable code,
 * credentials, arbitrary tools, write retries or provider error disclosures. */
export function createDnsMcpClient(input:{endpoint:string;token:string;request?:typeof fetch;assertOpen():void}){
 if(!['https://mcp.namecheap.com/mcp','https://mcp.porkbun.com/mcp/no-purchases'].includes(input.endpoint)||!input.token||input.token.length>64000)throw Error('DNS_MCP_CONNECTION_INVALID');
 const allowed=new Set(input.endpoint==='https://mcp.namecheap.com/mcp'?namecheapTools:porkbunTools);
 let session:string|undefined,protocol='2025-03-26',sequence=0,initialization:Promise<void>|undefined,toolsPromise:Promise<string[]>|undefined;
 async function rpc(method:string,params?:unknown){
  input.assertOpen();if(++sequence>160)throw Error('DNS_MCP_CAPACITY');const id=method.startsWith('notifications/')?undefined:sequence;
  const response=await(input.request??fetch)(input.endpoint,{method:'POST',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(25000),headers:{accept:'application/json, text/event-stream','content-type':'application/json',authorization:'Bearer '+input.token,'MCP-Protocol-Version':protocol,...(session?{'Mcp-Session-Id':session}:{})},body:JSON.stringify({jsonrpc:'2.0',...(id?{id}:{}),method,...(params?{params}:{})})});input.assertOpen();
  if(!response.ok||response.redirected)throw Error(response.status===401||response.status===403?'DNS_MCP_RECONNECT_REQUIRED':'DNS_MCP_RESULT_UNCONFIRMED');const next=response.headers.get('mcp-session-id');if(next){if(next.length>512||/[\r\n]/.test(next))throw Error('DNS_MCP_RESPONSE_INVALID');session=next;}
  if(!id){await response.body?.cancel();return{};}
  if(!response.body)throw Error('DNS_MCP_RESPONSE_INVALID');const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let raw='',size=0;
  try{for(;;){const part=await reader.read();input.assertOpen();if(part.done)break;size+=part.value.byteLength;if(size>2*1024*1024)throw Error('DNS_MCP_CAPACITY');raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  let data:Record<string,unknown>;
  if(response.headers.get('content-type')?.includes('text/event-stream')){const events=raw.replace(/\r\n/g,'\n').split('\n\n').map(block=>block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n')).filter(Boolean).map(text=>object(JSON.parse(text)));const found=events.filter(row=>row.id===id);if(found.length!==1)throw Error('DNS_MCP_RESPONSE_INVALID');data=found[0];}
  else data=object(JSON.parse(raw));
  if(data.jsonrpc!=='2.0'||data.id!==id||data.error)throw Error('DNS_MCP_TOOL_UNCONFIRMED');return object(data.result);
 }
 const initialize=()=>initialization??=(async()=>{const result=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'reality-grade-banking-dns',version:'1.0.0'}});if(typeof result.protocolVersion!=='string'||!/^202[5-6]-\d\d-\d\d$/.test(result.protocolVersion))throw Error('DNS_MCP_PROTOCOL_UNCONFIRMED');protocol=result.protocolVersion;await rpc('notifications/initialized');})();
 const tools=()=>toolsPromise??=(async()=>{await initialize();const names:string[]=[];let cursor:string|undefined;const seen=new Set<string>();for(let page=0;page<10;page++){const result=await rpc('tools/list',cursor?{cursor}:{});if(result.isError||!Array.isArray(result.tools)||result.tools.length>256)throw Error('DNS_MCP_TOOL_UNCONFIRMED');for(const raw of result.tools){const row=object(raw);if(typeof row.name!=='string')throw Error('DNS_MCP_RESPONSE_INVALID');if(allowed.has(row.name))names.push(row.name);}if(result.nextCursor===undefined)return [...new Set(names)];if(typeof result.nextCursor!=='string'||seen.has(result.nextCursor)||result.nextCursor.length>2048)throw Error('DNS_MCP_RESPONSE_INVALID');seen.add(result.nextCursor);cursor=result.nextCursor;}throw Error('DNS_MCP_CAPACITY');})();
 return Object.freeze({tools,async call(name:string,args:Record<string,unknown>){
  if(!allowed.has(name))throw Error('DNS_MCP_TOOL_FORBIDDEN');if(!(await tools()).includes(name))throw Error('DNS_MCP_RECONNECT_REQUIRED');
  const result=await rpc('tools/call',{name,arguments:args});if(result.isError)throw Error('DNS_MCP_TOOL_UNCONFIRMED');if(result.structuredContent)return object(result.structuredContent);
  if(!Array.isArray(result.content)||result.content.length!==1)throw Error('DNS_MCP_RESPONSE_INVALID');const content=object(result.content[0]);if(content.type!=='text'||typeof content.text!=='string')throw Error('DNS_MCP_RESPONSE_INVALID');return object(JSON.parse(content.text));
 },async close(){if(!session)return;const held=session;session=undefined;await(input.request??fetch)(input.endpoint,{method:'DELETE',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+input.token,'Mcp-Session-Id':held,'MCP-Protocol-Version':protocol}}).then(response=>response.body?.cancel()).catch(()=>{});}});
}
