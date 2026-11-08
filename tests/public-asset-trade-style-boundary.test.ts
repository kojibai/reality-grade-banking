import {build} from 'esbuild';
import {bundleCssFiles,scopeProductCss} from '../scripts/scope-product-css.mjs';
import {expect,it} from 'vitest';

it('carries the complete canonical creation frame into the public profile without importing Bank application code',async()=>{
 const built=await build({entryPoints:['src/features/assets/AssetCreationSheet.tsx'],bundle:true,write:false,outdir:'output/style-boundary-unused',metafile:true,format:'esm',platform:'browser',packages:'external'});
 const inputs=Object.keys(built.metafile!.inputs),css=built.outputFiles!.find(file=>file.path.endsWith('.css'))!.text;
 for(const path of ['moment-composer.css','asset-composer.css','asset-studio.css','asset-creation-studio.css'])expect(inputs.some(input=>input.endsWith('/'+path))).toBe(true);
 for(const selector of ['.sheet.sheet--asset-studio','.asset-canvas','.asset-canvas-dock','.asset-creation--studio .moment-form-fields','.asset-composer input[type=file]'])expect(css).toContain(selector);
 expect(inputs).not.toContain('src/App.tsx');expect(inputs).not.toContain('src/features/assets/CreateAsset.tsx');expect(inputs).not.toContain('src/styles/app.css');
});

it('builds canonical purchase controls with the lazy public trade host, without relying on the Bank entry stylesheet',async()=>{
 // Inspect the actual host's CSS dependency closure without executing account,
 // SDK or trade code. Other JS imports remain external to this style-only build.
 const built=await build({entryPoints:['src/public-explorer/PublicAssetTradeHost.tsx'],bundle:true,write:false,outdir:'output/style-boundary-unused',metafile:true,format:'esm',platform:'browser',packages:'external',plugins:[{name:'style-boundary-only',setup(builder){builder.onResolve({filter:/^\.\.?\//},args=>args.kind==='entry-point'||args.path.endsWith('.css')?undefined:{path:args.path,external:true});}}]});
 const inputs=Object.keys(built.metafile!.inputs),css=built.outputFiles!.find(file=>file.path.endsWith('.css'))!.text;
 expect(inputs).toContain('src/components/form-controls.css');expect(inputs).not.toContain('src/styles/app.css');expect(inputs).not.toContain('src/styles/features.css');
 for(const selector of ['.form-field','.amount-input','.quick-amounts','.trade-amount-presets','.primary-button','.secondary-button'])expect(css).toContain(selector);
 expect(css).toContain('min-height: 44px');expect(css).toContain('font-size: 23px');
 expect(css).toMatch(/\.native-operation-fields\s*\{[^}]*border:\s*0;[^}]*padding:\s*0;[^}]*margin:\s*0;[^}]*min-width:\s*0;/);
 expect(css).not.toContain('.console');expect(css).not.toContain('.bottom-nav');expect(css).not.toMatch(/(?:^|\n)\.deposit-options\s*\{/);
 expect(inputs).not.toContain('src/main.tsx');expect(inputs).not.toContain('src/App.tsx');
});

it('shares the same canonical controls with existing app styles without duplicate declarations',async()=>{
 const built=await build({stdin:{contents:"import './src/styles/app.css';import './src/styles/features.css';",resolveDir:process.cwd()},bundle:true,write:false,outdir:'output/style-boundary-unused',metafile:true,external:['/notes/fonts/Cinzel.ttf']});
 expect(Object.keys(built.metafile!.inputs)).toContain('src/components/form-controls.css');
 const css=built.outputFiles!.find(file=>file.path.endsWith('.css'))!.text;
 expect(css.match(/(?:^|\n)\.form-field \{/g)).toHaveLength(1);expect(css.match(/\.primary-button,\s*\.secondary-button \{/g)).toHaveLength(1);
 expect(css).toContain('.console');expect(css).toContain('.deposit-options');
 expect(css.indexOf('\n.primary-button {')).toBeLessThan(css.indexOf('\n.navy-button {'));
});

it('includes the same imported canonical controls in the actual scoped booking preview, with no unresolved browser imports',async()=>{
 const {createServer}=await import('vite'),{renderBookingExamples}=await import('../scripts/booking-guide.mjs');
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
 try{
  const preview=await renderBookingExamples(server);
  expect(preview.css).not.toContain('@import');
  for(const selector of ['.booking-guide-preview .form-field','.booking-guide-preview .amount-input','.booking-guide-preview .primary-button'])expect(preview.css).toContain(selector);
  expect(preview.css.match(/\.booking-guide-preview \.form-field\{/g)).toHaveLength(1);
 }finally{await server.close();}
});


it('bundles the declared preview controls once before scoped component overrides and preserves asset URLs',async()=>{
 const css=await bundleCssFiles(['src/styles/tokens.css','src/components/form-controls.css','src/styles/app.css','src/styles/features.css']);
 expect(css).not.toContain('@import');expect(css.match(/(?:^|\n)\.form-field \{/g)).toHaveLength(1);
 expect(css.indexOf('\n.primary-button {')).toBeLessThan(css.indexOf('\n.navy-button {'));
 expect(css).toContain('url(/notes/fonts/Cinzel.ttf)');
 const scoped=scopeProductCss(css);expect(scoped).toContain('.product-screen .form-field');expect(scoped).toContain('.product-screen .navy-button');
});

it('carries the exact funding component styles in the sole public Host CSS closure without Bank entry styles',async()=>{
 const built=await build({entryPoints:['src/public-explorer/PublicAssetTradeHost.tsx'],bundle:true,write:false,outdir:'output/style-boundary-unused',metafile:true,format:'esm',platform:'browser',packages:'external',plugins:[{name:'funding-style-boundary-only',setup(builder){builder.onResolve({filter:/^\.\.?\//},args=>args.kind==='entry-point'||args.path.endsWith('.css')?undefined:{path:args.path,external:true});}}]});
 const inputs=Object.keys(built.metafile!.inputs),css=built.outputFiles!.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
 expect(inputs).toContain('src/components/form-controls.css');expect(inputs).toContain('src/features/deposit/deposit.css');
 expect(inputs).not.toContain('src/styles/app.css');expect(inputs).not.toContain('src/styles/features.css');
 expect(css).toMatch(/(?:^|\n)\.sheet-hero\s*\{[^}]*font-size:\s*28px;[^}]*margin:\s*9px 0 13px;[^}]*line-height:\s*1\.18;/);
 expect(css).toMatch(/(?:^|\n)\.small-copy\s*\{\s*font-size:\s*12px;/);
 expect(css).toMatch(/(?:^|\n)\.deposit-consent-details\s*\{[^}]*margin:\s*18px 0;[^}]*font-size:\s*12px;[^}]*line-height:\s*1\.7;/);
 expect(css).toMatch(/(?:^|\n)\.deposit-consent-details summary\s*\{[^}]*font-weight:\s*550;/);
 expect(css).toMatch(/(?:^|\n)\.deposit-consent-details\s*>\s*p\s*\{[^}]*margin-top:\s*12px;/);
 expect(css).toContain('.deposit-flow .deposit-consent-details');expect(css).toContain('.deposit-flow .primary-button');
});
