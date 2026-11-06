import {readFile} from 'node:fs/promises';
import {institutionScorecardContent,institutionScorecardPage} from './institution-scorecard-page.mjs';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';

export function institutionScorecardDevPlugin(){return {
 name:'bankeiz-institution-scorecard',
 configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const path=new URL(req.url??'/','http://localhost').pathname.replace(/index\.html$/,'').replace(/\/$/,'');
  if(canonicalPublicPath(path)!==institutionScorecardPage.path)return next();
  try{
   const css=await readFile('public/learn/institution-scorecard.css','utf8');
   const html=`<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/learn/learn.css"><link rel="stylesheet" href="/src/styles/site-footer.css"><style data-public-page-style="institution-scorecard">${css}</style><script src="/learn/learn.js" defer></script></head><body data-bank-surface="learn"><div id="public-learn-root">${institutionScorecardContent()}</div></body></html>`;
   res.setHeader('content-type','text/html; charset=utf-8');
   res.end(await server.transformIndexHtml(institutionScorecardPage.path,html));
  }catch(error){next(error);}
 });},
};}
