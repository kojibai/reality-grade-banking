// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {OriginalsQualificationView,QualificationAccountEntry} from '../src/features/qualification/EarnFromOriginals';
import {parseQualificationProgress,createQualificationProgressReader} from '../src/qualification/source';
import {qualificationFixture,unsignedQualificationFixture} from './fixtures/originals-qualification';
const render=(observation:Parameters<typeof OriginalsQualificationView>[0]['observation'])=>renderToStaticMarkup(<OriginalsQualificationView observation={observation} onProfile={()=>{}} onCreate={()=>{}}/>);
it('teaches sealed accrual without fabricating an unread Original’s proof',()=>{
 const html=render(null);expect(html).toContain('Source not yet read');expect(html).not.toContain('Sign. Publish. Unlock.');expect(html).toContain('The value is already there. Your signature unlocks its use.');expect(html).toContain('Your Original is already earning. Sign it to unlock its value.');expect(html).not.toMatch(/500|150,000|40%|250,000|0 \/ 1|shared baseline/i);
});
it('shows retained signature evidence without asserting current access and preserves the exact source inspector',()=>{
 const html=render(parseQualificationProgress(qualificationFixture(),'owner'));
 expect(html).toContain('Accepted signature retained');expect(html).toContain('Inspect your account proof');expect(html).toContain('c'.repeat(64));expect(html).not.toMatch(/funding requirement|retention|witnessed breaths|become qualified/i);
 expect(html).toContain('Each Original needs its own PBI signature to unlock its value.');
 expect(html).toContain('Current public proof and ownership govern use');
 expect(html).not.toMatch(/Value unlocked|Your signed Original is verified/i);
 expect(html).not.toMatch(/earning is on|enables? (?:account )?earning|first Original|unsigned Original does not earn/i);
});
it('does not unlock value from a supplied counter or a merely visible object',()=>{
 const html=render(parseQualificationProgress(unsignedQualificationFixture(),'owner'));
 expect(html).toContain('Sign your Original to unlock');expect(html).not.toContain('Value unlocked');expect(html).toContain('already earning');expect(html).toContain('PBI');
});

it('retains accepted signature history after an empty observation without granting current ownership or use',async()=>{
 const accepted=parseQualificationProgress(qualificationFixture(),'owner');
 const reader=createQualificationProgressReader('owner',async()=>unsignedQualificationFixture(),()=>true,accepted);
 expect(await reader.read()).toBe(accepted);
 const html=render(reader.known());
 expect(html).toContain('Accepted signature retained');expect(html).toContain('Current public proof and ownership govern use');
 expect(html).not.toMatch(/Value unlocked|Your signed Original is verified/i);
 const entry=renderToStaticMarkup(<QualificationAccountEntry qualified onOpen={()=>{}}/>);
 expect(entry).toContain('Accepted signature retained');expect(entry).toContain('Current proof and ownership govern access.');expect(entry).not.toContain('Value unlocked');
});
