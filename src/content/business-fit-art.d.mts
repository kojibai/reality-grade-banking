export type FitArtObject={kind:string;title:string;lines:string[];variant:string};
export type FitArtStory={lines:string[];objects:FitArtObject[]};
export const businessFitArt:Record<string,FitArtStory>;
