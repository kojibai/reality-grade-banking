import {clientWorkTemplates} from './client-work-templates.mjs';
import {clientWorkGuides,clientWorkExamples} from './client-work-guides.mjs';

const directory=kind=>({template:'templates',guide:'resources',example:'examples'})[kind];
const resources=[...clientWorkTemplates,...clientWorkGuides,...clientWorkExamples].map(page=>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)||!directory(page.kind))throw Error('CLIENT_WORK_RESOURCE_INVALID');
 return{...page,id:'resource-'+page.kind+'-'+page.slug,path:'/learn/'+directory(page.kind)+'/'+page.slug+'/'};
});
if(new Set(resources.map(page=>page.path)).size!==resources.length)throw Error('CLIENT_WORK_RESOURCE_DUPLICATE');
export const clientWorkPages=[
 {id:'client-work-resources',kind:'directory',path:'/learn/resources/',title:'Client work resources: templates, answers and examples',description:'Useful templates and practical answers for proposals, client feedback, invoices, scope changes and project handover. Read complete examples and keep the next step clear.',intro:'Start with the problem in front of you. Use a complete working template, find wording for a difficult client message, or follow a labeled example from brief to handover.',entries:resources},
 {id:'client-work-templates',kind:'directory',path:'/learn/templates/',title:'Client work templates with complete examples and text downloads',description:'Use original proposal, brief, invoice and handover templates for independent client work. Read the full template and download an editable plain-text starting point.',intro:'A useful template makes the missing decisions visible. Choose the task, adapt the complete working text, and compare it with a filled fictional example before sharing your own version.',entries:resources.filter(page=>page.kind==='template')},
 {id:'client-work-examples',kind:'directory',path:'/learn/examples/',title:'Client workflow examples from the brief to the handover',description:'Follow four fictional client engagements through the brief, scope, review, payment request and handover. See the decisions and working records that keep the next step clear.',intro:'See how the records fit together. These fictional scenarios show the questions, versions and explicit decisions behind an ordinary website, consulting, coaching or creative engagement.',entries:resources.filter(page=>page.kind==='example')},
 ...resources,
];
const shareLines=title=>{
 const words=title.split(/\s+/),lines=['','',''];let index=0;
 for(const word of words){if(lines[index]&&lines[index].length+word.length>27&&index<2)index++;lines[index]+=(lines[index]?' ':'')+word;}
 return lines.filter(Boolean);
};
export const clientWorkMetadata=clientWorkPages.map(page=>{
 const lines=shareLines(page.title);
 return{path:page.path,id:page.id,title:page.title+' | Bankeiz',description:page.description,lines,caption:'Client work. A clearer next step.',motif:'book',size:Math.max(28,Math.min(78,Math.floor(900/(Math.max(...lines.map(line=>line.length))*.56)))),resourceKind:page.kind};
});
