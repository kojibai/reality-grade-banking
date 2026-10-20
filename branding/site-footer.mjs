import {createElement as h} from 'react';
import {branding} from './profile.mjs';
const source='https://github.com/kojibai/reality-grade-banking';
export const footerGroups=[
 {title:'Banking',links:[['Your account','/'],['Payments','/learn/payments/'],['Payment requests','/learn/payment-requests/'],['Deposits','/learn/deposits/'],['Notes','/learn/notes/'],['Messages & Twin','/learn/messages/'],['Receiz ID','/learn/receiz-id/']]},
 {title:'Assets',links:[['Explore assets','/explore/'],['Proof objects & ownership','/learn/proof-objects/'],['Create an asset','/learn/creating-an-asset/'],['Ownership','/learn/ownership/'],['Fractional ownership','/learn/fractional-ownership/'],['Physical assets','/learn/physical-assets/'],['Rights & backing','/learn/asset-rights-and-backing/']]},
 {title:'Markets',links:[['Proof-native economy','/learn/proof-native-economy/'],['Global Market Cap','/market-cap/'],['How value works','/learn/how-value-works/'],['Settlement & Reserve','/learn/reserve-and-settlement/'],['Circulation & listings','/learn/circulation/'],['Value over time','/learn/price-history/']]},
 {title:'History',links:[['Public Ledger','/ledger/'],['Transaction receipts','/learn/receipts/'],['Source of funds','/learn/source-of-funds/'],['Memory Crystals','/learn/memory-crystals/'],['Time & ordering','/learn/time-and-ordering/'],['Account verification','/verify/']]},
 {title:'Standards & technology',links:[['Proof-native standards','/standards/'],['Conformance','/conformance/'],['For institutions','/institutions/'],['For developers','/developers/'],['SDK schemas & reference','/schemas/'],['Security & authority','/learn/security/'],['Releases & qualification','/releases/']]}
];
export const footerNotices=[['All guides','/learn/'],['Reality-Grade Banking','/learn/reality-grade-banking/'],['Questions','/learn/questions/'],['Glossary','/learn/glossary/'],['Account access','/learn/account-access/'],['Signing key','/learn/signing-key/'],['License & notices','/legal/'],['Open source',source]];
/** One static semantic footer shared by built pages and React surfaces. */
export function siteFooter(){
 return h('footer',{className:'site-footer'},
  h('div',{className:'site-footer-main'},
   h('div',{className:'site-footer-identity'},h('a',{className:'site-footer-brand',href:'/', 'aria-label':branding.applicationName+' home'},h('img',{src:'/icon.svg',width:30,height:30,alt:'',loading:'lazy'}),branding.wordmark),h('p',null,'Proof-native value.',h('br'),'Verifiable ownership.',h('br'),'Continuous history.')),
   ...footerGroups.map(group=>h('nav',{key:group.title,'aria-label':group.title+' footer links'},h('h2',null,group.title),h('ul',null,...group.links.map(([label,url])=>h('li',{key:url},h('a',{href:url},label))))))),
  h('div',{className:'site-footer-base'},h('span',null,'Bankeiz · Reality-Grade Banking'),h('nav',{'aria-label':'Policies and source'},...footerNotices.map(([label,url])=>h('a',{key:url,href:url},label)))));
}
