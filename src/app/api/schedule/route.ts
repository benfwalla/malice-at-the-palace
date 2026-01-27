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
// Last updated: January 27, 2026
const scheduleData = [
  { date: 'Wed 12/10', locationCode: 'JR2', time: '7:00', opponent: 'Fidouchiaries', result: 'L 51-50' },
  { date: 'Mon 12/15', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Mon 01/05', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Wed 01/14', locationCode: 'LAG', time: '7:00', opponent: 'K-Crew', result: 'L 63-43' },
  { date: 'Tue 01/20', locationCode: 'JR2', time: '8:05', opponent: 'Winning Aint Easy', result: 'L 60-54' },
  { date: 'Wed 01/28', locationCode: 'W50', time: '9:15', opponent: 'One More Beer', result: '' },
  { date: 'Mon 02/02', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Mon 02/09', locationCode: 'JR3', time: '8:05', opponent: 'Eight-Niners', result: '' },
  { date: 'Wed 02/18', locationCode: 'RS', time: '8:10', opponent: 'Stay Me7o', result: '' },
  { date: 'Mon 02/23', locationCode: '', time: '', opponent: '*** No Game This Week', result: '' },
  { date: 'Mon 03/02', locationCode: 'JR3', time: '8:05', opponent: 'TBD', result: '' },
  { date: 'Mon 03/09', locationCode: 'JR2', time: '7:00', opponent: 'TBD', result: '' },
  { date: 'Wed 03/18', locationCode: 'JR2', time: '9:10', opponent: 'TBD', result: '' },
  { date: 'Tue 03/24', locationCode: 'JR2', time: '9:10', opponent: 'TBD', result: '' },
];

// Location data with full addresses for map links
const locationAddresses: Record<string, { name: string; address: string }> = {
  'JR2': { name: 'Julia Richman (2nd floor Gym)', address: '305 East 68th Street, New York, NY 10065' },
  'JR3': { name: 'Julia Richman (3rd floor Gym)', address: '305 East 68th Street, New York, NY 10065' },
  'LAG': { name: 'LaGuardia H.S.', address: '100 Amsterdam Avenue, New York, NY 10023' },
  'W50': { name: 'W50th Street Campus', address: '525 West 50th Street, New York, NY 10019' },
  'RS': { name: 'Robert Simon', address: 'Avenue B & East 5th Street, New York, NY 10009' },
};

function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/(\w+)\s+(\d{1,2})\/(\d{1,2})/);
  if (!match) return null;

  const [, , month, day] = match;
  const now = new Date();
  let year = now.getFullYear();

  const monthNum = parseInt(month);
  const currentMonth = now.getMonth() + 1;

  // Handle year rollover for winter season spanning Dec-Mar
  if (monthNum >= 12 && currentMonth <= 3) {
    year = year - 1; // December games from previous year
  } else if (monthNum <= 3 && currentMonth >= 10) {
    year = year + 1; // Jan-Mar games for next year
  }

  return new Date(year, monthNum - 1, parseInt(day));
}

export async function GET() {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const games: Game[] = scheduleData.map((game) => {
      const isNoGame = game.opponent.includes('No Game');
      const fullDate = parseDate(game.date);
      const isUpcoming = fullDate ? fullDate >= now && !isNoGame && !game.result : false;

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
