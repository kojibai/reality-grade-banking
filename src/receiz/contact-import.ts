// Existing Receiz Contacts CSV mechanics, composed with the same native import.
function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? "";
    const next = input[index + 1] ?? "";

    if (char === "\"") {
      if (quoted && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((entry) => entry.trim())) rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function headerValue(headers: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const match = headers[normalizeHeader(alias)];
    if (match) return match.trim();
  }
  return "";
}


const fields=['id','linkedUserId','identityKind','identitySource','visitorKey','threadKey','entityType','fullName','company','role','email','phone','emails','phones','interestTags','profileSummary','location','tags','notes','nextStep','stage','source','inviteStatus','lastMeetingOn','lastInteractionAt','ownerMessages','twinMessages','createdAt','updatedAt','interactions'];
const plain=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('CONTACT_IMPORT_INVALID');return Object.fromEntries(Object.entries(v).filter(([key])=>fields.includes(key)));};
export function parseOrganizerContactsFile(name:string,text:string):{source:'json'|'csv'|'vcard';contacts:Record<string,unknown>[]} {
 if(text.length>5*1024*1024)throw Error('CONTACT_IMPORT_CAPACITY');let source:'json'|'csv'|'vcard',contacts:Record<string,unknown>[];
 if(/\.vcf$|\.vcard$/i.test(name)||/^BEGIN:VCARD/im.test(text)){source='vcard';contacts=text.split(/BEGIN:VCARD/i).filter(chunk=>/END:VCARD/i.test(chunk)).map(chunk=>{const row:Record<string,unknown>={};for(const line of chunk.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'').split('\n')){const colon=line.indexOf(':');if(colon<0)continue;const key=line.slice(0,colon).split(';')[0].toUpperCase(),value=line.slice(colon+1).replace(/\\n/g,'\n').trim(),field=({FN:'fullName',ORG:'company',TITLE:'role',EMAIL:'email',TEL:'phone',NOTE:'notes'} as Record<string,string>)[key];if(field&&value&&!row[field])row[field]=value;}return row;});}
 else if(/\.csv$/i.test(name)){source='csv';const rows=csvRows(text),headers=rows.shift()??[];contacts=rows.map(row=>{const record=Object.fromEntries(headers.map((header,i)=>[normalizeHeader(header),row[i]??''])),get=(...aliases:string[])=>headerValue(record,aliases);return{fullName:get('full name','name','display name')||[get('first name','firstname','given name'),get('last name','lastname','family name')].filter(Boolean).join(' '),email:get('email','email address','e-mail','email1value'),phone:get('phone','phone number','mobile','mobile phone','tel'),company:get('company','organization','org'),role:get('title','job title','role'),location:get('location','city','address'),notes:get('notes','note'),nextStep:get('next step','nextstep'),tags:get('tags','labels').split(',').map(v=>v.trim()).filter(Boolean)};});}
 else{source='json';const raw=JSON.parse(text),rows=Array.isArray(raw)?raw:raw?.contacts;if(!Array.isArray(rows))throw Error('CONTACT_IMPORT_INVALID');contacts=rows.map(plain);}
 contacts=contacts.filter(row=>row.fullName||row.email||row.phone);if(!contacts.length||contacts.length>5000)throw Error('CONTACT_IMPORT_INVALID');return{source,contacts};
}
