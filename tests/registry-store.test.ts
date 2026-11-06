import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {afterEach,describe,expect,it,vi} from 'vitest';
import type {RegistryPublication} from '../src/registry/types';
import {createFileRegistryStore,createRedisRegistryStore,registryStore} from '../server/registry-store';

const directories:string[]=[];
afterEach(async()=>{vi.unstubAllEnvs();await Promise.all(directories.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
async function directory(){const path=await mkdtemp(join(tmpdir(),'registry-store-'));directories.push(path);return path;}
function proof(text='passing Original'){const bytes=new TextEncoder().encode(text),hash=createHash('sha256').update(bytes).digest('hex');return{bytes,record:{schema:'bank.registry.publication.v1',institutionId:'test-bank',name:'Test Bank',scope:'Public integration contract',cases:33,artifactSha256:hash,evidenceSha256:'b'.repeat(64),holderReceizId:'test-bank.receiz.id',implementationBuildSha256:'c'.repeat(64),officialProofUrl:'https://test-bank.example/.well-known/reality-grade-banking/conformance.png',acceptedAt:'2026-11-05T20:00:00.000Z',url:`/api/bank/registry/original/test-bank/${hash}`} satisfies RegistryPublication};}

describe('durable accepted Registry evidence',()=>{
 it('reopens the exact Original and accepted public state from another store instance',async()=>{
  const path=await directory(),first=createFileRegistryStore(path),{record,bytes}=proof();
  expect(await first.list()).toEqual([]);
  const saved=await first.append(record,bytes),reopened=createFileRegistryStore(path);
  expect(saved).toEqual({institutionId:'test-bank',revision:1,current:record,history:[]});
  expect(await reopened.list()).toEqual([saved]);
  expect(await reopened.original('test-bank',record.artifactSha256)).toEqual(bytes);
  expect(await reopened.original('other-bank',record.artifactSha256)).toBeNull();
 });
 it('retains all prior accepted proofs, increments revision once, and never rolls back on a retry',async()=>{
  const store=createFileRegistryStore(await directory()),first=proof('first'),second=proof('second');
  await store.append(first.record,first.bytes);
  const accepted=await store.append(second.record,second.bytes);
  expect(accepted).toEqual({institutionId:'test-bank',revision:2,current:second.record,history:[first.record]});
  expect(await store.append({...first.record,acceptedAt:'2026-11-06T20:00:00.000Z'},first.bytes)).toEqual(accepted);
  expect(await store.append({...second.record,acceptedAt:'2026-11-06T20:00:00.000Z'},second.bytes)).toEqual(accepted);
  expect(await store.original('test-bank',first.record.artifactSha256)).toEqual(first.bytes);
 });
 it('serializes concurrent appends across file store instances without losing history',async()=>{
  const path=await directory(),a=createFileRegistryStore(path),b=createFileRegistryStore(path),first=proof('first'),second=proof('second');
  await Promise.all([a.append(first.record,first.bytes),b.append(second.record,second.bytes)]);
  const [state]=await a.list();
  expect(state.revision).toBe(2);
  expect(new Set([state.current,...state.history].map(record=>record.artifactSha256))).toEqual(new Set([first.record.artifactSha256,second.record.artifactSha256]));
 });
 it('refuses mismatched Originals and invalid institution paths before publication',async()=>{
  const store=createFileRegistryStore(await directory()),{record,bytes}=proof();
  await expect(store.append(record,new TextEncoder().encode('different'))).rejects.toThrow('REGISTRY_STORE_INVALID');
  await expect(store.append({...record,institutionId:'../test-bank'},bytes)).rejects.toThrow('REGISTRY_STORE_INVALID');
  await expect(store.append({...record,url:'https://untrusted.example/proof'},bytes)).rejects.toThrow('REGISTRY_STORE_INVALID');
  expect(await store.list()).toEqual([]);
 });
 it('does not replace the prior accepted state if its next write cannot be committed',async()=>{
  const path=await directory(),store=createFileRegistryStore(path),first=proof('first'),second=proof('second');
  await store.append(first.record,first.bytes);
  // A directory at the next snapshot destination prevents atomic replacement.
  const file=join(path,'test-bank.json'),saved=await readFile(file);
  await rm(file);await mkdir(file);
  await expect(store.append(second.record,second.bytes)).rejects.toThrow();
  await rm(file,{recursive:true});await writeFile(file,saved);
  expect((await store.list())[0].current).toEqual(first.record);
 });
 it('does not turn a corrupt durable snapshot into an empty successful register',async()=>{
  const path=await directory(),store=createFileRegistryStore(path),{record,bytes}=proof();
  await store.append(record,bytes);
  await writeFile(join(path,'test-bank.json'),'{broken');
  await expect(store.list()).rejects.toThrow('REGISTRY_STORE_CORRUPT');
  await expect(store.original('test-bank',record.artifactSha256)).rejects.toThrow('REGISTRY_STORE_CORRUPT');
 });
 it('verifies persisted Original bytes rather than trusting its key',async()=>{
  const path=await directory(),store=createFileRegistryStore(path),{record,bytes}=proof();
  await store.append(record,bytes);
  const file=join(path,'test-bank.json'),saved=JSON.parse(await readFile(file,'utf8'));
  saved.originals[record.artifactSha256]=Buffer.from('changed').toString('base64');await writeFile(file,JSON.stringify(saved));
  await expect(store.original('test-bank',record.artifactSha256)).rejects.toThrow('REGISTRY_STORE_CORRUPT');
 });
});

describe('production Redis REST transport',()=>{
 it('posts a single atomic append and verifies exact retrieved bytes',async()=>{
  const {record,bytes}=proof(),state={institutionId:'test-bank',revision:1,current:record,history:[]},commands:unknown[][]=[];
  const fetchImpl=vi.fn(async(_url:RequestInfo|URL,input?:RequestInit)=>{
   expect(input?.headers).toEqual({'Content-Type':'application/json',Authorization:'Bearer private-token'});
   const command=JSON.parse(String(input?.body));commands.push(command);
   return Response.json({result:command[0]==='EVAL'?JSON.stringify(state):command[0]==='HVALS'?[JSON.stringify(state)]:Buffer.from(bytes).toString('base64')});
  });
  const store=createRedisRegistryStore({url:'https://redis.example',token:'private-token',fetchImpl});
  expect(await store.append(record,bytes)).toEqual(state);
  expect(commands).toHaveLength(1);expect(commands[0][0]).toBe('EVAL');
  expect(await store.list()).toEqual([state]);
  expect(await store.original('test-bank',record.artifactSha256)).toEqual(bytes);
 });
 it('fails closed for unavailable storage and corrupt returned bytes',async()=>{
  const {record,bytes}=proof();
  const unavailable=createRedisRegistryStore({url:'https://redis.example',token:'private-token',fetchImpl:async()=>Response.json({error:'private backend details'},{status:500})});
  await expect(unavailable.list()).rejects.toThrow('REGISTRY_STORE_UNAVAILABLE');
  await expect(unavailable.append(record,bytes)).rejects.toThrow('REGISTRY_STORE_UNAVAILABLE');
  const corrupt=createRedisRegistryStore({url:'https://redis.example',token:'private-token',fetchImpl:async()=>Response.json({result:Buffer.from('other').toString('base64')})});
  await expect(corrupt.original('test-bank',record.artifactSha256)).rejects.toThrow('REGISTRY_STORE_CORRUPT');
 });
 it('never falls back to ephemeral files in production or on Vercel',()=>{
  vi.stubEnv('REGISTRY_REDIS_REST_URL','');vi.stubEnv('REGISTRY_REDIS_REST_TOKEN','');
  vi.stubEnv('NODE_ENV','production');expect(registryStore()).toBeNull();
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('VERCEL','1');expect(registryStore()).toBeNull();
  vi.stubEnv('NODE_ENV',undefined);vi.stubEnv('VERCEL',undefined);expect(registryStore()).toBeNull();
 });
 it('requires an explicit secure server-only Redis configuration',()=>{
  expect(()=>createRedisRegistryStore({url:'http://redis.example',token:'token'})).toThrow('REGISTRY_STORE_CONFIG');
  expect(()=>createRedisRegistryStore({url:'https://user:password@redis.example',token:'token'})).toThrow('REGISTRY_STORE_CONFIG');
  expect(()=>createRedisRegistryStore({url:'https://redis.example',token:''})).toThrow('REGISTRY_STORE_CONFIG');
 });
});
