export interface PublicIllustration{key:string;src:string;width:number;height:number;alt:string}
export const publicIllustrations:readonly PublicIllustration[];
export function publicIllustration(page:unknown):PublicIllustration|null;
