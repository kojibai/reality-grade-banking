import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { OfflineNotePreview } from '../src/features/notes/OfflineNotePreview';
it('presents exact denomination without claiming issuance, signature, serial or spendable proof', () => {
  const html = renderToStaticMarkup(<OfflineNotePreview amount="123.45" />);
  expect(html).toContain('$123.45'); expect(html).toContain('NOT ISSUED'); expect(html).toContain('Note preview');
  expect(html).not.toContain('data:'); expect(html).not.toContain('receiz.signature'); expect(html).not.toContain('claim?');
  expect(renderToStaticMarkup(<OfflineNotePreview amount="1.001" />)).toContain('Your amount');
});
