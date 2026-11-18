// The Observatory shares the mounted Ledger runtime and its one public seed.
export function observatoryPage(ledger, state) {
  const title = 'Observatory | Bankeiz';
  const description = 'Explore public network activity, witnessed hours, audience, profile rankings, assets and the history of each transaction.';
  const url = 'https://bankeiz.com/observatory/';
  const style = ledger.head.match(/<style data-public-page-style="ledger">[\s\S]*?<\/style>/)?.[0];
  if (!style) throw Error('OBSERVATORY_LEDGER_STYLES_REQUIRED');
  const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0e293f">'
    + '<title>'+title+'</title><meta name="description" content="'+description+'"><link rel="canonical" href="'+url+'"><link rel="icon" href="/icon.svg">'
    + '<meta property="og:type" content="website"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+description+'"><meta property="og:url" content="'+url+'">'+style;
  // Other pages carry the ready first viewport. The direct Observatory document
  // carries every table and chart; both attach the same retained Ledger reader.
  const detailStart = state.content.indexOf('<section class="obs-details obs-inner">');
  const mainEnd = state.content.lastIndexOf('</main>');
  if (detailStart < 0 || mainEnd <= detailStart) throw Error('OBSERVATORY_FIRST_FRAME_REQUIRED');
  const content = state.content.slice(0, detailStart) + state.content.slice(mainEnd);
  const page = {...ledger, title, head, content};
  const document = '<!doctype html><html lang="en"><head>'+head+'<script type="module" src="'+ledger.entry+'"></script></head><body><div id="public-ledger-root" data-public-runtime="ledger">'+state.content+'</div>'+state.seedScript+'</body></html>';
  return {page, document};
}
