import type {Plugin} from 'vite';
export function writeOriginalsQualificationAssets(directory?:string):Promise<{css:string;head:string}>;
export function originalsQualificationDevPlugin():Plugin;
