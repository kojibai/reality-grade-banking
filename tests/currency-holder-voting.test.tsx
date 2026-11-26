// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { HolderVote } from '../src/features/voting/HolderVote';
import type { Row } from '../src/receiz/governance-view';
import type { GovernanceOriginal } from '../src/receiz/governance-documents';
import type { OpenIdentity } from '../src/receiz/native-identity';
import { readHolderVoteStatus, type HolderVoteStatus } from '../src/receiz/currency-governance';

vi.mock('../src/receiz/currency-governance', () => ({ readHolderVoteStatus: vi.fn() }));

it('opens holder voting on request and takes the previous ballot from the accepted register', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  const root = createRoot(host);
  const charter = { digest: 'a'.repeat(64) } as Row<'charter'>;
  const proposal: Row<'proposal'> = {
    digest:'b'.repeat(64), pulse:'15000000', profileUid:null,
    document:{schema:'receiz.app.bankeiz.governance.public-document.v1',visibility:'public',author:'holder.receiz.id',accountUid:null,
      terms:{kind:'proposal',charter:charter.digest,title:'Pause sales',text:'Pause new sales for review.',decision:'Policy',choices:['Approve','Reject']}},
  };
  const original = { digest: charter.digest } as GovernanceOriginal;
  const read = vi.fn(async () => original), review = vi.fn();
  const identity = {} as OpenIdentity;
  const registration = 'c'.repeat(64), previous = 'd'.repeat(64);
  const empty = { savedOriginalSha256: null, acceptedOriginalSha256: null };
  const open: HolderVoteStatus = {
    phase: 'registration',
    window: { registrationOpensAtKai:'15000000', registrationClosesAtKai:'15017492',
      voteOpensAtKai:'15034983', voteClosesAtKai:'15052474', appealsCloseAtKai:'15069965' },
    registration: empty,
    ballot: empty,
  };
  const status = vi.mocked(readHolderVoteStatus);
  status.mockResolvedValueOnce(open)
    .mockResolvedValueOnce({ ...open, registration: { ...empty, savedOriginalSha256:registration } })
    .mockResolvedValueOnce({ ...open, phase:'voting',
      registration: { savedOriginalSha256:registration, acceptedOriginalSha256:registration },
      ballot: { savedOriginalSha256:previous, acceptedOriginalSha256:previous } });
  const click = async (label: string) => {
    const button = [...host.querySelectorAll('button')].find(element => element.textContent === label);
    expect(button).toBeTruthy();
    await act(async () => button!.click());
  };
  try {
    await act(async () => root.render(<HolderVote {...{ identity, charter, proposal, read, review }}/>));
    expect(read).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    await click('Check vote status');
    expect(status).toHaveBeenCalledWith(identity, original, proposal.digest);
    await click('Review registration');
    expect(review).toHaveBeenLastCalledWith({ kind:'registration', charter:charter.digest, proposal:proposal.digest });
    await click('Refresh vote status');
    expect(host.textContent).toContain('Your registration is awaiting admission.');
    expect(host.querySelector('form')).toBeNull();
    await click('Refresh vote status');
    expect(host.textContent).toContain('Your ballot is recorded.');
    const select = host.querySelector('select')!;
    await act(async () => {
      select.value = 'Reject';
      select.dispatchEvent(new Event('change', { bubbles:true }));
    });
    await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })));
    expect(review).toHaveBeenLastCalledWith({ kind:'ballot', charter:charter.digest, proposal:proposal.digest, choice:'Reject', previous });
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
