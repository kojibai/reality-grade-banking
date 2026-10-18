import {expect,it} from 'vitest';
import {splitProofCaption} from '../src/features/media/proof-caption';

it('preserves plain caption text and paragraph breaks',()=>{
 expect(splitProofCaption('An exact note.\n\nAnother paragraph.')).toEqual({text:'An exact note.\n\nAnother paragraph.',links:[]});
});
it('separates safe destinations from prose and keeps sentence punctuation',()=>{
 expect(splitProofCaption('Read https://example.com/report. Then https://example.org/a_(b)!')).toEqual({text:'Read. Then!',links:['https://example.com/report','https://example.org/a_(b)']});
});
it('keeps meaningful markdown labels while extracting their destinations',()=>{
 expect(splitProofCaption('The [complete report](https://example.com/report?q=1) is available.')).toEqual({text:'The complete report is available.',links:['https://example.com/report?q=1']});
});
it('deduplicates normalized destination URLs without repeating pills',()=>{
 expect(splitProofCaption('https://EXAMPLE.com https://example.com/\n[Source](https://example.com/)')).toEqual({text:'Source',links:['https://example.com/']});
});
it('preserves unsupported schemes and malicious markup as inert text',()=>{
 const text="[Unsafe](javascript:alert(1)) ftp://example.com data:text/html,<script>alert(1)</script> javascript:https://example.com javascript:alert('https://evil.example')";
 expect(splitProofCaption(text)).toEqual({text,links:[]});
});
it('does not turn credential-bearing URLs into destination controls',()=>{
 expect(splitProofCaption('https://user:secret@example.com/file')).toEqual({text:'https://user:secret@example.com/file',links:[]});
});
it('keeps unmatched closing delimiters beside the prose rather than in a link',()=>{
 expect(splitProofCaption('(See https://example.com/report).')).toEqual({text:'(See).',links:['https://example.com/report']});
});
