import {socialMetadata} from './public-page-metadata.mjs';
import {withAppAppearance} from './app-appearance.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};

export const analyticsMetadata = {
  path:'/analytics/', id:'analytics', title:'Analytics | Bankeiz',
  description:'Explore public network activity, witnessed hours, audience, profile rankings, assets and the history of each transaction.',
  lines:['Analytics','In the open.'], caption:'Market, ledger and activity.', motif:'valuation',
};

// The Observatory shares the mounted Ledger runtime and its one public seed.
export function observatoryPage(ledger, state) {
  const {path,title} = analyticsMetadata;
  const style = ledger.head.match(/<style data-public-page-style="ledger">[\s\S]*?<\/style>/)?.[0];
  if (!style) throw Error('OBSERVATORY_LEDGER_STYLES_REQUIRED');
  const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#0e293f">'
    + '<link rel="icon" href="/icon.svg">'+socialMetadata(analyticsMetadata,socialImages.images[path])+style;
  const {generation,locale,timeZone,directory}=JSON.parse(state.seedScript.slice(state.seedScript.indexOf('>')+1,-'</script>'.length));
  const {revision,publicProfileHeadsRevision,observedAt}=directory;
  const page = {...ledger, title, head, content:state.content, analyticsSeed:{generation,locale,timeZone,revision,publicProfileHeadsRevision,observedAt}};
  const document = '<!doctype html><html lang="en"><head>'+head+'<script type="module" src="'+ledger.entry+'"></script></head><body><div id="public-ledger-root" data-public-runtime="ledger">'+state.content+'</div>'+state.seedScript+'</body></html>';
  return {page, document:withAppAppearance(document)};
}
