import type {Plugin} from 'vite';
import {readFile} from 'node:fs/promises';
import {profilePageUsername} from '../src/receiz/public-profile';
import {handleProfilePreview} from './profile-preview';
import {handlePublicProfile,readPublicProfile} from './public-profile';
export function profilePreviewPlugin():Plugin{return {name:'bankeiz-public-profile',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url??'/','http://localhost');if(!profilePageUsername(url.pathname)&&!url.pathname.startsWith('/api/bank/public-profile/')){next();return;}
 try{const request=new Request(url,{method:req.method??'GET'}),response=url.pathname.startsWith('/api/bank/public-profile/')?await handlePublicProfile(request):await handleProfilePreview(request,{profile:readPublicProfile,page:async()=>server.transformIndexHtml('/explore/',await readFile('explore/index.html','utf8'))});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503);res.end('Profile unavailable.');}
 });},configurePreviewServer(server){server.middlewares.use(async(req,res,next)=>{const url=new URL(req.url??'/','http://localhost');if(!profilePageUsername(url.pathname)&&!url.pathname.startsWith('/api/bank/public-profile/')){next();return;}try{const request=new Request(url,{method:req.method??'GET'}),response=url.pathname.startsWith('/api/bank/public-profile/')?await handlePublicProfile(request):await handleProfilePreview(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503);res.end('Profile unavailable.');}});}};}
