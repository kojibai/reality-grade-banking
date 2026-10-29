export const baselineRoot:URL;
export function baselineHash(bytes:Uint8Array|string):string;
export function baselineInputs():Promise<Array<{path:string;sha256:string;mtimeMs:number}>>;
