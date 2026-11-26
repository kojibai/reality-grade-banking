export {decodeNavigationEnvelope,sharedExampleMarkup} from "../src/presentation/navigation-envelope.mjs";
export function encodeNavigationEnvelope(navigation: unknown,shared?:string,options?:{preferSmaller?:boolean}): {format:string;decodedBytes:number;data:string};
export function navigationScript(navigation: unknown,shared?:string,options?:{preferSmaller?:boolean}):string;
