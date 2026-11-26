/** Carry identical page styles once. Heads expand only when their page is used;
 * the initial HTML and every destination keep their exact original CSS. */
export function compactNavigation(input, {installedAppearance} = {}) {
  if (installedAppearance) {
    const retainedPage = page => ({...page, head:page.head.replace(installedAppearance,'')});
    const bank = retainedPage(input.bank);
    // Retained navigation already imports bank.entry and installs bank.css.
    // Its head only needs the metadata and styles restored by the router.
    bank.head = bank.head
      .replace(/[ \t\r\n]*<link rel="(?:modulepreload|stylesheet)"[^>]*>/g,'')
      .replace(/[ \t\r\n]*<script type="module"[^>]*>[\s\S]*?<\/script>/g,'')
      .replace(/<style id="bankeiz-opening-critical">[\s\S]*?<\/style>/g,'');
    input = {
      ...input,
      pages:Object.fromEntries(Object.entries(input.pages).map(([path,page])=>[path,retainedPage(page)])),
      bank,
    };
  }

  // The existing styles table is a lossless shared-markup table. Both head
  // styles and repeated body fragments use the same references and decoder.
  const styles=[],indices=new Map();
  const intern=value=>{let index=indices.get(value);if(index===undefined){index=styles.length;indices.set(value,index);styles.push(value);}return index;};
  // Intern repeated markup and structured-head spans at build time. Destinations remain exact;
  // the browser joins only a visited destination, never the whole catalog.
  // Preserve complete carried JSON (including authored text) as one exact span.
  // Keep repeated source-link prefixes together instead of repeating their attributes.
  const counts=new Map(),parts=value=>value.split(/(<script\b[^>]*\btype\s*=\s*["\']application\/json["\'][^>]*>[\s\S]*?<\/script>|<(?:link|script)\b[^>]*?\b(?:href|src)\s*=\s*["\'])/gi).flatMap((part,index)=>index%2?[part]:part.split(/([{},"<>])/g));
  for(const page of [...Object.values(input.pages),input.bank])for(const value of [page.content,page.head])if(typeof value==='string')for(const part of parts(value))if(part.length>=8)counts.set(part,(counts.get(part)??0)+1);
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
  // Bank styles already occur inside the public runtime heads. Share the same
  // exact CSS strings; every destination still expands losslessly on access.
  const cssEntries=Object.entries(input.bank.css??{}).filter(([,css])=>typeof css==='string'&&css);
  const cssReferences=value=>{
    let parts=[value];for(const [,css]of cssEntries)parts=parts.flatMap(part=>typeof part==='string'?part.split(css).flatMap((text,i)=>i?[intern(css),text]:[text]):[part]);
    return parts.length===1?[intern(value)]:parts;
  };
  const head = value => {
    const parts = value.split(/(<style\b[^>]*>[\s\S]*?<\/style>)/gi);
    if (parts.length === 1) return content(value);
    return parts.flatMap((part, index) => {
      if (index % 2 === 0) return content(part);
      return cssReferences(part).map(piece=>typeof piece==='string'&&piece.length>=512?intern(piece):piece);
    });
  };
  const page = value => ({ ...value, head: head(value.head),...(typeof value.content==='string'?{content:content(value.content)}:{}) });
  const pages=Object.fromEntries(Object.entries(input.pages).map(([path,value])=>[path,page(value)])),bank=page(input.bank);
  if(input.bank.css)bank.css=Object.fromEntries(cssEntries.map(([url,css])=>[url,[intern(css)]]));
  return inlineSingleUseParts(shareDeclarationSpans(shareStyleParts({ ...input, pages, bank, styles })));
}

// Chunk factoring can place the same rules inside different emitted styles.
// Share their exact text at build time. The existing flat reference decoder
// still joins only the visited destination; CSS and its cascade stay identical.
function shareStyleParts(input){
 const split=value=>{
  const parts=[];let start=0,depth=0,quote='',comment=false;
  for(let i=0;i<value.length;i++){
   const c=value[i],next=value[i+1];
   if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}
   if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
   if(c==='/'&&next==='*'){comment=true;i++;continue;}
   if(c==='"'||c==="'"){quote=c;continue;}
   if(c==='{')depth++;
   else if(c==='}'&&depth>0&&--depth===0){parts.push(value.slice(start,i+1));start=i+1;}
  }
  if(start<value.length)parts.push(value.slice(start));return parts;
 };
 const pieces=input.styles.map(value=>value.length>=1024?split(value):[value]),members=new Map();
 pieces.forEach((parts,index)=>{for(const part of new Set(parts)){if(!members.has(part))members.set(part,[]);members.get(part).push(index);}});
 // Keep adjacent rules shared by the same chunks as one exact text run.
 // This avoids replacing a shared block with hundreds of small references.
 const grouped=pieces.map(parts=>{const result=[];let key='',text='';for(const part of parts){const owners=members.get(part),next=owners.length>1?owners.join(','):'';if(next!==key&&text){result.push(text);text='';}key=next;text+=part;}if(text)result.push(text);return result;}),counts=new Map();
 for(const parts of grouped)for(const part of parts)if(part.length>=128)counts.set(part,(counts.get(part)??0)+1);
 const styles=[],indices=new Map(),intern=value=>{if(!indices.has(value)){indices.set(value,styles.length);styles.push(value);}return indices.get(value);};
 const mappings=grouped.map((parts,index)=>{
  if(!parts.some(part=>part.length>=128&&counts.get(part)>1))return[intern(input.styles[index])];
  const result=[];let pending='';for(const part of parts){if(part.length>=128&&counts.get(part)>1){if(pending){result.push(intern(pending));pending='';}result.push(intern(part));}else pending+=part;}if(pending)result.push(intern(pending));return result;
 });
 const expand=value=>Array.isArray(value)?value.flatMap(part=>typeof part==='number'?mappings[part]:[part]):value;
 const page=value=>({...value,head:expand(value.head),...(value.content===undefined?{}:{content:expand(value.content)})});
 return{...input,styles,pages:Object.fromEntries(Object.entries(input.pages).map(([path,value])=>[path,page(value)])),bank:{...page(input.bank),...(input.bank.css?{css:Object.fromEntries(Object.entries(input.bank.css).map(([path,value])=>[path,expand(value)]))}:{})}};
}

// Large destination-specific styles repeat declaration text beneath different
// selectors. Factor those bytes without changing CSS or the flat decoder.
// Leave frequently referenced blocks intact: expanding them at every use would
// cost more references than it saves. Complete JSON script carriers stay whole.
function shareDeclarationSpans(input){
 const uses=new Map();
 for(const page of [...Object.values(input.pages),input.bank,input.bank.css??{}])for(const value of Object.values(page))if(Array.isArray(value))for(const part of value)if(typeof part==='number')uses.set(part,(uses.get(part)??0)+1);
 const pieces=input.styles.map((value,index)=>value.length>=1024&&uses.get(index)>0&&uses.get(index)<=2&&!/<script\b/i.test(value)?value.split(/(?<=[{};])|(?=\.)/g):[value]);
 const counts=new Map();
 for(const parts of pieces)for(const part of parts)if(part.length>=8)counts.set(part,(counts.get(part)??0)+1);
 const styles=[],indices=new Map(),intern=value=>{if(!indices.has(value)){indices.set(value,styles.length);styles.push(value);}return indices.get(value);};
 const mappings=pieces.map(parts=>{
  const result=[];let pending='';
  for(const part of parts){
   if(counts.get(part)>1){if(pending){result.push(intern(pending));pending='';}result.push(intern(part));}
   else pending+=part;
  }
  if(pending)result.push(intern(pending));return result;
 });
 const expand=value=>Array.isArray(value)?value.flatMap(part=>typeof part==='number'?mappings[part]:[part]):value;
 const page=value=>({...value,head:expand(value.head),...(value.content===undefined?{}:{content:expand(value.content)})});
 const output={...input,styles,pages:Object.fromEntries(Object.entries(input.pages).map(([path,value])=>[path,page(value)])),bank:{...page(input.bank),...(input.bank.css?{css:Object.fromEntries(Object.entries(input.bank.css).map(([path,value])=>[path,expand(value)]))}:{})}};
 const size=value=>JSON.stringify(value).replaceAll('<','\\u003c').length;
 return size(output)<size(input)?output:input;
}


// The flat reader already accepts both literal strings and table indexes.
// Inline single-use fragments and group similar strings in the compression window.
// Every destination still expands to its original bytes.
function inlineSingleUseParts(navigation) {
  const rows = [...Object.values(navigation.pages), navigation.bank]
    .flatMap(page => [page.head, page.content])
    .concat(Object.values(navigation.bank.css ?? {}))
    .filter(Array.isArray);
  const uses = navigation.styles.map(() => 0);
  for (const row of rows) {
    for (const part of row) if (typeof part === 'number') uses[part]++;
  }
  const shared = navigation.styles.map((_, index) => index)
    .filter(index => uses[index] > 1)
    .sort((a, b) => navigation.styles[a] < navigation.styles[b] ? -1 : navigation.styles[a] > navigation.styles[b] ? 1 : 0);
  const indexes = new Map(shared.map((previous, index) => [previous, index]));

  for (const row of rows) {
    const packed = [];
    for (const part of row) {
      const value = typeof part === 'number'
        ? (indexes.get(part) ?? navigation.styles[part])
        : part;
      if (typeof value === 'string' && typeof packed.at(-1) === 'string') {
        packed[packed.length - 1] += value;
      } else {
        packed.push(value);
      }
    }
    row.length = 0;
    for (const part of packed) row.push(part);
  }
  navigation.styles = shared.map(index => navigation.styles[index]);
  return navigation;
}
