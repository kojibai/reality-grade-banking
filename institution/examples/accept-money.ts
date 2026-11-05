import type {ReceizClient} from '@receiz/sdk';

type Edge=ReceizClient['value']['edge'];
type AdmittedInput=Parameters<Edge['planReserve']>[0];
type CommittedRecoveryInput=Parameters<Edge['createRecovery']>[0];

// The host supplies admitted sources and binds the exact amount, rail,
// participant heads, application and consent. A plan is not a payment.
export async function inspectBothReceivers(edge:Edge,input:AdmittedInput){
 const wrapper=await edge.planReserve(input);
 await edge.inspect(wrapper.plan,{
  participantId:wrapper.sourceParticipantId,expectedRail:'reserve',
 });
 await edge.inspect(wrapper.plan,{
  participantId:wrapper.destinationParticipantId,expectedRail:'reserve',
 });
 return wrapper;
}

export async function prepareExactTransition(edge:Edge,set:unknown,applicationId:string){
 const verified=await edge.verifyTransitionSet(set,{audience:applicationId});
 return edge.prepareCommitSet(verified);
}

// Between preparation and recovery, the qualified host store must atomically
// commit ALL participants or NONE and retain real SDK-issued custody.
// No generic SQL callback or caller-created object can replace that boundary.
export async function receiveActuallyCommittedValue(
 edge:Edge,committed:CommittedRecoveryInput,senderParticipantId:string,receiverParticipantId:string,
){
 const recovery=await edge.createRecovery(committed);
 // The host must durably retain this exact recovery before confirmation.
 // These fragments expose SDK boundaries, not a complete host adapter.
 await edge.confirmReserveSend(recovery,{
  applicationId:committed.applicationId,
  participantId:senderParticipantId,
 });
 return edge.receiveReserve(recovery,{
  applicationId:committed.applicationId,participantId:receiverParticipantId,
 });
}
