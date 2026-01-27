'use client';

import { useEffect, useState } from 'react';

interface Game {
  date: string;
  fullDate: string | null;
  location: string;
  locationCode: string;
  locationAddress: string;
  time: string;
  opponent: string;
  result: string;
  isNoGame: boolean;
  isUpcoming: boolean;
}

interface ScheduleData {
  games: Game[];
  teamId: string;
  fetchedAt: string;
}

// Map pin icon
function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// External link icon
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15,3 21,3 21,9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// Google Maps icon
function GoogleMapsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}

// Apple Maps icon
function AppleMapsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}

// Calendar icon
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// Clock icon
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  );
}

function getGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getAppleMapsUrl(address: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}

function LocationDisplay({ location, locationCode, address }: { location: string; locationCode: string; address: string }) {
  if (!address) {
    return (
      <div className="font-body text-sm">
        {location || locationCode}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPinIcon className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <span className="font-body text-sm">{location || locationCode}</span>
      </div>
      <div className="font-mono text-xs text-[var(--muted)] pl-6">{address}</div>
      <div className="flex flex-wrap gap-2 pl-6">
        <a
          href={getGoogleMapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-[var(--card-bg)] border border-[var(--border)] rounded hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          title="Open in Google Maps"
        >
          <GoogleMapsIcon className="w-3.5 h-3.5" />
          <span>Google</span>
          <ExternalLinkIcon className="w-3 h-3 opacity-50" />
        </a>
        <a
          href={getAppleMapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-[var(--card-bg)] border border-[var(--border)] rounded hover:border-[var(--upcoming)] hover:text-[var(--upcoming)] transition-colors"
          title="Open in Apple Maps"
        >
          <AppleMapsIcon className="w-3.5 h-3.5" />
          <span>Apple</span>
          <ExternalLinkIcon className="w-3 h-3 opacity-50" />
        </a>
      </div>
    </div>
  );
}

function NextGameCard({ game }: { game: Game }) {
  return (
    <div className="relative mt-8 p-6 md:p-8 bg-gradient-to-br from-[var(--upcoming)]/20 via-[var(--upcoming)]/10 to-transparent border-2 border-[var(--upcoming)] rounded-lg overflow-hidden">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-[var(--upcoming)]/5 animate-pulse" />

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-[var(--upcoming)] animate-pulse" />
          <span className="font-mono text-sm text-[var(--upcoming)] uppercase tracking-widest font-bold">
            Next Game
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-[var(--upcoming)]" />
              <span className="font-display text-3xl md:text-4xl text-[var(--foreground)]">
                {game.date}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-[var(--upcoming)]" />
              <span className="font-mono text-2xl text-[var(--accent)]">
                {game.time}
              </span>
            </div>
          </div>

          {/* Opponent */}
          <div className="flex flex-col justify-center">
            <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">VS</div>
            <div className="font-display text-2xl md:text-3xl text-[var(--upcoming)] glow-upcoming">
              {game.opponent}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-[var(--muted)]">Location</div>
            <div className="flex items-start gap-2">
              <MapPinIcon className="w-5 h-5 text-[var(--upcoming)] shrink-0 mt-0.5" />
              <div>
                <div className="font-body text-base text-[var(--foreground)]">{game.location}</div>
                <div className="font-mono text-xs text-[var(--muted)] mt-1">{game.locationAddress}</div>
              </div>
            </div>
            {game.locationAddress && (
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={getGoogleMapsUrl(game.locationAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[var(--upcoming)]/20 border border-[var(--upcoming)] rounded hover:bg-[var(--upcoming)]/30 text-[var(--upcoming)] transition-colors"
                >
                  <GoogleMapsIcon className="w-4 h-4" />
                  <span>Google Maps</span>
                </a>
                <a
                  href={getAppleMapsUrl(game.locationAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-[var(--accent)]/20 border border-[var(--accent)] rounded hover:bg-[var(--accent)]/30 text-[var(--accent)] transition-colors"
                >
                  <AppleMapsIcon className="w-4 h-4" />
                  <span>Apple Maps</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, index, isNextGame }: { game: Game; index: number; isNextGame: boolean }) {
  if (game.isNoGame) {
    return (
      <div
        className="game-card past p-3 md:p-4 opacity-40"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm text-[var(--muted)]">{game.date}</div>
          <div className="text-[var(--muted)] italic text-sm">No Game This Week</div>
        </div>
      </div>
    );
  }

  // Skip rendering the next game in the list since it's featured above
  if (isNextGame) return null;

  return (
    <div
      className={`game-card animate-slide-in ${game.isUpcoming ? 'upcoming' : 'past'} p-3 md:p-5`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Mobile layout */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-center min-w-[50px]">
              <div className="font-display text-xl text-[var(--foreground)]">
                {game.date.split(' ')[1]}
              </div>
              <div className="font-mono text-[10px] text-[var(--muted)] uppercase">
                {game.date.split(' ')[0]}
              </div>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="font-mono text-base text-[var(--accent)]">
              {game.time || '--:--'}
            </div>
          </div>
          {game.result && (
            <div className={`px-2 py-0.5 font-mono text-xs ${game.result.startsWith('W') ? 'result-win' : 'result-loss'}`}>
              {game.result}
            </div>
          )}
        </div>
        <div>
          <span className="text-xs text-[var(--muted)]">vs </span>
          <span className={`font-display text-lg ${game.isUpcoming ? 'text-[var(--upcoming)]' : ''}`}>
            {game.opponent}
          </span>
        </div>
        {game.locationAddress && (
          <LocationDisplay
            location={game.location}
            locationCode={game.locationCode}
            address={game.locationAddress}
          />
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex md:items-start justify-between gap-4">
        {/* Date & Time */}
        <div className="flex items-center gap-4 min-w-[160px] shrink-0">
          <div className="text-center min-w-[55px]">
            <div className="font-display text-2xl text-[var(--foreground)]">
              {game.date.split(' ')[1]}
            </div>
            <div className="font-mono text-xs text-[var(--muted)] uppercase tracking-wider">
              {game.date.split(' ')[0]}
            </div>
          </div>
          <div className="h-10 w-px bg-[var(--border)]" />
          <div className="font-mono text-lg text-[var(--accent)]">
            {game.time || '--:--'}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex-1 text-center">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">VS</div>
          <div className={`font-display text-xl ${game.isUpcoming ? 'text-[var(--upcoming)] glow-upcoming' : ''}`}>
            {game.opponent}
          </div>
        </div>

        {/* Location */}
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Location</div>
          <LocationDisplay
            location={game.location}
            locationCode={game.locationCode}
            address={game.locationAddress}
          />
        </div>

        {/* Result */}
        <div className="min-w-[80px] text-right shrink-0">
          {game.result ? (
            <div className={`inline-block px-2 py-1 font-mono text-sm ${game.result.startsWith('W') ? 'result-win' : 'result-loss'}`}>
              {game.result}
            </div>
          ) : game.isUpcoming ? (
            <div className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--upcoming)] animate-pulse" />
              <span className="font-mono text-xs text-[var(--upcoming)] uppercase">
                Upcoming
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="game-card p-4 animate-pulse">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-10 bg-[var(--muted)] rounded" />
              <div className="w-px h-10 bg-[var(--border)]" />
              <div className="w-12 h-5 bg-[var(--muted)] rounded" />
            </div>
            <div className="w-32 h-6 bg-[var(--muted)] rounded" />
            <div className="w-40 h-12 bg-[var(--muted)] rounded hidden md:block" />
            <div className="w-16 h-5 bg-[var(--muted)] rounded" />
          </div>
        </div>
      ))}
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

  const upcomingGames = schedule?.games.filter((g) => g.isUpcoming && !g.isNoGame) || [];
  const nextGame = upcomingGames[0];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <header className="relative bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#141414] pt-6 pb-8 md:pt-12 md:pb-12 px-4 md:px-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 md:w-96 h-72 md:h-96 rounded-full bg-[var(--accent)] opacity-5 blur-3xl" />
          <div className="absolute -left-40 bottom-0 w-64 md:w-80 h-64 md:h-80 rounded-full bg-[var(--upcoming)] opacity-5 blur-3xl" />
          {/* Diagonal stripes */}
          <div className="absolute right-0 top-0 w-1/4 md:w-1/3 h-full stripe-pattern opacity-10 skew-x-12" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Team name */}
          <div>
            <div className="font-mono text-[10px] md:text-sm text-[var(--accent)] tracking-[0.2em] md:tracking-[0.3em] uppercase mb-1 md:mb-2">
              NY Urban League
            </div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-[var(--foreground)] leading-none glow-text animate-flicker">
              MALICE
            </h1>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl text-[var(--accent)] leading-none -mt-1 md:-mt-2">
              AT THE PALACE
            </h1>
          </div>

          {/* Featured Next Game Card */}
          {nextGame && <NextGameCard game={nextGame} />}
        </div>
      </header>

      {/* Schedule Section */}
      <section className="relative px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="flex items-center gap-3 md:gap-4 mb-6">
            <div className="stripe-pattern w-6 h-6 md:w-8 md:h-8" />
            <h2 className="font-display text-2xl md:text-3xl text-[var(--foreground)]">
              FULL SCHEDULE
            </h2>
            <div className="flex-1 h-px bg-[var(--border)]" />
            {schedule && (
              <div className="font-mono text-xs text-[var(--muted)]">
                {upcomingGames.length} upcoming
              </div>
            )}
          </div>

          {/* Games list */}
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-center py-12">
              <div className="font-display text-xl text-[var(--loss)] mb-2">ERROR</div>
              <div className="font-mono text-sm text-[var(--muted)]">{error}</div>
            </div>
          ) : schedule?.games.length === 0 ? (
            <div className="text-center py-12">
              <div className="font-display text-xl text-[var(--muted)]">NO GAMES SCHEDULED</div>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {schedule?.games.map((game, i) => (
                <GameCard key={i} game={game} index={i} isNextGame={game === nextGame} />
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-[var(--border)]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="font-mono text-xs text-[var(--muted)]">
                Data from{' '}
                <a
                  href="https://www.nyurban.com/team-details/?team_id=910085"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  NY Urban
                </a>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
