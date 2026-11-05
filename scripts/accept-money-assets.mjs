import {acceptMoneyContent,acceptMoneyPage,acceptMoneyStyles} from './accept-money-page.mjs';

export function acceptMoneyDevPlugin(){return {name:'bankeiz-accept-money',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(new URL(req.url??'/','http://localhost').pathname.replace(/\/$/,'')!=='/accept')return next();
 try{
  const html=`<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${acceptMoneyPage.title} | Bankeiz</title><link rel="stylesheet" href="/learn/learn.css"><link rel="stylesheet" href="/src/styles/site-footer.css"><style data-public-page-style="accept-money">${acceptMoneyStyles}</style><script src="/learn/learn.js" defer></script></head><body data-bank-surface="learn"><div id="public-learn-root">${acceptMoneyContent()}</div></body></html>`;
  res.setHeader('content-type','text/html; charset=utf-8');res.end(await server.transformIndexHtml(req.url,html));
 }catch(error){next(error);}
 });}};}
