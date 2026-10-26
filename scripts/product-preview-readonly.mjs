/** Keep static source-component examples scrollable, with every action inert.
 * No account runtime or browser event interception is needed for this boundary. */
export function scrollableProductPreview(source,screen){
 let html=source.replace(/(class="product-screen-window") inert=""/,'$1');
 html=html.replace(/<(button|a|input|textarea|select|form|label)\b[^>]*>/g,tag=>tag.replace(/\s(?:inert(?:="")?|tabindex="[^"]*"|aria-disabled="[^"]*")/g,'').replace(/\/?>(?=$)/,end=>' inert="" tabindex="-1" aria-disabled="true"'+end));
 const target=screen==='messages'?'bank-conversation-scroll':screen==='entry'?'product-screen-window':screen==='account'?'console':'sheet';
 let found=false;
 html=html.replace(/<[a-z][^>]*class="[^"]*"[^>]*>/g,tag=>{const classes=tag.match(/class="([^"]*)"/)[1].split(/\s+/);if(found||!classes.includes(target))return tag;found=true;return tag.replace(/\s(?:tabindex|aria-label)="[^"]*"/g,'').replace(/>$/,' data-example-scroll="" tabindex="0" aria-label="Scrollable '+screen+' example">');});
 if(!found)throw Error('PRODUCT_EXAMPLE_SCROLL_REGION_REQUIRED:'+screen);
 return html;
}
