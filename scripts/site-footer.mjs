import {renderToStaticMarkup} from 'react-dom/server';
import {siteFooter} from '../branding/site-footer.mjs';
export const siteFooterHtml=path=>renderToStaticMarkup(siteFooter(path));

/** Recompose only the shared footer for the static document’s exact route. */
export const withPageFooter=(html,path)=>html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/g,()=>siteFooterHtml(path));
