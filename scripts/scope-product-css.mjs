import postcss from 'postcss';
import {build} from 'esbuild';

/** Resolve the actual local stylesheet closure before scoping preview rules.
 * Assets remain ordinary URLs; this build-only pass never loads their bytes. */
export async function bundleCssFiles(files){
 const bundled=await build({stdin:{contents:files.map(file=>`@import ${JSON.stringify('./'+file)};`).join('\n'),loader:'css',resolveDir:process.cwd()},bundle:true,write:false,logLevel:'silent',plugins:[{name:'external-css-assets',setup(builder){builder.onResolve({filter:/.*/},args=>args.kind==='url-token'?{path:args.path,external:true}:undefined);}}]});
 return bundled.outputFiles[0].text;
}

export function scopeProductCss(css){
 const root=postcss.parse(css),names=new Map();root.walkAtRules(/keyframes$/,rule=>{names.set(rule.params,'product-example-'+rule.params);rule.params='product-example-'+rule.params;});
 root.walkDecls(/^animation/,decl=>{for(const [from,to] of names)decl.value=decl.value.replace(new RegExp('(?<![\\w-])'+from+'(?![\\w-])','g'),to);});
 root.walkAtRules('media',rule=>{if(/^(?:\(m(?:in|ax)-width:[^)]+\))(?:\s+and\s+\(m(?:in|ax)-width:[^)]+\))*$/.test(rule.params)){rule.name='container';rule.params='product-screen '+rule.params;}});
 root.walkRules(rule=>{if(rule.parent?.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;rule.selectors=rule.selectors.map(s=>{if(s===':root'||s==='body'||s==='html')return '.product-screen';return '.product-screen '+s.replace(/^html[^ ]*\s*/, '');});});
 root.walkDecls(decl=>{decl.value=decl.value.replace(/100d?vh/g,'680px').replace(/(\d+(?:\.\d+)?)vw\b/g,'$1cqw');});return root.toString();
}
