import {docsOrigin,docsEdition,docsArticles,docsPaths} from './content.mjs';
const cell=text=>text.replace(/\|/g,'\\|').replace(/\n/g,' ');
const url=ref=>/^https:\/\//.test(ref)?ref:ref.startsWith('/examples/')?docsOrigin+ref:docsOrigin+'/'+ref+'/';
function blockMarkdown(block){switch(block.type){
 case 'paragraph':return block.text;
 case 'list':return block.items.map(x=>'- '+x).join('\n');
 case 'steps':return block.items.map(([title,text],i)=>`${i+1}. **${title}** — ${text}`).join('\n');
 case 'flow':return `**${block.caption}**\n\n`+block.items.map(([title,text],i)=>`${i+1}. ${title}: ${text}`).join('\n');
 case 'table':return `**${block.caption}**\n\n| ${block.columns.map(cell).join(' | ')} |\n| ${block.columns.map(()=>'---').join(' | ')} |\n`+block.rows.map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n');
 case 'note':return `> **${block.title}**\n>\n> ${block.text}`;
 case 'code':return '```'+block.language+'\n'+block.text+'\n```\n\n'+(block.caption??'');
 case 'links':return block.items.map(([label,href])=>`- [${label}](${url(href)})`).join('\n');
 default:throw Error('DOCS_BLOCK_UNKNOWN:'+block.type);
}}
export function docsMarkdown(page=null){
 if(!page)return '# Reality-grade banking documentation\n\nThe operating manual for the proof-native economy.\n\n'+docsPaths.map(path=>'## '+path.title+'\n\n'+path.summary+'\n\n'+path.slugs.map(slug=>{const p=docsArticles.find(p=>p.slug===slug);return `- [${p.title}](${docsOrigin}/${slug}/)`;}).join('\n')).join('\n\n')+'\n\n## All topics\n\n'+docsArticles.map(p=>`- [${p.title}](${docsOrigin}/${p.slug}/): ${p.summary}`).join('\n')+'\n';
 return '# '+page.title+'\n\n'+page.summary+`\n\nCanonical: ${docsOrigin}/${page.slug}/\nReviewed: ${docsEdition.reviewed}; coordinated packages ${docsEdition.packages}; ruleset ${docsEdition.ruleset}.\n\n`+page.sections.map(section=>'## '+section.title+'\n\n'+section.blocks.map(blockMarkdown).join('\n\n')).join('\n\n')+'\n\n## Implementation sources\n\n'+page.sources.map(([label,href])=>`- [${label}](${href})`).join('\n')+'\n\n## Related documentation\n\n'+page.related.map(slug=>{const p=docsArticles.find(p=>p.slug===slug);return `- [${p.title}](${docsOrigin}/${slug}/)`;}).join('\n')+'\n';
}
