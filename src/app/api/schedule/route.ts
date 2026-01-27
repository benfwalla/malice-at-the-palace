import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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

  if (monthNum < currentMonth && currentMonth >= 10 && monthNum <= 3) {
    year = year + 1;
  } else if (monthNum > currentMonth && currentMonth <= 3 && monthNum >= 10) {
    year = year - 1;
  }

  return new Date(year, monthNum - 1, parseInt(day));
}

export async function GET() {
  try {
    const response = await fetch('https://www.nyurban.com/team-details/?team_id=910085', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const games: Game[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const scheduleTable = $('.payMidWrapper table').first();

    scheduleTable.find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 5) {
        const dateCell = $(cells[0]).text().trim();
        const locationLink = $(cells[1]).find('a').first();
        const locationCode = locationLink.text().trim();
        const locationPopup = $(cells[1]).find('.midd strong').text().trim();
        const timeCell = $(cells[2]).text().trim();
        const opponentCell = $(cells[3]).find('a').first().text().trim();
        const resultCell = $(cells[4]).text().trim();

        if (dateCell && dateCell.match(/\w+\s+\d+\/\d+/)) {
          const isNoGame = opponentCell.includes('No Game');
          const fullDate = parseDate(dateCell);
          const isUpcoming = fullDate ? fullDate >= now && !isNoGame : false;

          // Get the full address from our lookup table
          const locationData = locationAddresses[locationCode];
          const locationName = locationPopup || locationData?.name || locationCode;
          const locationAddress = locationData?.address || '';

          games.push({
            date: dateCell,
            fullDate,
            location: locationName,
            locationCode,
            locationAddress,
            time: timeCell,
            opponent: opponentCell,
            result: resultCell,
            isNoGame,
            isUpcoming,
          });
        }
      }
    });

    games.sort((a, b) => {
      if (!a.fullDate || !b.fullDate) return 0;
      return a.fullDate.getTime() - b.fullDate.getTime();
    });

    return NextResponse.json({
      games,
      teamId: '910085',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}
