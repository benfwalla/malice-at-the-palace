import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TEAM_ID = '738034';
const OUR_TEAM = 'Malice at the Palace';
const SOURCE_URL = `https://www.nyurban.com/team-details/?team_id=${TEAM_ID}`;

// NY Urban may require a session cookie to return the team page.
const COOKIE = process.env.NYURBAN_COOKIE;

export interface Game {
  date: string;
  fullDate: string | null;
  location: string;
  locationCode: string;
  locationAddress: string;
  locationNotes: string;
  time: string;
  opponent: string;
  scheduleNote: string;
  result: string;        // e.g. "W 62-59", "L 56-43", "" if not yet played
  outcome: 'W' | 'L' | null;
  scoreFor: number | null;
  scoreAgainst: number | null;
  isUpcoming: boolean;
  isNoGame: boolean;
}

export interface Standing {
  team: string;
  wins: number;
  losses: number;
  percent: string;
  isOurTeam: boolean;
}

// Curated venue info — nicer, geocodable addresses (with ZIPs) than the
// abbreviated ones on the source page. Used to enrich scraped venues; any
// venue not listed here falls back to whatever the page provides.
const locationInfo: Record<string, { name: string; address: string; notes: string }> = {
  NT: {
    name: 'Norman Thomas',
    address: '111 E 33rd St, New York, NY 10016',
    notes: 'Bet Park & Lex. Gym is up on the 9th floor. No Bikes! No Spectators.',
  },
  W50: {
    name: 'W50th Street Campus',
    address: '525 W 50th St, New York, NY 10019',
    notes: 'B/w 10th/11th. Main entrance, middle of the block, down a few steps. Red doors. Gym is on the 5th floor. No spectators.',
  },
  BS: {
    name: 'Baruch Simon',
    address: '331 E 20th St, New York, NY 10010',
    notes: 'Enter on 20th street (bet 1st & 2nd). No Spectators.',
  },
  BEC: {
    name: 'Beacon HS',
    address: '522 W 44th St, New York, NY 10036',
    notes: 'Bet 10th & 11th Ave. Do not arrive at school before 6:15. Bring I.D. No Spectators or Children.',
  },
  BRN: {
    name: 'Brandeis H.S.',
    address: '145 W 84th St, New York, NY 10024',
    notes: 'Players may not enter the school before 8 PM. No Spectators. No Bikes. No Children!',
  },
  RSMA: {
    name: 'Riverside School Makers Artist',
    address: '300 W 61st St, New York, NY 10023',
    notes: 'Gym is on 2nd Floor. NO SPECTATORS.',
  },
  JR2: {
    name: 'Julia Richman (2nd floor Gym)',
    address: '305 E 68th St, New York, NY 10065',
    notes: 'At 2nd Ave. Enter on 68th through brown doors closest to 2nd Ave. No bikes. No Spectators.',
  },
  JR3: {
    name: 'Julia Richman (3rd floor Gym)',
    address: '305 E 68th St, New York, NY 10065',
    notes: 'At 2nd Ave. Enter via brown door on 68th off 2nd Ave. No entry before 7pm. No Bikes. No Spectators.',
  },
  RS: {
    name: 'Robert Simon',
    address: 'E 5th St & Ave B, New York, NY 10009',
    notes: 'Must enter and exit via Red Door on 5th St & Ave B. NO SPECTATORS!',
  },
};

// NY Urban occasionally publishes individual games after the schedule has
// already been shared with the team. Keep those confirmed games visible until
// they arrive on the source page.
const supplementalGames = [
  { date: 'Thu 09/17', locationCode: 'NT', time: '8:10pm', opponent: 'Giants' },
  {
    date: 'Thu 09/24',
    locationCode: 'NT',
    time: '8:10pm',
    opponent: '1 vs 4',
    scheduleNote: 'Playoff semifinal. Malice at the Palace seeding (1–4) is TBD.',
  },
  {
    date: 'Thu 09/24',
    locationCode: 'NT',
    time: '9:15pm',
    opponent: '2 vs 3',
    scheduleNote: 'Playoff semifinal. Malice at the Palace seeding (1–4) is TBD.',
  },
  {
    date: 'Mon 09/28',
    locationCode: 'NT',
    time: '9:15pm',
    opponent: 'Finals',
    scheduleNote: 'Playoff finals.',
  },
];

function getNowInNYMs(): number {
  const now = new Date();
  const nyStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(nyStr).getTime();
}

function getNYYear(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' }));
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  // Source times look like "8:10" (pm implied) or "8:10pm".
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let hours = parseInt(m[1]);
  const minutes = parseInt(m[2]);
  const ampm = (m[3] || '').toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  else if (ampm === 'am' && hours === 12) hours = 0;
  // No am/pm given: league games are evening games, treat single-digit/<8 as PM.
  else if (!ampm && hours < 12) hours += 12;
  return { hours, minutes };
}

