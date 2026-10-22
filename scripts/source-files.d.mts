export function hash(bytes:Uint8Array|string):string;
export function sourceFiles():Promise<{path:string;bytes:Buffer;sha256:string;mode:number}[]>;
