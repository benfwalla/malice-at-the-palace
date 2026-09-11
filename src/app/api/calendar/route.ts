import { NextRequest, NextResponse } from 'next/server';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Escape a value for an ICS text field per RFC 5545 (backslash, semicolon, comma, newlines).
function escapeICS(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Serves a single game as a downloadable .ics file. Apple Calendar (and Android's
// Google Calendar) reliably open a real text/calendar URL, whereas the older
// `data:` URI + download-attribute approach silently fails inside in-app browsers
// (links opened from Messages, Slack, Instagram, etc.) and some non-Safari browsers.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const opponent = sp.get('opponent') || 'Game';
  const dateISO = sp.get('date');
  const time = sp.get('time') || '';
  const location = sp.get('location') || '';
  const address = sp.get('address') || '';
  const notes = sp.get('notes') || '';

  if (!dateISO) return new NextResponse('Missing date', { status: 400 });
  const parsedDate = new Date(dateISO);
  if (isNaN(parsedDate.getTime())) return new NextResponse('Invalid date', { status: 400 });

  const timeMatch = time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!timeMatch) return new NextResponse('Invalid time', { status: 400 });

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const ampm = timeMatch[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  const year = parsedDate.getUTCFullYear();
  const month = parsedDate.getUTCMonth() + 1;
  const day = parsedDate.getUTCDate();

  // 1h30m duration, rolling minutes/hours over cleanly
  let endHours = hours + 1;
  let endMinutes = minutes + 30;
  if (endMinutes >= 60) {
    endMinutes -= 60;
    endHours += 1;
  }

  const dt = (h: number, m: number) => `${year}${pad(month)}${pad(day)}T${pad(h)}${pad(m)}00`;
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const title = `Malice at the Palace vs ${opponent}`;
  const loc = address || location;
  const details = `NY Urban League Basketball\n${location}${notes ? '\n' + notes : ''}`;
  const uid = `${year}${pad(month)}${pad(day)}-${opponent.replace(/\s+/g, '')}@malice-at-the-palace`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Malice at the Palace//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/New_York:${dt(hours, minutes)}`,
    `DTEND;TZID=America/New_York:${dt(endHours, endMinutes)}`,
    `SUMMARY:${escapeICS(title)}`,
    `LOCATION:${escapeICS(loc)}`,
    `DESCRIPTION:${escapeICS(details)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const body = lines.join('\r\n');
  const filename = `malice-vs-${opponent.replace(/\s+/g, '-')}.ics`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
