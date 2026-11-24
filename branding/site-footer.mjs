import {createElement as h} from 'react';
import packageMetadata from '../package.json' with {type:'json'};
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {branding} from './profile.mjs';
const source='https://github.com/kojibai/reality-grade-banking';
const sourceLink=['Open source',source];
const releaseTag='v'+packageMetadata.version;
export const footerGroups=[
 {title:'For you',links:[['People & families','/for/people/'],['Businesses','/for/businesses/'],['Independent work','/for/independent-work/'],['Creators','/for/creators/'],['Communities','/for/communities/'],['Institutions','/for/institutions/'],['Public finance','/for/public-finance/'],['Platforms & developers','/for/platforms/']]},
 {title:'Banking',links:[['Your account','/'],['See banking in action','/banking/'],['User guide','/guide/'],['Find your fit','/fit/'],['Cooperative economy','/coops/'],['Governance','/vote/'],['Your Vaults','/vaults/'],['Protect your value','/protect/'],['Payment fraud','/fraud/'],['Recover your identity','/recover/'],['Begin with your source','/start/'],['Banking explained','/learn/'],['Payments','/learn/payments/'],['Get paid','/get-paid/'],['Your Counter','/merchant/'],['Payment requests','/learn/payment-requests/'],['Receiving options','/receiving/'],['Deposits','/deposit/'],['Notes','/learn/notes/'],['Offline banking','/learn/offline-banking/'],['Outage preparation','/learn/banking-outage/'],['Your agent','/agent/'],['Messages & agent','/learn/messages/'],['Your email','/email/'],['Your Twin','/your-twin/'],['Calendar & appointments','/book/'],['Meetings','/meet/'],['Business in action','/action/'],['Receiz ID','/learn/receiz-id/'],['Identity continuity','/id/']]},
 {title:'Assets',links:[['Explore assets','/explore/'],['Open the proof','/proof/'],['Your moments, your value','/moments/'],['Proof objects & ownership','/learn/proof-objects/'],['Digital Matter','/matter/'],['Create an asset','/learn/creating-an-asset/'],['Ownership','/learn/ownership/'],['Fractional ownership','/learn/fractional-ownership/'],['Physical assets','/learn/physical-assets/'],['Rights & backing','/learn/asset-rights-and-backing/'],['Crypto holdings','/crypto/'],['NFTs & collections','/nfts/'],['Music & audio','/explore/music/'],['Images & photography','/explore/images/'],['Videos & film','/explore/videos/'],['Books & publishing','/explore/books/'],['Essays & research','/explore/essays/'],['Recorded moments','/explore/moments/'],['Collectibles','/explore/collectibles/'],['Documents','/explore/documents/']]},
 {title:'Markets',links:[['The existing economy','/economy/'],['Asset market','/market/'],['Buying ownership','/market/buy/'],['Selling a position','/market/sell/'],['Prices & valuations','/market/value/'],['Ownership & rights','/market/ownership/'],['Costs & liquidity','/market/costs/'],['Trade records','/market/history/'],['Accept payments','/accept-payments/'],['Together','/together/'],['Global Market Cap','/market-cap/'],['How value works','/learn/how-value-works/'],['Settlement & Reserve','/learn/reserve-and-settlement/'],['Circulation & listings','/learn/circulation/'],['Value over time','/learn/price-history/']]},
 {title:'History',links:[['Analytics','/analytics/'],['Public Ledger','/ledger/'],['Transaction receipts','/learn/receipts/'],['Source of funds','/learn/source-of-funds/'],['Memory Crystals','/learn/memory-crystals/'],['Time & ordering','/learn/time-and-ordering/'],['Account verification','/verify/']]},
 {title:'Standards & technology',links:[['Build your own bank','/build/'],['Accept the money','/accept/'],['Proof-native economy','/learn/proof-native-economy/'],['Trust & authority','/trust/'],['Value & its source','/money/'],['The standard in practice','/in-practice/'],['About the standard','/about/'],['Documentation','/docs/'],['Proof-native standards','/standards/'],['Conformance','/conformance/'],['Conformance register','/registry/'],['Institution integration','/institutions/'],['Developer reference','/developers/'],['SDK schemas & reference','/schemas/'],['Security & authority','/learn/security/'],['Releases & qualification','/releases/']]}
];
export const footerNotices=[['Client work resources','/learn/resources/'],['Help','/help/'],['Costs','/fees/'],['Privacy','/privacy/'],['Use & responsibilities','/terms/'],['All guides','/learn/guides/'],['Questions','/learn/questions/'],['Glossary','/learn/glossary/'],['Account access','/learn/account-access/'],['Signing key','/learn/signing-key/'],['License & notices','/legal/'],sourceLink];
const themeIcon={width:17,height:17,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round','aria-hidden':true};
function footerThemeControl(){
 return h('button',{type:'button',className:'site-footer-theme','data-bank-theme-toggle':'','aria-label':'Change color mode',title:'Change color mode'},
  h('svg',{...themeIcon,className:'site-footer-theme-sun'},h('circle',{cx:12,cy:12,r:4}),h('path',{d:'M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41m0-14.14-1.41 1.41M6.34 17.66l-1.41 1.41'})),
  h('svg',{...themeIcon,className:'site-footer-theme-moon',strokeLinejoin:'round'},h('path',{d:'M20.95 13.35A9 9 0 0 1 10.65 3.05a9 9 0 1 0 10.3 10.3Z'})));
}
/** One static semantic footer shared by built pages and React surfaces. */
export function siteFooter(currentPath,{learningControls=false}={}){
 const path=canonicalPublicPath(currentPath??''),same=url=>!!currentPath&&url.startsWith('/')&&canonicalPublicPath(url)===(path==='/explorer/'?'/explore/':path);
 const link=([label,url])=>h('a',{key:url,href:url},label);
 return h('footer',{className:'site-footer'},
  h('div',{className:'site-footer-main'},
   h('div',{className:'site-footer-identity'},h(same('/')?'span':'a',{className:'site-footer-brand',...(same('/')?{}:{href:'/'}), 'aria-label':branding.applicationName+' home'},h('img',{src:'/icon.svg',width:30,height:30,alt:'',loading:'lazy'}),branding.wordmark),h('p',null,'Proof-native economy.',h('br'),'Reality-grade banking.',h('br'),'Reality-grade infrastructure.')),
   ...footerGroups.map(group=>h('nav',{key:group.title,className:group.title==='For you'?'site-footer-audiences':undefined,'aria-label':group.title+' footer links'},h('h2',null,group.title),h('ul',null,...group.links.filter(([,url])=>!same(url)).map(([label,url])=>h('li',{key:url},h('a',{href:url},label))))))),
  h('div',{className:'site-footer-base'},h('span',null,'Bankeiz · ',same('/learn/reality-grade-banking/')?'Reality-Grade Banking':h('a',{href:'/learn/reality-grade-banking/'},'Reality-Grade Banking')),learningControls?footerThemeControl():null,
   h('nav',{'aria-label':'Policies and source'},
    ...footerNotices.filter(([,url])=>url!==source&&!same(url)).map(link),
    learningControls?h('span',{className:'site-footer-project'},link(sourceLink),
     h('a',{className:'site-footer-release',href:source+'/releases/tag/'+releaseTag,'aria-label':'Bankeiz '+releaseTag+' release on GitHub'},releaseTag)):link(sourceLink))));
}
