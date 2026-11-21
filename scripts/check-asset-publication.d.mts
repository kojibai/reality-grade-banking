export function assetPublicationContracts(path:string,source:string,names:readonly string[]):Record<string,string>;
export function assertFrozenAssetPublicationSource(path:string,source:string,expected:Record<string,string>):void;
export function checkFrozenAssetPublication():Promise<void>;
