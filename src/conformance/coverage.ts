import coverage from './coverage.json';
export {coverage};
export type CoverageRow=typeof coverage.requirements[number];
export function sourceLink(path:string){return `https://github.com/kojibai/reality-grade-banking/blob/main/${path}`;}
