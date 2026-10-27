// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {OriginalsQualificationView} from '../src/features/qualification/EarnFromOriginals';
import {parseQualificationProgress} from '../src/qualification/source';
import {qualificationFixture,unsignedQualificationFixture} from './fixtures/originals-qualification';
const render=(observation:Parameters<typeof OriginalsQualificationView>[0]['observation'])=>renderToStaticMarkup(<OriginalsQualificationView observation={observation} onProfile={()=>{}} onCreate={()=>{}}/>);
it('names the one signed-public-Original gate without fabricating a missing source',()=>{
 const html=render(null);expect(html).toContain('Source not yet read');expect(html).toContain('One public, PBI-signed Original');expect(html).not.toMatch(/500|150,000|40%|250,000|0 \/ 1|shared baseline/i);
});
it('shows accepted earning for the first signed public Original and preserves the exact source inspector',()=>{
 const html=render(parseQualificationProgress(qualificationFixture(),'owner'));
 expect(html).toContain('Earn from Originals is on');expect(html).toContain('Inspect your account proof');expect(html).toContain('c'.repeat(64));expect(html).not.toMatch(/funding requirement|retention|witnessed breaths|become qualified/i);
});
it('does not grant earning from a supplied counter or a merely visible object',()=>{
 const html=render(parseQualificationProgress(unsignedQualificationFixture(),'owner'));
 expect(html).toContain('Seal, sign and publish');expect(html).not.toContain('Earn from Originals is on');expect(html).toContain('PBI');
});
