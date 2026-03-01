import { NextResponse } from 'next/server';

export interface Game {
  date: string;
  fullDate: Date | null;
  location: string;
  locationCode: string;
  locationAddress: string;
  time: string;
  opponent: string;
  result: string;
  isNoGame: boolean;
  isUpcoming: boolean;
}

// Schedule data from NY Urban (Team ID: 910085)
// Last updated: March 1, 2026
const scheduleData = [
  { date: 'Wed 12/10', locationCode: 'JR2', time: '7:00pm', opponent: 'Fidouchiaries', result: 'L 51-50' },
  { date: 'Mon 12/15', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Mon 01/05', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Wed 01/14', locationCode: 'LAG', time: '7:00pm', opponent: 'K-Crew', result: 'L 63-43' },
  { date: 'Tue 01/20', locationCode: 'JR2', time: '8:05pm', opponent: 'Winning Aint Easy', result: 'L 60-54' },
  { date: 'Wed 01/28', locationCode: 'W50', time: '9:15pm', opponent: 'One More Beer', result: 'W 53-37' },
  { date: 'Mon 02/02', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Mon 02/09', locationCode: 'JR3', time: '8:05pm', opponent: 'Eight-Niners', result: 'W 62-57' },
  { date: 'Wed 02/18', locationCode: 'RS', time: '8:10pm', opponent: 'Stay Me7o', result: 'L 69-47' },
  { date: 'Mon 02/23', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Mon 03/02', locationCode: 'JR3', time: '8:05pm', opponent: 'Fidouchiaries', result: '' },
  { date: 'Mon 03/09', locationCode: 'JR2', time: '7:00pm', opponent: 'One More Beer', result: '' },
  { date: 'Wed 03/18', locationCode: 'JR2', time: '9:10pm', opponent: 'Winning Aint Easy', result: '' },
  { date: 'Tue 03/24', locationCode: 'JR2', time: '9:10pm', opponent: 'K-Crew', result: '' },
];

// Location data with full addresses for map links
const locationAddresses: Record<string, { name: string; address: string }> = {
  'JR2': { name: 'Julia Richman (2nd floor Gym)', address: '305 East 68th Street, New York, NY 10065' },
  'JR3': { name: 'Julia Richman (3rd floor Gym)', address: '305 East 68th Street, New York, NY 10065' },
  'LAG': { name: 'LaGuardia H.S.', address: '100 Amsterdam Avenue, New York, NY 10023' },
  'W50': { name: 'W50th Street Campus', address: '525 West 50th Street, New York, NY 10019' },
  'RS': { name: 'Robert Simon', address: 'Avenue B & East 5th Street, New York, NY 10009' },
};

// Get date parts in New York timezone
function getNYDateParts(): { year: number; month: number; day: number } {
  const now = new Date();
  const year = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' }));
  const month = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'numeric' }));
  const day = parseInt(now.toLocaleString('en-US', { timeZone: 'America/New_York', day: 'numeric' }));
  return { year, month, day };
}

// Get today's date at midnight, using NY timezone for the date
function getTodayInNY(): Date {
  const { year, month, day } = getNYDateParts();
  return new Date(Date.UTC(year, month - 1, day));
}

function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/(\w+)\s+(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;

  const [, , month, day] = match;

  // Get current year/month in NY timezone for year rollover logic
  const { year: currentYear, month: currentMonth } = getNYDateParts();
  let year = currentYear;

  const monthNum = parseInt(month);

  // Handle year rollover for winter season spanning Dec-Mar
  if (monthNum >= 12 && currentMonth <= 3) {
    year = year - 1; // December games from previous year
  } else if (monthNum <= 3 && currentMonth >= 10) {
    year = year + 1; // Jan-Mar games for next year
  }

  // Use UTC to avoid timezone issues - all dates are just "calendar dates"
  return new Date(Date.UTC(year, monthNum - 1, parseInt(day)));
}

export async function GET() {
  try {
    // Get today's date in New York timezone for comparison
    // A game remains "upcoming" for the entire day in NY time
    const todayInNY = getTodayInNY();

    const games: Game[] = scheduleData.map((game) => {
      const isNoGame = game.opponent.includes('No Game');
      const fullDate = parseDate(game.date);
      const isUpcoming = fullDate ? fullDate >= todayInNY && !isNoGame && !game.result : false;

      const locationData = locationAddresses[game.locationCode];
      const locationName = locationData?.name || game.locationCode;
      const locationAddress = locationData?.address || '';

      return {
        date: game.date,
        fullDate,
        location: locationName,
        locationCode: game.locationCode,
        locationAddress,
        time: game.time,
        opponent: game.opponent,
        result: game.result,
        isNoGame,
        isUpcoming,
      };
    });

    // Sort by date
    games.sort((a, b) => {
      if (!a.fullDate || !b.fullDate) return 0;
      return a.fullDate.getTime() - b.fullDate.getTime();
    });

    return NextResponse.json({
      games,
      teamId: '910085',
      fetchedAt: new Date().toISOString(),
      source: 'https://www.nyurban.com/team-details/?team_id=910085',
    });
  } catch (error) {
    console.error('Error processing schedule:', error);
    return NextResponse.json(
      { error: 'Failed to process schedule' },
      { status: 500 }
    );
  }
}
