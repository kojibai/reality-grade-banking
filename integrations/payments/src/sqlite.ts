import {DatabaseSync} from 'node:sqlite';
import type {OrderStore,OrderTransaction} from './types.js';
export type SqliteOrderStore=OrderStore&{close():void};

/** Merchant operational storage only. No Receiz credentials or financial writer. */
export function createSqliteOrderStore(path:string):SqliteOrderStore {
 const db=new DatabaseSync(path);
 db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS bankeiz_orders_kv (key TEXT PRIMARY KEY, body TEXT NOT NULL) STRICT;');
 const read=db.prepare('SELECT body FROM bankeiz_orders_kv WHERE key=?');
 const put=db.prepare('INSERT INTO bankeiz_orders_kv(key,body) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body');
 const insert=db.prepare('INSERT INTO bankeiz_orders_kv(key,body) VALUES(?,?) ON CONFLICT(key) DO NOTHING');
 const scan=db.prepare('SELECT key,body FROM bankeiz_orders_kv WHERE key>=? AND key<? AND key>? ORDER BY key LIMIT ?');
 const last=db.prepare('SELECT key FROM bankeiz_orders_kv WHERE key>=? AND key<? ORDER BY key DESC LIMIT 1');
 const encode=(value:unknown)=>{const body=JSON.stringify(value);if(body===undefined)throw Error('ORDER_STORAGE_VALUE_INVALID');return body;};
 const tx:OrderTransaction={
  get<T>(key:string){const row=read.get(key) as {body:string}|undefined;return row?JSON.parse(row.body) as T:null;},
  put(key,value){put.run(key,encode(value));},
  insert(key,value){return insert.run(key,encode(value)).changes===1;},
  lastKey(prefix){return (last.get(prefix,prefix+'\uffff') as {key:string}|undefined)?.key??null;},
  scan<T>(prefix:string,options:{after?:string;limit:number}){
   if(!Number.isSafeInteger(options.limit)||options.limit<1||options.limit>100)throw Error('ORDER_BATCH_INVALID');
   return (scan.all(prefix,prefix+'\uffff',options.after??'',options.limit) as {key:string;body:string}[]).map(row=>({key:row.key,value:JSON.parse(row.body) as T}));
  },
 };
 return{async transaction<T>(work:(tx:OrderTransaction)=>T){db.exec('BEGIN IMMEDIATE');try{const result=work(tx);if(result&&typeof (result as {then?:unknown}).then==='function')throw Error('ORDER_TRANSACTION_MUST_BE_SYNCHRONOUS');db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}},close(){db.close();}};
}
