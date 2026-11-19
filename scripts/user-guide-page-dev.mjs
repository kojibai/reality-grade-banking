import {guideContent,guideStyles} from './user-guide-page.mjs';
import {learnArticle} from './learn-template.mjs';
import {escapeMetadata} from './public-page-metadata.mjs';
import {governanceGuide} from '../src/content/governance-guide.mjs';

export function userGuidePageDevPlugin(){
  return {
    name:'bankeiz-user-guide-public-page',
    configureServer(server){
      server.middlewares.use(async(req,res,next)=>{
        const path=(req.url??'').split('?')[0].replace(/\/$/,'');
        if(path!=='/guide' && path!=='/learn/governance')return next();
        try{
          const governance=path==='/learn/governance';
          const content=governance?learnArticle(governanceGuide,[],escapeMetadata):guideContent();
          const styles=governance?'<link rel="stylesheet" href="/learn/governance-guide.css">':`<style data-public-page-style="guide">${guideStyles}</style>`;
          const html=`<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${governance?'Governance':'User guide'} | Bankeiz</title><link rel="stylesheet" href="/learn/learn.css"><link rel="stylesheet" href="/src/styles/site-footer.css">${styles}<script src="/learn/learn.js" defer></script></head><body data-bank-surface="learn"><div id="public-learn-root">${content}</div></body></html>`;
          res.setHeader('content-type','text/html; charset=utf-8');
          res.end(await server.transformIndexHtml(path+'/',html));
        }catch(error){next(error);}
      });
    },
  };
}
