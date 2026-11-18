const cursor=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)~([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i;
export function governanceCursorKey(value:unknown):string|null{
  if(typeof value!=='string')return null;
  const parts=cursor.exec(value);
  return parts?parts[1]+'.'+(parts[2]??'').padEnd(6,'0')+'~'+parts[3].toLowerCase():null;
}
