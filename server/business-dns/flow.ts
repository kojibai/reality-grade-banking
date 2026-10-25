import {createBusinessDnsTools} from '../../src/receiz/business-dns-tools.js';
import type {BusinessSetupResult,BusinessToolName} from '../../src/receiz/business-setup.js';
import type {BusinessDnsProviderId,createDnsConnectionSetup} from '../business-dns-providers.js';

/** Prepared headless flow for the existing chat. It returns a real Connect
 * action only when needed, keeps the saved hostname across provider approval,
 * and resumes the actual tools without DNS forms or repeated information.
 * Rendering and callback delivery remain in the deferred message integration. */
export function createBusinessDnsSetupFlow(input:{accountUid:string;hostname:string;provider:BusinessDnsProviderId;connections:ReturnType<typeof createDnsConnectionSetup>;execute(tool:BusinessToolName,args:Record<string,unknown>):Promise<BusinessSetupResult>;assertOpen():void}){
 let observedHostname=input.hostname;
 const tools=createBusinessDnsTools({accountUid:input.accountUid,execute:input.execute,assertOpen:input.assertOpen,connection:async hostname=>{
  observedHostname=hostname;if(hostname!==input.hostname)throw Error('BUSINESS_DNS_HOSTNAME_CHANGED');return input.connections.connection(input.provider);
 }});
 const changed=()=>({status:'domain_changed' as const,hostname:observedHostname,previousHostname:input.hostname});
 async function inspect(){input.assertOpen();const view=await tools.instructions();input.assertOpen();observedHostname=view.hostname;return view;}
 async function perform(){try{return await tools.configure('automatic');}catch(error){input.assertOpen();if(error instanceof Error&&error.message==='BUSINESS_DNS_HOSTNAME_CHANGED')return changed();throw error;}}
 // Repeated callback delivery reuses this invocation's real result, including
 // unknown outcomes. A new explicit request needs a new retained flow.
 let operation:ReturnType<typeof perform>|undefined;
 const configure=()=>operation??=perform();
 async function retained(){const result=await operation!;input.assertOpen();return result;}
 return Object.freeze({
  async start(mode:'automatic'|'manual'){
   input.assertOpen();if(operation)return retained();if(!['automatic','manual'].includes(mode))throw Error('BUSINESS_DNS_INPUT_INVALID');const view=await inspect();if(view.hostname!==input.hostname)return changed();if(mode==='manual')return view;
   const connection=await input.connections.connect(input.provider);input.assertOpen();if(connection.status==='connect')return connection;if(connection.status==='manual')return view;return configure();
  },
  async resume(options:{declined?:boolean}={}){
   input.assertOpen();if(operation)return retained();
   const view=await inspect();if(view.hostname!==input.hostname)return changed();if(options.declined===true)return view;
   const connection=await input.connections.connection(input.provider);input.assertOpen();if(!connection)return{status:'awaiting-connection' as const,provider:input.provider};if(!connection.canWrite)return view;return configure();
  },
 });
}