// Normalize the source time ("8:10") into the display form ("8:10pm").
function displayTime(timeStr: string): string {
  const t = timeStr.trim();
  if (!t) return '';
  if (/(am|pm)$/i.test(t)) return t.toLowerCase();
  const parsed = parseTime(t);
  if (!parsed) return t;
  const ampm = parsed.hours >= 12 ? 'pm' : 'am';
  let h = parsed.hours % 12;
  if (h === 0) h = 12;
  return `${h}:${String(parsed.minutes).padStart(2, '0')}${ampm}`;
}

function parseResult(raw: string): {
  outcome: 'W' | 'L' | null;
  scoreFor: number | null;
  scoreAgainst: number | null;
} {
  const text = raw.trim();
  const m = text.match(/^([WL])\s+(\d+)\s*-\s*(\d+)/i);
  if (m) {
    const outcome = m[1].toUpperCase() as 'W' | 'L';
    const a = parseInt(m[2]);
    const b = parseInt(m[3]);
    // Source lists the higher score first; orient to our team via W/L.
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return {
      outcome,
      scoreFor: outcome === 'W' ? hi : lo,
      scoreAgainst: outcome === 'W' ? lo : hi,
    };
  }
  const f = text.match(/^([WL])\b/i);
  return { outcome: f ? (f[1].toUpperCase() as 'W' | 'L') : null, scoreFor: null, scoreAgainst: null };
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// cheerio's HTML parser inserts an implicit <tbody>, so a table's rows live
// under <tbody>, not as direct <tr> children. Grab the top-level rows only
// (nested popup tables keep their rows in their own tbody, so they're excluded).
function topRows($: cheerio.CheerioAPI, $table: ReturnType<typeof $>) {
  const body = $table.children('tbody');
  return body.length ? body.children('tr') : $table.children('tr');
}

// Pull the cleanest available address out of a map.php link, falling back to
// the abbreviated street line printed in the popup.
function addressFromMapLink(href: string | undefined, fallback: string): string {
  if (!href) return fallback;
  const m = href.match(/[?&]address=([^&]+)/);
  if (!m) return fallback;
  let addr = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
  // Some links read "525 West 50th Street,10019" — tidy the comma + add city.
  addr = addr.replace(/\s*,\s*/g, ', ').replace(/,\s*$/, '');
  if (/\b\d{5}\b/.test(addr) && !/New York/i.test(addr)) {
    addr = addr.replace(/,?\s*(\d{5})\b/, ', New York, NY $1');
  }
  return addr || fallback;
}

function parseSchedule($: cheerio.CheerioAPI): Game[] {
  // Find the schedule table: header row reads Date / Location / Time / Opponent
  // / Results, and it is NOT the playoff bracket table.
  let scheduleTable: ReturnType<typeof $> | null = null;
  let bestRows = -1;

  $('table').each((_, table) => {
    const $table = $(table);
    if ($table.closest('.playoffscontent').length) return;
    const rows = topRows($, $table);
    const headerCells = rows
      .first()
      .children('td')
      .map((_, td) => cleanText($(td).text()).toLowerCase())
      .get();
    const looksLikeSchedule =
      headerCells.includes('date') &&
      headerCells.includes('location') &&
      headerCells.includes('time') &&
      headerCells.includes('opponent');
    if (!looksLikeSchedule) return;

    const dateRows = rows.filter((_, tr) =>
      /\b\d{1,2}\/\d{1,2}\b/.test(cleanText($(tr).children('td').first().text()))
    ).length;
    if (dateRows > bestRows) {
      bestRows = dateRows;
      scheduleTable = $table;
    }
  });

  const year = getNYYear();
  const nowMs = getNowInNYMs();
  const games: Game[] = [];

  if (scheduleTable) {
    topRows($, scheduleTable as ReturnType<typeof $>).each((_, tr) => {
      const cells = $(tr).children('td');
      if (cells.length < 4) return; // header / spacer

      const dateText = cleanText(cells.eq(0).text());
      const dateMatch = dateText.match(/(\w+)\s+(\d{1,2})\/(\d{1,2})/);
      if (!dateMatch) return; // not a game row

      const locationCell = cells.eq(1);
      const timeText = cleanText(cells.eq(2).text());
      const opponentCell = cells.eq(3);
      const resultText = cells.length >= 5 ? cleanText(cells.eq(4).text()) : '';

      // Location code = the first anchor's text in the location cell.
      const locationCode = cleanText(locationCell.find('a').first().text());

      // Opponent name = first anchor in the opponent cell (drop "*** ... ***").
      let opponent = cleanText(opponentCell.find('a').first().text());
      opponent = opponent.replace(/\*+/g, '').trim();
      const isNoGame = !locationCode && /no game/i.test(opponent);

    // Scraped venue details from the location popup, as a fallback.
    const scrapedName = cleanText(locationCell.find('.poup_cls strong').first().text());
    const mapHref = locationCell
      .find('a.maplink')
      .first()
      .attr('href');
    const popupCellHtml = locationCell.find('.poup_cls table td').first().html() || '';
    const popupLines = popupCellHtml
      .split(/<br\s*\/?>/i)
      .map((line) => cleanText(line.replace(/<[^>]*>/g, '')))
      .filter(Boolean);
    // popupLines[0] = name, [1] = street, [2] = notes (when present)
    const scrapedAddress = popupLines[1] || '';
    const scrapedNotes = popupLines[2] || '';

    const curated = locationInfo[locationCode];
    const location = curated?.name || scrapedName || locationCode;
    const locationAddress = curated?.address || addressFromMapLink(mapHref, scrapedAddress);
    const locationNotes = curated?.notes || scrapedNotes;

    const fullDate = new Date(
      Date.UTC(year, parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]))
    );

    let isUpcoming = false;
    if (!isNoGame) {
      const parsed = parseTime(timeText);
      const gameStartMs = new Date(
        fullDate.getUTCFullYear(),
        fullDate.getUTCMonth(),
        fullDate.getUTCDate(),
        parsed?.hours ?? 23,
        parsed?.minutes ?? 59
      ).getTime();
      const cutoffMs = gameStartMs + 60 * 60 * 1000;
      isUpcoming = nowMs < cutoffMs;
    }

    const { outcome, scoreFor, scoreAgainst } = parseResult(resultText);

    games.push({
      date: dateText,
      fullDate: fullDate.toISOString(),
      location,
      locationCode,
      locationAddress,
      locationNotes,
      time: displayTime(timeText),
      opponent: isNoGame ? 'No Game This Week' : opponent,
      scheduleNote: '',
      result: resultText,
      outcome,
      scoreFor,
      scoreAgainst,
      isUpcoming,
      isNoGame,
    });
    });
  }

  for (const game of supplementalGames) {
    // Do not duplicate a game once NY Urban has added it to its schedule.
    if (games.some((existing) =>
      existing.date === game.date && existing.time === game.time && existing.opponent === game.opponent
    )) {
      continue;
    }

    const [, month, day] = game.date.match(/\w+\s+(\d{1,2})\/(\d{1,2})/) || [];
    if (!month || !day) continue;

    const fullDate = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));
    const parsedTime = parseTime(game.time);
    const gameStartMs = new Date(
      fullDate.getUTCFullYear(),
      fullDate.getUTCMonth(),
      fullDate.getUTCDate(),
      parsedTime?.hours ?? 23,
      parsedTime?.minutes ?? 59
    ).getTime();
    const venue = locationInfo[game.locationCode];

    games.push({
      date: game.date,
      fullDate: fullDate.toISOString(),
      location: venue?.name || game.locationCode,
      locationCode: game.locationCode,
      locationAddress: venue?.address || '',
      locationNotes: venue?.notes || '',
      time: game.time,
      opponent: game.opponent,
      scheduleNote: game.scheduleNote || '',
      result: '',
      outcome: null,
      scoreFor: null,
      scoreAgainst: null,
      isUpcoming: nowMs < gameStartMs + 60 * 60 * 1000,
      isNoGame: false,
    });
  }

  return games.sort((a, b) => {
    if (!a.fullDate || !b.fullDate) return 0;
    return new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime();
  });
}

