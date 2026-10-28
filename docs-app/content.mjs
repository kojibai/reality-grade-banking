// One canonical, dependency-free authored manual for standalone and mirrored docs.
import foundations from './articles/foundations.mjs';
import identity from './articles/identity.mjs';
import money from './articles/money.mjs';
import assets from './articles/assets.mjs';
import proof from './articles/proof.mjs';
import developers from './articles/developers.mjs';
import people from './articles/people.mjs';
import business from './articles/business.mjs';
import certificates from './articles/certificates.mjs';
export {docsOrigin,docsEdition,articleText} from './articles/shared.mjs';
export const docsGroups=['Start','Money','Identity & protection','Notes & offline','Assets & market','People & meetings','Proof & records','Agents','Build','Reference'];
export const docsArticles=[...foundations,...money,...identity,...assets,...proof,...people,...business,...certificates,...developers].sort((a,b)=>docsGroups.indexOf(a.group)-docsGroups.indexOf(b.group));
export const docsPaths=[
 {title:'Send, receive and add money',summary:'Complete the familiar money task, then inspect its actual result.',slugs:['getting-started','payments','receiving','funding','records','recovery','fees']},
 {title:'Create, own and exchange',summary:'Seal and sign an Original, move ownership, use shares and inspect the outcome.',slugs:['assets','publication','backing','ownership','market-trading','market-records','certificates','market-value']},
 {title:'Talk, plan and meet',summary:'Keep people, conversations, booking, meetings and their records together.',slugs:['messages','contacts','calendar-booking','meetings']},
 {title:'Put Business to work',summary:'Ask your agent, configure its work, connect the business and fund usage.',slugs:['agents','twin-workspace','business-setup','credits','agent-continuity']},
 {title:'Protect and carry value',summary:'Keep the original identity, separate Vault custody, Notes and recovery.',slugs:['identity','backup','vaults','notes','offline','security','permissions','disclosure']},
 {title:'Understand, build and verify',summary:'Explore the sources, causal records, units, receiving laws and independent assessment.',slugs:['concepts','trust','reserve-settlement','verification','infrastructure','sdk','mcp','ai-skills','integrations','merchant-checkout','conformance','compatibility','glossary']},
];
