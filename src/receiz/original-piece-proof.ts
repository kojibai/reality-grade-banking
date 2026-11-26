import {openOriginalPieceDelivery, type OriginalPieceDelivery} from './original-piece-runtime.js';

export type OriginalPieceIdentity = Readonly<{keyId:string; artifactOwnerReceizId:string; identityOwnerReceizId?:string}>;

export function heldOriginalOwnerIds(binding:OriginalPieceIdentity):readonly string[] {
  const deviceName=/^receiz_device_([a-z0-9]{18,})$/u.exec(binding.identityOwnerReceizId??'')?.[1]?.slice(0,18);
  return [binding.artifactOwnerReceizId,...(deviceName?[`receiz_${deviceName}.receiz.id`]:[])];
}

export function holdsOriginalPieceDelivery(delivery:OriginalPieceDelivery,binding:OriginalPieceIdentity) {
  const owner=delivery.ownerReceizId;
  return heldOriginalOwnerIds(binding).includes(owner) && delivery.ancestry.some(({head:{command}})=>
    command.recipientReceizId===owner && command.recipientKeyId===binding.keyId ||
    command.senderReceizId===owner && command.senderKeyId===binding.keyId);
}

export async function verifyOriginalPieceArchive(file:File,binding:OriginalPieceIdentity) {
  const delivery=await openOriginalPieceDelivery(file);
  const received=holdsOriginalPieceDelivery(delivery,binding);
  const command=delivery.head.command;
  const sent=heldOriginalOwnerIds(binding).includes(command.senderReceizId)&&command.senderKeyId===binding.keyId;
  if(!received&&!sent)throw Error('BANK_ORIGINAL_PIECE_OWNER_MISMATCH');
  return {delivery,received};
}
