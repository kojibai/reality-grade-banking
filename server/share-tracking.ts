// Public share attribution is inert. Never use these values to select a source,
// change permissions or forward input to its reader; functional controls stay strict.
const shareTrackingKey=/^(?:utm_[a-z0-9_]{1,64}|fbclid|igsh|igshid|mibextid|gclid|dclid|gbraid|wbraid|msclkid|ttclid|twclid|li_fat_id|srsltid|mc_cid|mc_eid)$/;
export const isShareTrackingKey=(key:string)=>shareTrackingKey.test(key);
