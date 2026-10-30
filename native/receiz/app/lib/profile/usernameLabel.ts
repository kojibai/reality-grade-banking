/** Display only. Full Receiz IDs remain unchanged in identity, routes and payments. */
export const profileUsernameLabel=(username:string|null|undefined):string=>(username??"").replace(/^receiz_/u,"");
