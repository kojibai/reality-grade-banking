import {validCalendarTimezone} from './calendar-timezone';

export type MessageAppointmentCandidate=Readonly<{startAt:string;endAt:string;timezone:string;label:string}>;
type Wall={year:number;month:number;day:number;hour:number;minute:number};
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const monthPattern='(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const datePattern=`(?:\\d{4}-\\d{2}-\\d{2}|${monthPattern}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+${monthPattern}\\.?(?:\\s+\\d{4})?|today|tomorrow|${weekdays.join('|')})`;
const timePattern='(?:\\d{1,2}(?::[0-5]\\d)?[ \\t]*[ap]\\.?m\\.?|(?:[01]\\d|2[0-3]):[0-5]\\d)';
const timeStart=new RegExp(`^(${timePattern})(?![\\w:])`,'i');
const durationStart=/^\s+for\s+(\d{1,3}(?:\.5)?)\s*(minutes?|mins?|hours?|hrs?)\b/i;
const ambiguousZoneStart=/^\s+(?:EST|EDT|ET|CST|CDT|CT|MST|MDT|MT|PST|PDT|PT|AKST|AKDT|HST|HDT|CET|CEST|BST|IST|GMT|Eastern|Central|Mountain|Pacific)\b/i;

function wallAt(instant:number,formatter:Intl.DateTimeFormat):Wall{
 const fields=Object.fromEntries(formatter.formatToParts(instant).map(part=>[part.type,part.value]));
 return{year:Number(fields.year),month:Number(fields.month),day:Number(fields.day),hour:Number(fields.hour),minute:Number(fields.minute)};
}
function validDay(wall:Wall){const date=new Date(Date.UTC(wall.year,wall.month-1,wall.day));return wall.year>=1000&&wall.year<=9999&&date.getUTCFullYear()===wall.year&&date.getUTCMonth()===wall.month-1&&date.getUTCDate()===wall.day;}
function wallNumber(wall:Wall){return Date.UTC(wall.year,wall.month-1,wall.day,wall.hour,wall.minute);}
/** Intl supplies the installed timezone rules. Check both sides of a transition:
 * zero matches is a skipped wall time; two matches is an ambiguous wall time. */
function instantAt(wall:Wall,formatter:Intl.DateTimeFormat):number|null{
 if(!validDay(wall))return null;
 const nominal=wallNumber(wall),offsets=new Set<number>();
 for(const hours of [-36,-12,0,12,36]){const probe=nominal+hours*3600000;offsets.add(wallNumber(wallAt(probe,formatter))-probe);}
 const matches=[...offsets].map(offset=>nominal-offset).filter(instant=>wallNumber(wallAt(instant,formatter))===nominal);
 return matches.length===1?matches[0]:null;
}
function clock(value:string):{hour:number;minute:number}|null{
 const match=/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i.exec(value);
 if(match){const hour=Number(match[1]);return hour>=1&&hour<=12?{hour:hour%12+(match[3].toLowerCase()==='p'?12:0),minute:Number(match[2]??0)}:null;}
 const match24=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
 return match24?{hour:Number(match24[1]),minute:Number(match24[2])}:null;
}
function day(value:string,reference:Wall):Wall|null{
 const lower=value.toLowerCase(),base={...reference,hour:0,minute:0};
 if(lower==='today')return base;
 if(lower==='tomorrow'||weekdays.includes(lower)){
  const weekday=new Date(wallNumber(base)).getUTCDay(),distance=lower==='tomorrow'?1:(weekdays.indexOf(lower)-weekday+7)%7;
  const date=new Date(wallNumber(base)+distance*86400000);return{...base,year:date.getUTCFullYear(),month:date.getUTCMonth()+1,day:date.getUTCDate()};
 }
 const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(iso)return{...base,year:Number(iso[1]),month:Number(iso[2]),day:Number(iso[3])};
 const pieces=lower.replace(/(\d)(?:st|nd|rd|th)\b/g,'$1').replace(/[,.]/g,'').split(/\s+/),month=months.findIndex(name=>name.startsWith(pieces[0]))+1;
 if(month)return{...base,year:pieces[2]?Number(pieces[2]):reference.year,month,day:Number(pieces[1])};
 const named=months.findIndex(name=>name.startsWith(pieces[1]))+1;
 return named?{...base,year:pieces[2]?Number(pieces[2]):reference.year,month:named,day:Number(pieces[0])}:null;
}

