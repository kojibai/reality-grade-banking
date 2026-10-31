import postcss from 'postcss';
export function scopeProductCss(css){
 const root=postcss.parse(css),names=new Map();root.walkAtRules(/keyframes$/,rule=>{names.set(rule.params,'product-example-'+rule.params);rule.params='product-example-'+rule.params;});
 root.walkDecls(/^animation/,decl=>{for(const [from,to] of names)decl.value=decl.value.replace(new RegExp('(?<![\\w-])'+from+'(?![\\w-])','g'),to);});
 root.walkAtRules('media',rule=>{if(/^(?:\(m(?:in|ax)-width:[^)]+\))(?:\s+and\s+\(m(?:in|ax)-width:[^)]+\))*$/.test(rule.params)){rule.name='container';rule.params='product-screen '+rule.params;}});
 root.walkRules(rule=>{if(rule.parent?.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;rule.selectors=rule.selectors.map(s=>{if(s===':root'||s==='body'||s==='html')return '.product-screen';return '.product-screen '+s.replace(/^html[^ ]*\s*/, '');});});
 root.walkDecls(decl=>{decl.value=decl.value.replace(/100d?vh/g,'680px').replace(/(\d+(?:\.\d+)?)vw\b/g,'$1cqw');});return root.toString();
}
