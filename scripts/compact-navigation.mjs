/** Carry identical page styles once. Heads expand only when their page is used;
 * the initial HTML and every destination keep their exact original CSS. */
export function compactNavigation(input) {
  // The existing styles table is a lossless shared-markup table. Both head
  // styles and repeated body fragments use the same references and decoder.
  const styles=[],indices=new Map();
  const intern=value=>{let index=indices.get(value);if(index===undefined){index=styles.length;indices.set(value,index);styles.push(value);}return index;};
  // Intern repeated HTML tokens at build time. Destinations remain exact;
  // the browser joins only a visited destination, never the whole catalog.
  const counts=new Map(),parts=value=>value.split(/(<[^>]+>)/g);
  for(const page of [...Object.values(input.pages),input.bank])if(typeof page.content==='string')for(const part of parts(page.content))if(part.length>=32)counts.set(part,(counts.get(part)??0)+1);
  const content=value=>{
    if(typeof value!=='string')return value;
    const result=[];let referenced=false;
    for(const part of parts(value)){
      if(counts.get(part)>1){result.push(intern(part));referenced=true;}
      else if(typeof result.at(-1)==='string')result[result.length-1]+=part;
      else result.push(part);
    }
    return referenced?result:value;
  };
  const head = value => {
    const parts = value.split(/(<style\b[^>]*>[\s\S]*?<\/style>)/gi);
    if (parts.length === 1) return value;
    return parts.map((part, index) => {
      if (index % 2 === 0) return part;
      return intern(part);
    });
  };
  const page = value => ({ ...value, head: head(value.head),...(typeof value.content==='string'?{content:content(value.content)}:{}) });
  const pages=Object.fromEntries(Object.entries(input.pages).map(([path,value])=>[path,page(value)])),bank=page(input.bank);
  return { ...input, pages, bank, styles };
}
