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

function GameCard({ game, index }: { game: Game; index: number }) {
  const isWin = game.result.startsWith('W');
  const isLoss = game.result.startsWith('L');

  if (game.isNoGame) {
    return (
      <div
        className="game-card past p-4 md:p-6 opacity-40"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-mono text-sm text-[var(--muted)]">{game.date}</div>
            <div className="text-[var(--muted)] italic">No Game This Week</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`game-card animate-slide-in ${game.isUpcoming ? 'upcoming' : 'past'} p-4 md:p-6`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date & Time */}
        <div className="flex items-center gap-4 md:gap-6 min-w-[180px]">
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl text-[var(--foreground)]">
              {game.date.split(' ')[1]}
            </div>
            <div className="font-mono text-xs text-[var(--muted)] uppercase tracking-wider">
              {game.date.split(' ')[0]}
            </div>
          </div>
          <div className="h-12 w-px bg-[var(--border)]" />
          <div className="font-mono text-lg md:text-xl text-[var(--accent)]">
            {game.time || '--:--'}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex-1 md:text-center">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">VS</div>
          <div className={`font-display text-xl md:text-2xl ${game.isUpcoming ? 'text-[var(--upcoming)] glow-upcoming animate-pulse-glow' : ''}`}>
            {game.opponent}
          </div>
        </div>

        {/* Location */}
        <div className="flex-1 md:text-right">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-1">Location</div>
          <div className="font-body text-sm md:text-base">
            {game.location || game.locationCode}
          </div>
          {game.locationAddress && (
            <div className="font-mono text-xs text-[var(--muted)] mt-1">{game.locationAddress}</div>
          )}
        </div>

        {/* Result */}
        <div className="min-w-[100px] text-right">
          {game.result ? (
            <div
              className={`inline-block px-3 py-1 font-mono text-sm ${isWin ? 'result-win' : 'result-loss'}`}
            >
              {game.result}
            </div>
          ) : game.isUpcoming ? (
            <div className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--upcoming)] animate-pulse" />
              <span className="font-mono text-xs text-[var(--upcoming)] uppercase tracking-wider">
                Upcoming
              </span>
            </div>
          ) : (
            <div className="font-mono text-xs text-[var(--muted)]">TBD</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="game-card p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-10 bg-[var(--muted)] rounded" />
              <div className="w-px h-12 bg-[var(--border)]" />
              <div className="w-14 h-6 bg-[var(--muted)] rounded" />
            </div>
            <div className="w-40 h-8 bg-[var(--muted)] rounded" />
            <div className="w-32 h-6 bg-[var(--muted)] rounded" />
            <div className="w-20 h-6 bg-[var(--muted)] rounded" />
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

  const record = schedule?.games.reduce(
    (acc, g) => {
      if (g.result.startsWith('W')) acc.wins++;
      if (g.result.startsWith('L')) acc.losses++;
      return acc;
    },
    { wins: 0, losses: 0 }
  ) || { wins: 0, losses: 0 };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <header className="relative diagonal-cut bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#141414] pt-8 pb-24 md:pt-16 md:pb-32 px-4 md:px-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[var(--accent)] opacity-5 blur-3xl" />
          <div className="absolute -left-40 bottom-0 w-80 h-80 rounded-full bg-[var(--upcoming)] opacity-5 blur-3xl" />
          {/* Diagonal stripes */}
          <div className="absolute right-0 top-0 w-1/3 h-full stripe-pattern opacity-10 skew-x-12" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Team name */}
          <div className="mb-8 md:mb-12">
            <div className="font-mono text-xs md:text-sm text-[var(--accent)] tracking-[0.3em] uppercase mb-2">
              NY Urban League
            </div>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl text-[var(--foreground)] leading-none glow-text animate-flicker">
              MALICE
            </h1>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-[var(--accent)] leading-none -mt-2 md:-mt-4">
              AT THE PALACE
            </h1>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 md:gap-12">
            {/* Record */}
            <div className="relative">
              <div className="font-mono text-xs text-[var(--muted)] uppercase tracking-widest mb-1">
                Season Record
              </div>
              <div className="font-display text-4xl md:text-5xl">
                <span className="text-[var(--win)]">{record.wins}</span>
                <span className="text-[var(--muted)] mx-2">-</span>
                <span className="text-[var(--loss)]">{record.losses}</span>
              </div>
            </div>

            {/* Next game */}
            {nextGame && (
              <div className="relative pl-6 md:pl-12 border-l border-[var(--border)]">
                <div className="font-mono text-xs text-[var(--upcoming)] uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--upcoming)] animate-pulse" />
                  Next Game
                </div>
                <div className="font-display text-2xl md:text-3xl text-[var(--foreground)]">
                  {nextGame.date} @ {nextGame.time}
                </div>
                <div className="font-body text-lg text-[var(--muted)]">
                  vs {nextGame.opponent}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Schedule Section */}
      <section className="relative -mt-12 md:-mt-16 px-4 md:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="stripe-pattern w-8 h-8" />
            <h2 className="font-display text-3xl md:text-4xl text-[var(--foreground)]">
              SCHEDULE
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
            <div className="text-center py-16">
              <div className="font-display text-2xl text-[var(--loss)] mb-2">ERROR</div>
              <div className="font-mono text-sm text-[var(--muted)]">{error}</div>
            </div>
          ) : schedule?.games.length === 0 ? (
            <div className="text-center py-16">
              <div className="font-display text-2xl text-[var(--muted)]">NO GAMES SCHEDULED</div>
            </div>
          ) : (
            <div className="space-y-3">
              {schedule?.games.map((game, i) => (
                <GameCard key={i} game={game} index={i} />
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-[var(--border)]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
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
              {schedule && (
                <div className="font-mono text-xs text-[var(--muted)]">
                  Updated: {new Date(schedule.fetchedAt).toLocaleString()}
                </div>
              )}
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
