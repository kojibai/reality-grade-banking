import {publicPage,applyPublicMetadata,publicEntryFallback} from './public-page-metadata.mjs';
import manifest from '../public/social/manifest.json' with {type:'json'};
export function publicMetadataPlugin(){return {name:'bankeiz-public-metadata',transformIndexHtml(html,context){const page=publicPage(context.path);if(!page)return html;return applyPublicMetadata(html,page,manifest.images[page.path]).replace('<div id="root"></div>',`<div id="root">${publicEntryFallback(page.path)}</div>`);}};}
