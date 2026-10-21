import type {Plugin} from 'vite';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import type {ReadableStream as NodeReadableStream} from 'node:stream/web';
import type {ServerResponse,IncomingMessage} from 'node:http';
import {profilePageUsername} from '../src/receiz/public-profile';
import {handleProfilePreview,renderProfileDocument} from './profile-preview';
import {handlePublicProfile,readPublicProfile} from './public-profile';
function profileRequest(req:IncomingMessage,url:URL){const headers=new Headers();for(const key of ['accept','user-agent']){const value=req.headers[key];if(typeof value==='string')headers.set(key,value);}return new Request(url,{method:req.method??'GET',headers});}
function sendProfileResponse(res:ServerResponse,response:Response){res.writeHead(response.status,Object.fromEntries(response.headers));if(!response.body){res.end();return;}const body=Readable.fromWeb(response.body as NodeReadableStream);body.on('error',()=>res.destroy());res.on('close',()=>body.destroy());body.pipe(res);}
export function profilePreviewPlugin():Plugin{return {name:'bankeiz-public-profile',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url??'/','http://localhost');if(!profilePageUsername(url.pathname)&&!url.pathname.startsWith('/api/bank/public-profile/')){next();return;}
 try{const request=profileRequest(req,url),response=url.pathname.startsWith('/api/bank/public-profile/')?await handlePublicProfile(request):await handleProfilePreview(request,{profile:readPublicProfile,page:async()=>server.transformIndexHtml('/explore/',await readFile('explore/index.html','utf8')),render:renderProfileDocument});sendProfileResponse(res,response);}catch{res.writeHead(503);res.end('Profile unavailable.');}
 });},configurePreviewServer(server){server.middlewares.use(async(req,res,next)=>{const url=new URL(req.url??'/','http://localhost');if(!profilePageUsername(url.pathname)&&!url.pathname.startsWith('/api/bank/public-profile/')){next();return;}try{const request=profileRequest(req,url),response=url.pathname.startsWith('/api/bank/public-profile/')?await handlePublicProfile(request):await handleProfilePreview(request);sendProfileResponse(res,response);}catch{res.writeHead(503);res.end('Profile unavailable.');}});}};}
