import { expect, it, vi } from 'vitest';
import { createCurrencyNotes, openCurrencyNoteFile } from '../src/receiz/currency-notes';
import type { NativeAssetPacket } from '../src/receiz/native-asset';

const { verify } = vi.hoisted(()=>({verify:vi.fn()}));
vi.mock('../src/receiz/native-asset',()=>({verifyNativeAssetSource:verify}));

it('reopens a note with the same privately retained claim and artwork after the issuer closes the form', async () => {
  const drafts = new Map<string,unknown>();
  const owner = 'issuer.receiz.id', assetId = 'a'.repeat(64);
  const issue = {schema:'receiz.bank.native-asset-result.v1',status:'committed',
    source:{artifactSha256:'b'.repeat(64)}} as NativeAssetPacket;
  const state = {current:{state:'committed',prepared:{request:{kind:'issue-currency-note'}},source:issue},history:[]};
  const make = () => createCurrencyNotes({owner,assertOpen(){},readAssetState:async()=>state,
    saveDraft:async (id,value)=>{drafts.set(id,value);}, readDraft:async id=>drafts.get(id)});
  const artwork = new File([Uint8Array.of(8,7,5)],'note.png',{type:'image/png'});
  const claim = await make().prepareClaim(artwork);
  verify.mockResolvedValue({ packet: issue, receipt: {schema:'receiz.bank.native-asset-receipt.v1',
    review:{request:{kind:'issue-currency-note',actorReceizId:owner,quantityMicro:'2000000',recipient:null,...claim}},
    assetAfter:{id:assetId,currency:{}},
  }});
  const [held] = await make().files(assetId);
  const opened = await openCurrencyNoteFile(held.file);
  expect(opened).toMatchObject({assetId,issuedBy:owner,quantityMicro:'2000000',recipient:null,...{claimCommitment:claim.claimCommitment}});
  const contents=JSON.parse(await held.file.text());
  const altered = (changes:Record<string,unknown>)=>new File([JSON.stringify({...contents,...changes})],held.file.name);
  await expect(openCurrencyNoteFile(altered({claimSecret:'d'.repeat(64)}))).rejects.toThrow('BANK_CURRENCY_NOTE_INVALID');
  await expect(openCurrencyNoteFile(altered({artwork:{mimeType:'image/png',bytesB64u:'AAAA'}}))).rejects.toThrow('BANK_CURRENCY_NOTE_INVALID');
  await expect(openCurrencyNoteFile(altered({quantityMicro:'9000000000'}))).rejects.toThrow('BANK_CURRENCY_NOTE_INVALID');
});
