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
}

const scheduleData = [
  { date: 'Mon 04/13', locationCode: 'NT', time: '8:10pm', opponent: 'Euknicks' },
  { date: 'Wed 04/22', locationCode: 'W50', time: '7:00pm', opponent: 'Silk Road Merchants' },
  { date: 'Tue 04/28', locationCode: 'BS', time: '9:15pm', opponent: 'Aye Yoo' },
];

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
    address: '20th Street, New York, NY 10010',
    notes: 'Bet 1st & 2nd. Enter on 20th street. No Spectators.',
  },
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
    const match = game.date.match(/(\w+)\s+(\d{1,2})\/(\d{1,2})/);
    const fullDate = match
      ? new Date(Date.UTC(year, parseInt(match[2]) - 1, parseInt(match[3])))
      : null;

    // Game is upcoming until 1 hour after its start time in NY
    let isUpcoming = false;
    if (fullDate) {
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
    };
  });

  return NextResponse.json({
    games,
    teamId: '738034',
    fetchedAt: new Date().toISOString(),
  });
}
