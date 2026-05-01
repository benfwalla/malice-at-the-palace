'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Game {
  date: string;
  fullDate: string | null;
  location: string;
  locationCode: string;
  locationAddress: string;
  locationNotes: string;
  time: string;
  opponent: string;
  isUpcoming: boolean;
  isNoGame: boolean;
}

interface ScheduleData {
  games: Game[];
  teamId: string;
  fetchedAt: string;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_RE = /(\w+)\s+(\d{1,2})\/(\d{1,2})/;

function getRelativeTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const gameDate = new Date(dateStr);
  const now = new Date();
  const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const gameDay = Date.UTC(gameDate.getUTCFullYear(), gameDate.getUTCMonth(), gameDate.getUTCDate());
  const todayDay = Date.UTC(nyNow.getFullYear(), nyNow.getMonth(), nyNow.getDate());
  const diffDays = Math.round((gameDay - todayDay) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  if (diffDays < 7) return `IN ${diffDays} DAYS`;
  return null;
}

function getGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getAppleMapsUrl(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}

function getGoogleCalendarUrl(game: Game): string {
  if (!game.fullDate) return '#';

  const gameDate = new Date(game.fullDate);
  const timeMatch = game.time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!timeMatch) return '#';

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const ampm = timeMatch[3].toLowerCase();

  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  const year = gameDate.getUTCFullYear();
  const month = String(gameDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gameDate.getUTCDate()).padStart(2, '0');
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');

  const startStr = `${year}${month}${day}T${h}${m}00`;
  const endHours = hours + 1;
  const endMinutes = minutes + 30;
  const endH = String(endMinutes >= 60 ? endHours + 1 : endHours).padStart(2, '0');
  const endM = String(endMinutes >= 60 ? endMinutes - 60 : endMinutes).padStart(2, '0');
  const endStr = `${year}${month}${day}T${endH}${endM}00`;

