// One canonical, dependency-free authored manual for standalone and mirrored docs.
import foundations from './articles/foundations.mjs';
import identity from './articles/identity.mjs';
import money from './articles/money.mjs';
import assets from './articles/assets.mjs';
import proof from './articles/proof.mjs';
import developers from './articles/developers.mjs';
export {docsOrigin,docsEdition,articleText} from './articles/shared.mjs';
export const docsGroups=['Start','Money','Identity & protection','Notes & offline','Assets & market','Proof & records','Agents','Build','Reference'];
export const docsArticles=[...foundations,...money,...identity,...assets,...proof,...developers].sort((a,b)=>docsGroups.indexOf(a.group)-docsGroups.indexOf(b.group));
export const docsPaths=[
 {title:'Use your account',summary:'Identity, funding, payments and the resulting record.',slugs:['getting-started','reserve-settlement','funding','payments','records']},
 {title:'Protect and carry value',summary:'Private originals, Vaults, Notes and exact recovery.',slugs:['trust','identity','vaults','backup','notes','offline','recovery']},
 {title:'Create and exchange',summary:'Authored source, actual backing, ownership and market results.',slugs:['assets','backing','publication','ownership','market-trading','market-records']},
 {title:'Build and verify',summary:'Runnable tooling, integrations and independent assessment.',slugs:['sdk','mcp','ai-skills','integrations','merchant-checkout','conformance']},
];
