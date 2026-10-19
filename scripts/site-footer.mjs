import {renderToStaticMarkup} from 'react-dom/server';
import {siteFooter} from '../branding/site-footer.mjs';
export const siteFooterHtml=()=>renderToStaticMarkup(siteFooter());
