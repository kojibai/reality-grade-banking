type Page = {head:string;[key:string]:unknown};
type PackedPage = {head:string|(string|number)[];[key:string]:unknown};
export function compactNavigation(input:{pages:Record<string,Page>;bank:Page;[key:string]:unknown}):{pages:Record<string,PackedPage>;bank:PackedPage;styles:string[];[key:string]:unknown};
