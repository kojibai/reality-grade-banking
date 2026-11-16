import type {PublicPageMetadata} from '../../scripts/public-page-metadata.mjs';
export type ClientWorkPage={
 id:string;path:string;kind:string;slug?:string;niche?:string;title:string;description:string;intro:string;problem?:string;
 sections?:Array<{heading:string;paragraphs?:string[];bullets?:string[]}>;
 template?:string;example?:string;bankeiz?:string;related?:string[];keywords?:string[];
 sources?:Array<{label:string;url:string}>;entries?:ClientWorkPage[];
};
export const clientWorkPages:ClientWorkPage[];
export const clientWorkMetadata:PublicPageMetadata[];