function parseStandings($: cheerio.CheerioAPI): Standing[] {
  let standingsTable: ReturnType<typeof $> | null = null;

  $('table').each((_, table) => {
    if (standingsTable) return;
    const $table = $(table);
    const headerCells = topRows($, $table)
      .first()
      .children('td')
      .map((_, td) => cleanText($(td).text()).toLowerCase())
      .get();
    if (
      headerCells.includes('team name') &&
      headerCells.includes('wins') &&
      headerCells.includes('losses')
    ) {
      standingsTable = $table;
    }
  });

  if (!standingsTable) return [];

  const standings: Standing[] = [];
  topRows($, standingsTable as ReturnType<typeof $>).each((_, tr) => {
    const cells = $(tr).children('td');
    if (cells.length < 5) return;

    // Team name lives in a .poup_cls div whose first text node is the name
    // (followed by a hidden results popup we must strip out).
    const nameCell = cells.eq(1);
    const poup = nameCell.find('.poup_cls').first();
    let team = '';
    if (poup.length) {
      const clone = poup.clone();
      clone.children().remove();
      team = cleanText(clone.text());
    } else {
      team = cleanText(nameCell.text());
    }
    if (!team || /team name/i.test(team)) return;

    const wins = parseInt(cleanText(cells.eq(2).text())) || 0;
    const losses = parseInt(cleanText(cells.eq(3).text())) || 0;
    const percent = cleanText(cells.eq(4).text());

    standings.push({
      team,
      wins,
      losses,
      percent,
      isOurTeam: team.toLowerCase() === OUR_TEAM.toLowerCase(),
    });
  });

  return standings;
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    };
    if (COOKIE) headers.cookie = COOKIE;

    const res = await fetch(SOURCE_URL, {
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Source returned ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const games = parseSchedule($);
    const standings = parseStandings($);

    if (games.length === 0) {
      throw new Error('No games found — the source page layout may have changed.');
    }

    return NextResponse.json(
      {
        games,
        standings,
        teamId: TEAM_ID,
        teamName: OUR_TEAM,
        sourceUrl: SOURCE_URL,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to load schedule',
        games: [],
        standings: [],
        teamId: TEAM_ID,
        teamName: OUR_TEAM,
        sourceUrl: SOURCE_URL,
        fetchedAt: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
