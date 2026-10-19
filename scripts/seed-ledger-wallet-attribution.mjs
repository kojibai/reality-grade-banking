import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createServer} from 'vite';
// Operator-supplied, complete same-account originals only. Never fetches.
const path=process.argv[2];if(!path)throw Error('Pass the existing complete wallet source capture.');
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {calculateWalletFundingAttributions,readWalletFundingSource,walletAttributionFitsRecord}=await server.ssrLoadModule('/src/receiz/ledger-wallet-fifo.ts');
 const {parsePublicNetworkCache}=await server.ssrLoadModule('/src/receiz/public-network-cache.ts');
 const {parsePublicNetworkPage,PUBLIC_NETWORK_INSPECTION_VERSION}=await server.ssrLoadModule('/src/receiz/public-network.ts');
 const {readLedgerCausalLineage}=await server.ssrLoadModule('/src/receiz/ledger-causal-source.ts');
 const {linkWalletFundingHistory}=await server.ssrLoadModule('/src/receiz/ledger-funding-history.ts');
 const bytes=await readFile(path),rows=JSON.parse(bytes);if(!Array.isArray(rows)||rows.length>100000)throw Error('COMPLETE_WALLET_CAPTURE_REQUIRED');
 const groups=Map.groupBy(rows,row=>row.user_id),byTransfer=new Map(),byNote=new Map(),credits=new Map(),debitsByTransfer=new Map(),capturedTransfers=new Set();let calculated=0;
 for(const [uid,entries]of groups){const index=calculateWalletFundingAttributions(entries,uid,true);calculated+=index.size;
  for(const row of entries){if(row.direction==='debit'&&row.chat_transfer_id){const alias='tx:'+createHash('sha256').update(`wallet_public_ledger:transfer:${row.chat_transfer_id}`).digest('hex').slice(0,24);if(capturedTransfers.has(row.chat_transfer_id))throw Error('AMBIGUOUS_DEBIT_REFERENCE');capturedTransfers.add(row.chat_transfer_id);capturedTransfers.add(alias);debitsByTransfer.set(row.chat_transfer_id,row);debitsByTransfer.set(alias,row);if(index.has(row.id)){byTransfer.set(row.chat_transfer_id,index.get(row.id));byTransfer.set(alias,index.get(row.id));}}
   if(row.direction==='debit'&&row.entry_kind==='note_mint'&&row.note_id&&index.has(row.id)){if(byNote.has(row.note_id))throw Error('AMBIGUOUS_NOTE_MINT_REFERENCE');byNote.set(row.note_id,index.get(row.id));}
   if(row.direction==='credit'){const meta=row.metadata??{},source=readWalletFundingSource({...meta,sourceId:row.id,entryKind:row.entry_kind,occurredAt:row.created_at,kaiUpulse:row.kai_upulse,amountUsdCents:row.amount_usd_cents,creditAmountUsdCents:row.amount_usd_cents,offsetUsdCents:'0',contentHash:meta.contentHash??meta.uploadHash,assetId:meta.assetId??meta.receizId,noteId:row.note_id,transferId:row.chat_transfer_id});if(source)credits.set(row.id,source);}}
 }
 const target=new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url),held=JSON.parse(gunzipSync(await readFile(target))),updates=new Map(),componentUpdates=new Map();let attributed=0,linked=0;
 const publicPath=process.argv[3];if(publicPath&&!publicPath.startsWith('--')){const existing=new Set(held.records.map(row=>row.id)),fresh=parsePublicNetworkPage('wallet',JSON.parse(await readFile(publicPath,'utf8'))).records;held.records.push(...fresh.filter(row=>!existing.has(row.id)));}
 const parsed=parsePublicNetworkCache(held);
 for(const record of parsed.records){let details=record.details;const transfer=record.evidence.transferId??(record.kind==='chat_transfer'?record.sourceId.replace(/^transfer:/,''):undefined),attribution=byTransfer.get(transfer);
  // Recompute captured originals rather than retaining a previous calculation
  // when stricter source validation no longer supports that attribution.
  if(capturedTransfers.has(transfer)&&details){details={...details};delete details.fundingAttribution;delete details.fundingHistory;delete details.fundingTransferId;}
  const debit=debitsByTransfer.get(transfer),reserve=String(debit?.metadata?.settledUsdCents??''),settlement=String(debit?.metadata?.phiUsdCents??'');
  if(debit&&String(debit.amount_usd_cents)===record.amountUsdCents&&/^\d{1,39}$/.test(reserve)&&/^\d{1,39}$/.test(settlement)&&BigInt(reserve)+BigInt(settlement)===BigInt(record.amountUsdCents)){
   const operands={...record.valueOperands};for(const [key,amount]of [['settledUsdCents',reserve],['phiUsdCents',settlement]]){if(operands[key]!==undefined&&operands[key]!==amount)throw Error('NATIVE_COMPONENT_CONFLICT');operands[key]=amount;}componentUpdates.set(record.id,operands);
  }
  if(attribution&&walletAttributionFitsRecord(attribution,record,true)){const fundingHistory=linkWalletFundingHistory(attribution,byTransfer,byNote);details={...details,fundingTransferId:transfer,fundingAttribution:attribution,...(fundingHistory?{fundingHistory}:{})};attributed++;}
  const lineage=readLedgerCausalLineage(details?.causalLineage),ids=new Set(lineage?.steps.map(step=>step.sourceId).filter(Boolean));
  const links=[...ids].flatMap(id=>{const credit=credits.get(id);return credit&&(credit.contentHash||credit.marketItemId||credit.assetId)?[credit]:[];});
  if(links.length){details={...details,fundingLinks:links};linked++;}if(details!==record.details)updates.set(record.id,details);
 }
 const next={...held,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,records:held.records.map(record=>({...record,...(updates.has(record.id)?{details:updates.get(record.id)}:{}),...(componentUpdates.has(record.id)?{valueOperands:componentUpdates.get(record.id)}:{})}))},output=Buffer.from(JSON.stringify(next));if(output.length>32*1024*1024)throw Error('PUBLIC_LEDGER_SEED_DECODED_CAPACITY_EXCEEDED');parsePublicNetworkCache(next);
 const compressed=gzipSync(output,{level:9});if(process.argv.includes('--apply')){const temp=new URL(`../public/.ledger-wallet-${process.pid}.tmp`,import.meta.url);try{await writeFile(temp,compressed);await rename(temp,target);}finally{await rm(temp,{force:true});}}
 console.log(JSON.stringify({captureSha256:createHash('sha256').update(bytes).digest('hex'),walletRows:rows.length,calculatedDebits:calculated,attributedPublicRecords:attributed,linkedExistingCausalRecords:linked,records:held.records.length,decodedBytes:output.length,compressedBytes:compressed.length,extraRuntimeRequests:0,applied:process.argv.includes('--apply')}));
}finally{await server.close();}
