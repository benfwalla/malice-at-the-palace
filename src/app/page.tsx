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

type CalendarProvider = 'google' | 'apple';
type MapProvider = 'google' | 'apple';

// Shared time math for calendar links: returns start/end as {year, month, day, hours, minutes}
// with a 1h30m default duration, or null when the game has no parseable date/time.
function getGameTimes(game: Game) {
  if (!game.fullDate) return null;
  const timeMatch = game.time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!timeMatch) return null;

  const gameDate = new Date(game.fullDate);
  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const ampm = timeMatch[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  const year = gameDate.getUTCFullYear();
  const month = gameDate.getUTCMonth() + 1;
  const day = gameDate.getUTCDate();

  // 1h30m duration, rolling minutes/hours over cleanly
  let endHours = hours + 1;
  let endMinutes = minutes + 30;
  if (endMinutes >= 60) {
    endMinutes -= 60;
    endHours += 1;
  }

  return { year, month, day, hours, minutes, endHours, endMinutes };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function getGoogleCalendarUrl(game: Game): string {
  const t = getGameTimes(game);
  if (!t) return '#';

  const startStr = `${t.year}${pad(t.month)}${pad(t.day)}T${pad(t.hours)}${pad(t.minutes)}00`;
  const endStr = `${t.year}${pad(t.month)}${pad(t.day)}T${pad(t.endHours)}${pad(t.endMinutes)}00`;

  const title = `Malice at the Palace vs ${game.opponent}`;
  const location = game.locationAddress || game.location;
  const details = `NY Urban League Basketball\n${game.location}${game.locationNotes ? '\n' + game.locationNotes : ''}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&ctz=America/New_York&location=${encodeURIComponent(location)}&details=${encodeURIComponent(details)}`;
}

// Apple Calendar has no add-event URL scheme, so we link to a server route that
// returns a real .ics file with a text/calendar content-type. A hosted URL is opened
// reliably everywhere (Safari, in-app webviews, Android, desktop), unlike a `data:`
// URI which silently fails inside in-app browsers and some non-Safari browsers.
function getAppleCalendarUrl(game: Game): string {
  if (!getGameTimes(game)) return '#';
  const params = new URLSearchParams({
    opponent: game.opponent,
    date: game.fullDate ?? '',
    time: game.time,
    location: game.location,
    address: game.locationAddress ?? '',
    notes: game.locationNotes ?? '',
  });
  return `/api/calendar?${params.toString()}`;
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

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const CAL_KEY = 'matp-calendar-pref';
const MAP_KEY = 'matp-map-pref';

function SettingsMenu({
  calPref,
  mapPref,
  onCalChange,
  onMapChange,
}: {
  calPref: CalendarProvider;
  mapPref: MapProvider;
  onCalChange: (v: CalendarProvider) => void;
  onMapChange: (v: MapProvider) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const optionClass = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-md font-mono text-xs transition-colors cursor-pointer ${
      active
        ? 'bg-[var(--foreground)] text-[var(--background)]'
        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
    }`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        aria-label="Settings"
        aria-expanded={open}
      >
        <GearIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 z-20 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg p-4">
            <div className="font-display text-sm mb-3 text-[var(--foreground)]">PREFERENCES</div>

            <div className="mb-4">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1.5">Calendar</div>
              <div className="flex gap-1 p-1 bg-[var(--border)]/40 rounded-lg">
                <button className={optionClass(calPref === 'google')} onClick={() => onCalChange('google')}>Google</button>
                <button className={optionClass(calPref === 'apple')} onClick={() => onCalChange('apple')}>Apple</button>
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] mb-1.5">Maps</div>
              <div className="flex gap-1 p-1 bg-[var(--border)]/40 rounded-lg">
                <button className={optionClass(mapPref === 'google')} onClick={() => onMapChange('google')}>Google</button>
                <button className={optionClass(mapPref === 'apple')} onClick={() => onMapChange('apple')}>Apple</button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border)] font-mono text-[10px] text-[var(--muted)]">
              Saved on this device.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GameRow({ game, index, isNext, calPref, mapPref }: { game: Game; index: number; isNext: boolean; calPref: CalendarProvider; mapPref: MapProvider }) {
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

        {calPref === 'apple' ? (
          <a
            href={getAppleCalendarUrl(game)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1.5 rounded-md"
            title="Add to Apple Calendar"
          >
            <Image src="/apple-cal-icon.svg" alt="Add to Apple Calendar" width={22} height={22} />
          </a>
        ) : (
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
        )}

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
                {mapPref === 'apple' ? (
                  <MapLink href={getAppleMapsUrl(game.locationAddress)} isNext={isNext}>Apple Maps</MapLink>
                ) : (
                  <MapLink href={getGoogleMapsUrl(game.locationAddress)} isNext={isNext}>Google Maps</MapLink>
                )}
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
  const [calPref, setCalPref] = useState<CalendarProvider>('google');
  const [mapPref, setMapPref] = useState<MapProvider>('google');

  // Load saved preferences from this device (falls back to Google defaults).
  useEffect(() => {
    const savedCal = localStorage.getItem(CAL_KEY);
    if (savedCal === 'apple' || savedCal === 'google') setCalPref(savedCal);
    const savedMap = localStorage.getItem(MAP_KEY);
    if (savedMap === 'apple' || savedMap === 'google') setMapPref(savedMap);
  }, []);

  const updateCalPref = (v: CalendarProvider) => {
    setCalPref(v);
    localStorage.setItem(CAL_KEY, v);
  };
  const updateMapPref = (v: MapProvider) => {
    setMapPref(v);
    localStorage.setItem(MAP_KEY, v);
  };

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
      <div className="fixed top-3 right-3 md:top-4 md:right-4 z-30">
        <SettingsMenu
          calPref={calPref}
          mapPref={mapPref}
          onCalChange={updateCalPref}
          onMapChange={updateMapPref}
        />
      </div>

      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/mural.jpg"
            alt="Malice at the Palace"
            fill
            className="object-cover opacity-[0.06]"
            style={{ objectPosition: '50% 40%' }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--background)]" />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 md:px-8 pt-16 pb-12 md:pt-24 md:pb-16">
          <a
            href="https://www.nyurban.com/team-details/?team_id=738034"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] md:text-xs text-[var(--muted)] tracking-[0.2em] uppercase mb-1 inline-block"
          >
            NY Urban League
          </a>
          <h1 className="font-display text-5xl md:text-7xl text-[var(--foreground)] leading-[0.9]">
            MALICE
          </h1>
          <p className="font-display text-3xl md:text-4xl text-[var(--muted)] leading-[0.9]">
            AT THE PALACE
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--muted)]">Summer 2026</span>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg md:text-xl text-[var(--foreground)]">SCHEDULE</h2>
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
                  calPref={calPref}
                  mapPref={mapPref}
                />
              ))}
            </div>
          )}

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
