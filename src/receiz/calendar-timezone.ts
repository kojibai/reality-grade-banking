/** Device display preference only; no lookup, location permission or clock. */
export function validCalendarTimezone(value:unknown):value is string{
 if(typeof value!=='string'||!value||value.length>80||!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)*$/.test(value))return false;
 try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format(0);return true;}catch{return false;}
}
export function deviceCalendarTimezone(){const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;return validCalendarTimezone(zone)?zone:'UTC';}
let supported:string[]|null=null;
export function calendarTimezoneOptions(selected:string){supported??=['UTC',...Intl.supportedValuesOf('timeZone')];return [...new Set([selected,...supported])];}
