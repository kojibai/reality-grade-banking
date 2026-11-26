/** Discovery coordinates for the existing registered identity reader. */
export function parseOriginalReceivingAddress(value: string) {
  const match = /^(receiz_[a-z0-9]{18})\.receiz\.id#([a-f0-9]{64})$/u.exec(value.trim());
  return match ? { username: match[1], ownerReceizId: `${match[1]}.receiz.id`, keyId: match[2] } : null;
}