/** Suggestions only. No clock, network, organizer write or interpretation of
 * numeric locale dates. Relative words always use the message's reference. */
export function findMessageAppointments({body,referenceAt,timezone}:{body:string;referenceAt:string;timezone:string}):readonly MessageAppointmentCandidate[]{
 if(typeof body!=='string'||body.length>16384||!validCalendarTimezone(timezone)||typeof referenceAt!=='string'||referenceAt.length>40||!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(referenceAt)||!Number.isFinite(Date.parse(referenceAt)))return[];
 const reference=Date.parse(referenceAt),formatters=new Map<string,Intl.DateTimeFormat>();
 const formatter=(zone:string)=>{let value=formatters.get(zone);if(!value){value=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});formatters.set(zone,value);}return value;};
 const candidates:MessageAppointmentCandidate[]=[],seen=new Set<string>(),dates=new RegExp(`\\b(${datePattern})(?=T|\\b)`,'gi');
 for(const match of body.matchAll(dates)){
  if(candidates.length>=5)break;
  const before=body.slice(Math.max(0,match.index-24),match.index);
  if(/[\w/:\-]$/.test(before)||/\b(?:next|last|not)\s+$/i.test(before))continue;
  let rest=body.slice(match.index+match[0].length),zone=timezone,start:number|null=null,end:number|null=null,statedMinutes:number|null=null;
  const parts=day(match[0],wallAt(reference,formatter(zone)));if(!parts||!validDay(parts))continue;
  const iso=/^T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)(?![\w:+-])/i.exec(rest);
  if(iso){start=Date.parse(match[0]+iso[0]);rest=rest.slice(iso[0].length);}
  else{
   const join=/^(?:T|\s+(?:at\s+)?|,\s*(?:at\s+)?)/i.exec(rest);if(!join)continue;
   rest=rest.slice(join[0].length);const time=timeStart.exec(rest),parsed=time?clock(time[1]):null;if(!time||!parsed)continue;
   rest=rest.slice(time[0].length);let endClock:ReturnType<typeof clock>=null;
   const range=/^\s*(?:[–—-]|to\b)\s*/i.exec(rest);
   if(range){rest=rest.slice(range[0].length);const finish=timeStart.exec(rest);endClock=finish?clock(finish[1]):null;if(!finish||!endClock)continue;rest=rest.slice(finish[0].length);}
   const duration=durationStart.exec(rest);
   if(duration){statedMinutes=Number(duration[1])*(/^h/i.test(duration[2])?60:1);rest=rest.slice(duration[0].length);}
   const suffix=/^\s+(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+)\b/i.exec(rest);
   if(suffix){const proposed=/^utc$/i.test(suffix[1])?'UTC':suffix[1];if(!validCalendarTimezone(proposed))continue;zone=proposed;rest=rest.slice(suffix[0].length);}
   // Abbreviations such as CST have multiple meanings. Never discard one and
   // silently reinterpret the proposal in the device's timezone.
   if(ambiguousZoneStart.test(rest)||/^\s+[A-Z]{2,5}\b/.test(rest)||/^[:+\d]/.test(rest))continue;
   const resolvedDay=day(match[0],wallAt(reference,formatter(zone)));if(!resolvedDay)continue;
   start=instantAt({...resolvedDay,...parsed},formatter(zone));
   if(endClock)end=instantAt({...resolvedDay,...endClock},formatter(zone));
   if(endClock&&(end===null||start===null||end<=start))continue;
  }
  if(start===null||!Number.isFinite(start)||start<=reference)continue;
  const duration=durationStart.exec(rest);
  const minutes=statedMinutes??(duration?Number(duration[1])*(/^h/i.test(duration[2])?60:1):30);
  if(minutes<=0||minutes>480)continue;
  end??=start+minutes*60000;if(end-start>480*60000)continue;
  const key=start+':'+end;if(seen.has(key))continue;seen.add(key);
  candidates.push({startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString(),timezone:zone,label:new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(start)});
 }
 return candidates;
}
