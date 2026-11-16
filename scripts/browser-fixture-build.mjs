import {build} from 'esbuild';
/** Match the shipped inline font import contract using the actual local bytes. */
export function buildBrowserFixture(options){
 return build({...options,loader:{'.ttf':'dataurl',...options.loader}});
}
