import {members,rows} from './collection';

export const governanceExampleSlug = 'harbor-tool-library';
export const governanceExampleName = 'Harbor Tool Library';
export const governanceExampleRows = rows;

const originals = new Set(rows.map(row=>row.digest));

export function exampleMemberName(owner: string): string {
  return Object.hasOwn(members, owner) ? members[owner] : owner;
}

export function exampleOriginalUrl(digest: string): string | null {
  return originals.has(digest) ? '/vote/examples/harbor-tool-library/originals/' + digest + '.original' : null;
}