  const title = `Malice at the Palace vs ${game.opponent}`;
  const location = game.locationAddress || game.location;
  const details = `NY Urban League Basketball\n${game.location}${game.locationNotes ? '\n' + game.locationNotes : ''}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&ctz=America/New_York&location=${encodeURIComponent(location)}&details=${encodeURIComponent(details)}`;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MapLink({ href, isNext, children }: { href: string; isNext: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md border ${
        isNext ? 'border-black/30 text-black/80' : 'border-[var(--border)]'
      }`}
    >
      {children}
    </a>
  );
}

function GameRow({ game, index, isNext }: { game: Game; index: number; isNext: boolean }) {
  const [expanded, setExpanded] = useState(isNext);

  const relativeTime = getRelativeTime(game.fullDate);
  const dateParts = game.date.match(DATE_RE);
  const dayOfWeek = dateParts ? dateParts[1] : '';
  const monthNum = dateParts ? parseInt(dateParts[2]) : 0;
  const dayNum = dateParts ? dateParts[3] : '';
  const monthName = MONTH_NAMES[monthNum] || '';
  const muted = isNext ? 'text-black/50' : 'text-[var(--muted)]';

  if (game.isNoGame) {
    return (
      <div
        className="game-row animate-slide-in px-3 py-2 md:px-5 md:py-3 flex items-center gap-3 md:gap-5 opacity-60"
        style={{ animationDelay: `${index * 0.06}s` }}
      >
        <div className="text-center min-w-[48px] md:min-w-[56px]">
          <div className="font-display text-2xl md:text-3xl leading-none">{dayNum}</div>
          <div className={`font-mono text-[10px] md:text-xs uppercase text-[var(--muted)]`}>{monthName}</div>
        </div>
        <div className="font-body text-sm italic text-[var(--muted)]">No game this week</div>
      </div>
    );
  }

  return (
    <div
      className={`game-row animate-slide-in ${isNext ? 'next-game rounded-lg mb-2 border-b-0' : ''}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-3 md:px-5 md:py-4 flex items-center gap-3 md:gap-5 cursor-pointer"
      >
        <div className="text-center min-w-[48px] md:min-w-[56px]">
          <div className="font-display text-2xl md:text-3xl leading-none">{dayNum}</div>
          <div className={`font-mono text-[10px] md:text-xs uppercase ${muted}`}>{monthName}</div>
        </div>

        <div className="min-w-[72px] md:min-w-[90px]">
          <div className={`font-body text-sm md:text-base ${muted}`}>{dayOfWeek}</div>
          <div className="font-mono text-sm md:text-base font-bold">{game.time}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-display text-lg md:text-xl truncate flex items-center gap-1.5">
            <MapPinIcon className={`shrink-0 ${isNext ? 'text-black/50' : 'text-[var(--muted)]'}`} />
            {game.location}
          </div>
        </div>

        {isNext && relativeTime && (
          <div className="hidden md:block px-3 py-1 bg-black/10 rounded-full font-mono text-xs text-black/60">
            {relativeTime}
          </div>
        )}

        <a
          href={getGoogleCalendarUrl(game)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1.5 rounded-md"
          title="Add to Google Calendar"
        >
          <Image src="/gcal-icon.svg" alt="Add to Google Calendar" width={22} height={22} />
        </a>

        <ChevronDown className={`chevron shrink-0 ${expanded ? 'open' : ''} ${isNext ? 'text-black/40' : 'text-[var(--muted)]'}`} />
      </button>

      <div className={`details-panel ${expanded ? 'open' : ''}`}>
        <div className="px-4 md:px-5 pb-4 pt-0">
          <div className={`border-t pt-3 ml-[48px] md:ml-[56px] ${isNext ? 'border-black/20' : 'border-[var(--border)]'}`}>
            <div className="mb-3">
              <span className={`text-sm font-body ${isNext ? 'text-black/40' : 'text-[var(--muted)]'}`}>vs </span>
              <span className="font-display text-lg">{game.opponent}</span>
            </div>

            <div className="flex items-start gap-2 mb-2">
              <MapPinIcon className={`shrink-0 mt-0.5 ${isNext ? 'text-black/70' : 'text-[var(--muted)]'}`} />
              <div className={`font-mono text-xs ${isNext ? 'text-black/70' : 'text-[var(--muted)]'}`}>{game.locationAddress}</div>
            </div>

            {game.locationNotes && (
              <div className={`ml-[22px] mb-3 font-mono text-xs italic ${isNext ? 'text-black/60' : 'text-[var(--muted)]'}`}>
                {game.locationNotes}
              </div>
            )}

            {game.locationAddress && (
              <div className="ml-[22px] flex flex-wrap gap-2">
                <MapLink href={getGoogleMapsUrl(game.locationAddress)} isNext={isNext}>Google Maps</MapLink>
                <MapLink href={getAppleMapsUrl(game.locationAddress)} isNext={isNext}>Apple Maps</MapLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch('/api/schedule');
        if (!res.ok) throw new Error('Failed to fetch schedule');
        const data = await res.json();
        setSchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  const upcomingGames = schedule?.games.filter((g) => g.isUpcoming) || [];
  const nextGame = upcomingGames[0];

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/mural.jpg"
            alt="Malice at the Palace"
            fill
            className="object-cover opacity-12"
            style={{ objectPosition: '50% 40%' }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/20 via-transparent via-70% to-[var(--background)]" />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 md:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="font-mono text-[10px] md:text-xs text-[var(--muted)] tracking-[0.2em] uppercase mb-1">
            NY Urban League
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-[var(--foreground)] leading-[0.9]">
            MALICE
          </h1>
          <p className="font-display text-3xl md:text-4xl text-[var(--muted)] leading-[0.9]">
            AT THE PALACE
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black border-2 border-[var(--border-dark)]" />
            <span className="font-mono text-xs text-[var(--muted)]">Black Team</span>
            <span className="font-mono text-xs text-[var(--muted)]">&middot;</span>
            <span className="font-mono text-xs text-[var(--muted)]">Spring 2026</span>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg md:text-xl text-[var(--foreground)]">SCHEDULE</h2>
              <span className="font-mono text-[10px] text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">First Half</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-[var(--card-bg)] rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="font-display text-xl text-red-600 mb-2">ERROR</div>
              <div className="font-mono text-sm text-[var(--muted)]">{error}</div>
            </div>
          ) : (
            <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--border)] overflow-hidden">
              {schedule?.games.map((game) => (
                <GameRow
                  key={`${game.date}-${game.opponent}`}
                  game={game}
                  index={schedule.games.indexOf(game)}
                  isNext={game === nextGame}
                />
              ))}
            </div>
          )}

          <div className="mt-4 text-center">
            <span className="font-mono text-xs text-[var(--muted)]">More games coming soon...</span>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border)] font-mono text-xs text-[var(--muted)] text-center">
            Schedule, standings & waivers at{' '}
            <a
              href="https://www.nyurban.com/team-details/?team_id=738034"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              NY Urban
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
