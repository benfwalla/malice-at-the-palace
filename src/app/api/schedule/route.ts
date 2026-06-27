import { NextResponse } from 'next/server';

export interface Game {
  date: string;
  fullDate: Date | null;
  location: string;
  locationCode: string;
  locationAddress: string;
  locationNotes: string;
  time: string;
  opponent: string;
  isUpcoming: boolean;
  isNoGame: boolean;
}

const scheduleData = [
  { date: 'Tue 06/30', locationCode: 'RS', time: '8:10pm', opponent: 'Bison NYC' },
  { date: 'Mon 07/06', locationCode: '', time: '', opponent: 'No Game This Week' },
  { date: 'Wed 07/15', locationCode: 'W50', time: '8:10pm', opponent: 'Giants' },
];

// Persistent location lookup, accumulated across seasons. This is NOT cleared when
// the schedule changes — only `scheduleData` above gets swapped each new season.
// The key is the alias NY Urban uses on their website (the code shown in the
// Location column on the schedule page), mapping to the full name, address, and
// gym-specific notes. `alias` mirrors the key for explicitness.
const locationInfo: Record<string, { alias: string; name: string; address: string; notes: string }> = {
  NT: {
    alias: 'NT',
    name: 'Norman Thomas',
    address: '111 E 33rd St, New York, NY 10016',
    notes: 'Bet Park & Lex. Gym is up on the 9th floor. No Bikes! No Spectators.',
  },
  W50: {
    alias: 'W50',
    name: 'W50th Street Campus',
    address: '525 W 50th St, New York, NY 10019',
    notes: 'B/w 10th/11th. Main entrance, middle of the block, down a few steps. Red doors. Gym is on the 5th floor. No spectators.',
  },
  BS: {
    alias: 'BS',
    name: 'Baruch Simon',
    address: '20th Street (bet 1st & 2nd), New York, NY 10010',
    notes: 'Enter on 20th street. No Spectators.',
  },
  BEC: {
    alias: 'BEC',
    name: 'Beacon HS',
    address: '522 W 44th St, New York, NY 10036',
    notes: 'Bet 10th & 11th Ave. Do not arrive before 7:15. Bring I.D. No Spectators or Children.',
  },
  JR2: {
    alias: 'JR2',
    name: 'Julia Richman (2nd floor Gym)',
    address: '305 E 68th St, New York, NY 10065',
    notes: 'At 2nd Ave. Enter on 68th through brown doors closest to 2nd Ave. No bikes. No Spectators.',
  },
  JR3: {
    alias: 'JR3',
    name: 'Julia Richman (3rd floor Gym)',
    address: '305 E 68th St, New York, NY 10065',
    notes: 'At 2nd Ave. Enter via brown door on 68th off 2nd Ave. No entry before 7pm. No Bikes. No Spectators.',
  },
  // RS (Robert Simon) — used by the Summer 2026 schedule (Tue 06/30 vs Bison NYC).
  // TODO: address + notes pending from Ben; full name confirmed as "Robert Simon".
};

// Get current time in NY as a Unix timestamp (ms)
function getNowInNYMs(): number {
  const now = new Date();
  const nyStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(nyStr).getTime();
}

function getNYYear(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' }));
}

// Parse "8:10pm" into { hours24, minutes }
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const m = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return null;
  let hours = parseInt(m[1]);
  const minutes = parseInt(m[2]);
  const ampm = m[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
}

export async function GET() {
  const year = getNYYear();
  const nowMs = getNowInNYMs();

  const games: Game[] = scheduleData.map((game) => {
    const isNoGame = !game.locationCode;
    const match = game.date.match(/(\w+)\s+(\d{1,2})\/(\d{1,2})/);
    const fullDate = match
      ? new Date(Date.UTC(year, parseInt(match[2]) - 1, parseInt(match[3])))
      : null;

    // Game is upcoming until 1 hour after its start time in NY
    let isUpcoming = false;
    if (fullDate && !isNoGame) {
      const parsed = parseTime(game.time);
      const gameStartMs = new Date(
        fullDate.getUTCFullYear(), fullDate.getUTCMonth(), fullDate.getUTCDate(),
        parsed?.hours ?? 23, parsed?.minutes ?? 59
      ).getTime();
      const cutoffMs = gameStartMs + 60 * 60 * 1000;
      isUpcoming = nowMs < cutoffMs;
    }

    const loc = locationInfo[game.locationCode];

    return {
      date: game.date,
      fullDate,
      location: loc?.name || game.locationCode,
      locationCode: game.locationCode,
      locationAddress: loc?.address || '',
      locationNotes: loc?.notes || '',
      time: game.time,
      opponent: game.opponent,
      isUpcoming,
      isNoGame,
    };
  });

  return NextResponse.json({
    games,
    teamId: '738034',
    fetchedAt: new Date().toISOString(),
  });
}
