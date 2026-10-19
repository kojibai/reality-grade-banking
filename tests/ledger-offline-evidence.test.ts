import {expect,it} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {ledgerInspectionDocument} from '../src/receiz/ledger-inspection';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';

it('retains the complete public Wallet verification capsule including its hashed hints',()=>{
 const proofBundle={proofCapsule:{v:'KPV-1',upulse:'120000001',pulse:120,chakraDay:'Solar',kaiKlok:'00:00:01',kaiSignature:'a'.repeat(64),phiKey:'public-phi-key',verifierSlug:'120-aaaaaaaaaa'},capsuleHash:'b'.repeat(64),bundleHash:'c'.repeat(64),verifierUrl:'https://receiz.com/t/20261017_1646/92DD0339C992B40E/120',verifier:'local',verificationVersion:'wallet-ledger-v1',verifiedAtPulse:120,proofHints:{source:'wallet_ledger_v1',eventId:'transfer:one',eventKind:'chat_transfer',createdAt:'2026-10-17T12:00:00Z'}};
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer:one',kind:'chat_transfer',proofBundle}]}).records[0];
 const cached=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[record],coverage:[]}).records[0];
 expect(ledgerInspectionDocument(cached,ledgerValueForRecord(cached)).details.proofBundle).toEqual(proofBundle);
});
it('never retains private additions from a projection while preserving carried public cryptography',()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'one',proofBundle:{zkPoseidonHash:'a'.repeat(64),groth16Proof:'g16:public-proof',groth16ProofDigest:'b'.repeat(64),privateKey:'hidden-secret',proofHints:{eventId:'one',privateKey:'hidden-secret'}}}]}).records[0];
 expect(record.details?.proofBundle).toMatchObject({zkPoseidonHash:'a'.repeat(64),groth16Proof:'g16:public-proof',groth16ProofDigest:'b'.repeat(64),proofHints:{eventId:'one'}});
 expect(JSON.stringify(record)).not.toContain('hidden-secret');
});
it('retains an explicitly public payment note through Ledger, offline cache and local inspection, never a private metadata note',()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'one',publicNote:'For lunch <not markup>',metadata:{note:'hidden-private-message'}}]}).records[0];
 const cached=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[record],coverage:[]}).records[0];
 expect(ledgerInspectionDocument(cached,ledgerValueForRecord(cached)).details.publicNote).toBe('For lunch <not markup>');expect(JSON.stringify(cached)).not.toContain('hidden-private-message');
});
