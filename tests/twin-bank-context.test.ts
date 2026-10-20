import {expect,it} from 'vitest';
import {bankTwinContextRecords} from '../src/receiz/twin-bank-context';
import type {PublicRecord} from '../src/receiz/public-network';
it('prepares only selected display operands from already held records without serializing arbitrary source/private keys',()=>{
 const row={id:'one',title:'Money Transfer',kind:'chat_transfer',time:'2026-10-19T12:00:00Z',amountUsdCents:'100',pulse:'100',kaiUpulse:'100000000',sourceUrl:'https://receiz.com/verify/example',sender:'me',recipient:'mira',evidence:{artifactDigest:'a'.repeat(64)},details:{privateKey:'MUST_NOT_SHARE',fundingAttribution:{schema:'fifo',slices:[{sourceId:'proof-one',amountPhiMicro:'100'}]}},authority:'account-source-projection'} as unknown as PublicRecord;
 const records=bankTwinContextRecords([row,row]);expect(records).toHaveLength(1);expect(records[0].text).toContain('proof-one');expect(records[0].text).not.toContain('MUST_NOT_SHARE');expect(records[0].text).toContain('display projection');expect(records[0].text.length).toBeLessThanOrEqual(2400);
});
it('distinguishes repeated transfer titles using the held amount and moment without fetching',()=>{
 const first={id:'one',source:'wallet',title:'chat transfer',kind:'chat_transfer',time:'2026-10-19T12:00:00Z',amountUsdCents:'100',evidence:{}} as PublicRecord;
 const second={...first,id:'two',time:'2026-10-18T12:00:00Z',amountUsdCents:'200'};
 const records=bankTwinContextRecords([first,second]);
 expect(records[0].title).toContain('Money Transfer');expect(records[0].title).toContain('$1.00');
 expect(records[1].title).toContain('$2.00');expect(records[0].title).not.toBe(records[1].title);
 expect(records[0].title).toMatch(/Oct|10/);expect(Object.keys(records[0]).sort()).toEqual(['id','text','title']);
});
