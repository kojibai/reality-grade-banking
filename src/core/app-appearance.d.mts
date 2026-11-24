export type AppAppearance='system'|'light'|'dark';
export const APP_APPEARANCE_KEY:string;
export const APP_APPEARANCE_CHANGE:string;
export const APP_APPEARANCE_COLORS:Readonly<{light:string;dark:string}>;
export function installAppAppearance(browser:Window,key?:string,eventName?:string,colors?:Readonly<{light:string;dark:string}>):void;
export function readAppAppearance():AppAppearance;
export function setAppAppearance(mode:AppAppearance):void;
export function subscribeAppAppearance(subscriber:()=>void):()=>void;
