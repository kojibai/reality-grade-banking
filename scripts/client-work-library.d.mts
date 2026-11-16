import type {ClientWorkPage} from '../src/content/client-work-library.mjs';
export function resourceDownload(page:ClientWorkPage):string;
export function renderClientWorkResource(page:ClientWorkPage,options?:{head?:string;footer?:string;footerCss?:string}):string;
export function writeClientWorkLibrary(options:{outdir:string;pages:ClientWorkPage[];head:(page:ClientWorkPage)=>string;footer:(path:string)=>string;footerCss?:string}):Promise<{pages:number;downloads:number}>;
