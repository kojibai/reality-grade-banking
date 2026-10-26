// Presentation-only calendar export, using the existing Receiz ICS format and event UID.
export type CalendarIcsEvent = {
  id: string;
  title: string;
  startAt: Date | string;
  endAt: Date | string;
  note?: string;
  location?: string;
  fallbackDescription?: string;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function makeIcsTimestamp(value: Date | string): string {
  const date = asDate(value);
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendarEventIcs(event: CalendarIcsEvent): string {
  const description = event.note?.trim() || event.fallbackDescription?.trim() || "Receiz calendar event";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Receiz//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@receiz.com`,
    `DTSTAMP:${makeIcsTimestamp(new Date())}`,
    `DTSTART:${makeIcsTimestamp(event.startAt)}`,
    `DTEND:${makeIcsTimestamp(event.endAt)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(event.location?.trim() || "Receiz")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function calendarEventIcsFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "event"}.ics`;
}
