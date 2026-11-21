import {lazy, Suspense, type ComponentProps} from 'react';
import {InlineOpening} from '../../components/InlineOpening';
import {Sheet} from '../../components/Sheet';
import './profile-voting-sheet.css';

const VotingBoard=lazy(()=>import('./VotingBoard').then(module=>({default:module.VotingBoard})));
type VotingProfile=NonNullable<ComponentProps<typeof VotingBoard>['profile']>;

export function ProfileVotingSheet({profile,isOwner,active=true,onClose}:{
  profile:VotingProfile;isOwner:boolean;active?:boolean;onClose:()=>void;
}) {
  return <Sheet
    active={active}
    className={isOwner?'profile-voting-workspace':undefined}
    title={isOwner?'Your voting dashboard':'Public voting record'}
    navigation="back"
    onClose={onClose}
  >
    <Suspense fallback={<InlineOpening label="Opening voting records"/>}>
      <VotingBoard key={profile.uid+':'+isOwner} profile={profile} activeWorkspace={active}/>
    </Suspense>
  </Sheet>;
}
