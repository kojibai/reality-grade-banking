import {createElement as h} from 'react';
import {branding} from './profile.mjs';
const source='https://github.com/kojibai/reality-grade-banking';
export const footerGroups=[
 {title:'Bank',links:[['Your account','/'],['Explore assets','/explore/'],['Public ledger','/ledger/']]},
 {title:'Understand',links:[['Reality-Grade Banking','/learn/reality-grade-banking/'],['How value works','/learn/how-value-works/'],['Settlement & Reserve','/learn/reserve-and-settlement/'],['Your identity','/learn/receiz-id/']]},
 {title:'Standards & technology',links:[['Account verification','/verify/'],['Conformance','/conformance/'],['SDK reference','/schemas/'],['For institutions',source+'/tree/main/institution']]}
];
export const footerNotices=[['Account access & privacy','/learn/account-access/'],['Your signing key','/learn/signing-key/'],['License & notices','/legal/'],['Open source',source]];
/** One static semantic footer shared by built pages and React surfaces. */
export function siteFooter(){
 return h('footer',{className:'site-footer'},
  h('div',{className:'site-footer-main'},
   h('div',{className:'site-footer-identity'},h('a',{className:'site-footer-brand',href:'/', 'aria-label':branding.applicationName+' home'},h('img',{src:'/icon.svg',width:30,height:30,alt:'',loading:'lazy'}),branding.wordmark),h('p',null,'Proof-native value.',h('br'),'Verifiable ownership.',h('br'),'Continuous history.')),
   ...footerGroups.map(group=>h('nav',{key:group.title,'aria-label':group.title+' footer links'},h('h2',null,group.title),h('ul',null,...group.links.map(([label,url])=>h('li',{key:url},h('a',{href:url},label))))))),
  h('div',{className:'site-footer-base'},h('span',null,'Bankeiz · Reality-Grade Banking'),h('nav',{'aria-label':'Policies and source'},...footerNotices.map(([label,url])=>h('a',{key:url,href:url},label)))));
}
