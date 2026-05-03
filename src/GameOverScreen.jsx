import { useState, useEffect, useMemo } from 'react';
import { Analytics } from './Analytics';
import {
  getTournamentLeaderboard,
  getLatestGameState,
  getTournamentSessions,
  subscribeToGameRounds,
} from './sessionService';
import {
  buildSessionCsvWithAnalytics,
  totalSystemCostFromGame,
} from './analyticsMetrics';

const MEDALS = ['🥇', '🥈', '🥉'];

export function GameOverScreen({
  game,
  resetGame,
  totalSystemCost,
  playerRole,
  tournament,
  mySessionId,
}) {
  const [showData, setShowData] = useState(false);
  const [tournamentRows, setTournamentRows] = useState([]);
  const [tournamentCompareLoading, setTournamentCompareLoading] = useState(false);
  const [tournamentCompareError, setTournamentCompareError] = useState(null);

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionGame, setSessionGame] = useState(null);
  const [sessionGameLoading, setSessionGameLoading] = useState(false);

  const selectedTeamRow = useMemo(
    () => tournamentRows.find(r => r.sessionId === selectedSessionId),
    [tournamentRows, selectedSessionId]
  );

  useEffect(() => {
    if (!tournament?.id) {
      setTournamentRows([]);
      return;
    }
    let cancelled = false;
    let pollTimer = null;
    let realtimeSubs = [];

    const refresh = () =>
      getTournamentLeaderboard(tournament.id)
        .then(rows => {
          if (!cancelled) {
            setTournamentRows(rows);
            setTournamentCompareError(null);
          }
        })
        .catch(err => {
          if (!cancelled) {
            setTournamentCompareError(err?.message || 'Could not load tournament results');
          }
        });

    setTournamentCompareLoading(true);
    refresh().finally(() => {
      if (!cancelled) setTournamentCompareLoading(false);
    });

    pollTimer = setInterval(refresh, 4000);

    getTournamentSessions(tournament.id)
      .then(sessions => {
        if (cancelled) return;
        realtimeSubs = sessions.map(s =>
          subscribeToGameRounds(s.id, () => {
            refresh();
          })
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      realtimeSubs.forEach(sub => sub.unsubscribe());
    };
  }, [tournament?.id]);

  useEffect(() => {
    if (!tournament?.id || tournamentRows.length === 0) return;
    setSelectedSessionId(prev => {
      if (prev && tournamentRows.some(r => r.sessionId === prev)) return prev;
      if (mySessionId && tournamentRows.some(r => r.sessionId === mySessionId)) {
        return mySessionId;
      }
      return tournamentRows[0].sessionId;
    });
  }, [tournament?.id, tournamentRows, mySessionId]);

  useEffect(() => {
    if (!tournament?.id || !selectedSessionId) return;
    let cancelled = false;

    if (mySessionId && selectedSessionId === mySessionId) {
      setSessionGame(game);
      setSessionGameLoading(false);
      return undefined;
    }

    setSessionGame(null);
    setSessionGameLoading(true);
    (async () => {
      try {
        const g = await getLatestGameState(selectedSessionId);
        if (!cancelled && g) setSessionGame(g);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSessionGame(null);
      } finally {
        if (!cancelled) setSessionGameLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedSessionId, tournament?.id, mySessionId, game]);

  const displayGame = tournament ? sessionGame : game;
  const displayTotalCost = useMemo(() => {
    if (!tournament) return totalSystemCostFromGame(game);
    if (sessionGame) return totalSystemCostFromGame(sessionGame);
    if (selectedSessionId === mySessionId) return totalSystemCost;
    return null;
  }, [tournament, sessionGame, selectedSessionId, mySessionId, totalSystemCost, game]);

  const bestTournamentCost = useMemo(
    () => tournamentRows.find(t => t.totalCost > 0)?.totalCost ?? 0,
    [tournamentRows]
  );

  const exportToCSV = () => {
    const sourceGame = tournament ? sessionGame : game;
    if (!sourceGame) return;

    const meta = tournament
      ? {
          tournamentCode: tournament.code,
          teamNumber: selectedTeamRow?.teamNumber,
          teamLabel: selectedTeamRow?.teamLabel ?? '',
          sessionId: selectedSessionId,
          includeAnalytics: true,
        }
      : { includeAnalytics: true };

    const csvContent = buildSessionCsvWithAnalytics(sourceGame, meta);
    const date = new Date().toISOString().slice(0, 10);
    const teamPart =
      tournament && selectedTeamRow?.teamNumber != null
        ? `_team${selectedTeamRow.teamNumber}`
        : '';
    const namePrefix = tournament ? `bullwhip_tournament_${tournament.code}${teamPart}` : 'bullwhip_session';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${namePrefix}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ma-over">
      <header className="ma-topbar">
        <div className="ma-brand">
          <span className="ma-logo">Beer Game</span>
          <span className="ma-tagline">
            Session complete
            {playerRole && ` · You played ${playerRole}`}
            {tournament && ` · Tournament ${tournament.code}`}
          </span>
        </div>
        <div className="ma-week-pill">
          20 <span>/ 20 weeks</span>
        </div>
        <div className="ma-topbar-stats">
          <div className="ma-topbar-stat ma-topbar-stat--cost">
            <label>Total system cost</label>
            <strong>
              {displayTotalCost != null && Number.isFinite(displayTotalCost)
                ? `₹${Math.round(displayTotalCost)}`
                : '—'}
            </strong>
          </div>
        </div>
      </header>

      <div className="ma-over-body">

        {/* Hero */}
        <div className="ma-over-hero">
          <h1>Simulation complete</h1>
          <div className="ma-over-cost">
            {displayTotalCost != null && Number.isFinite(displayTotalCost)
              ? `₹${Math.round(displayTotalCost).toLocaleString()}`
              : '—'}
          </div>
          <p className="ma-over-sub">
            Total system cost · 20 weeks
            {tournament && selectedTeamRow && (
              <span>
                {' · Team '}{selectedTeamRow.teamNumber}
                {selectedTeamRow.teamLabel && ` · ${selectedTeamRow.teamLabel}`}
              </span>
            )}
          </p>

          {playerRole && (
            <div style={{
              marginTop: '1rem',
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 16px',
              fontSize: '14px'
            }}>
              You played as <strong style={{ textTransform: 'capitalize' }}>{playerRole}</strong>
            </div>
          )}
        </div>

        {/* Tournament: how all teams compared */}
        {tournament && (
          <section className="ma-over-tournament" aria-labelledby="tournament-compare-heading">
            <h2 id="tournament-compare-heading">Tournament results</h2>
            <p className="ma-over-tournament-desc">
              All teams faced the same demand curve. <strong>Lower total system cost</strong> (holding +
              backlog) is better — compare your team to the rest.
            </p>

            {tournamentCompareLoading && (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--ma-muted)' }}>
                Loading team standings…
              </p>
            )}
            {tournamentCompareError && (
              <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>
                {tournamentCompareError}
              </p>
            )}
            {!tournamentCompareLoading && !tournamentCompareError && tournamentRows.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="ma-over-tournament-table">
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Team</th>
                      <th scope="col" className="ma-over-tournament-th-num">System cost</th>
                      <th scope="col" className="ma-over-tournament-th-num">vs best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournamentRows.map((row, idx) => {
                      const isYou = mySessionId != null && row.sessionId === mySessionId;
                      const vsBest =
                        bestTournamentCost > 0 && row.totalCost > 0
                          ? row.totalCost <= bestTournamentCost
                            ? '—'
                            : `+${Math.round((row.totalCost / bestTournamentCost - 1) * 100)}%`
                          : '—';
                      const barPct =
                        bestTournamentCost > 0 && row.totalCost > 0
                          ? Math.min(100, Math.round((bestTournamentCost / row.totalCost) * 100))
                          : 0;
                      const rankDisplay =
                        row.totalCost > 0
                          ? (MEDALS[idx] ?? idx + 1)
                          : '—';
                      return (
                        <tr
                          key={row.sessionId}
                          className={isYou ? 'ma-over-tournament-you' : undefined}
                        >
                          <td className="ma-over-tournament-rank">
                            <span className="ma-over-tournament-rank-main">{rankDisplay}</span>
                          </td>
                          <td>
                            <strong>Team {row.teamNumber}</strong>
                            {row.teamLabel && (
                              <span className="ma-over-tournament-name"> · {row.teamLabel}</span>
                            )}
                            {isYou && (
                              <span className="ma-over-tournament-you-badge">Your team</span>
                            )}
                            <div className="ma-over-tournament-meta">
                              {row.status === 'finished' ? 'Finished' : row.status}
                              {row.round > 0 && ` · Week ${row.round}`}
                            </div>
                            {row.totalCost > 0 && (
                              <div className="ma-over-tournament-bar" aria-hidden>
                                <div
                                  className="ma-over-tournament-bar-fill"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            )}
                          </td>
                          <td className="ma-over-tournament-cost">
                            {row.totalCost > 0
                              ? `₹${row.totalCost.toLocaleString()}`
                              : '—'}
                          </td>
                          <td className="ma-over-tournament-spread">{vsBest}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tournament: which team's analytics / charts / CSV */}
        {tournament && tournamentRows.length > 0 && (
          <div className="ma-over-team-picker">
            <label htmlFor="ma-team-analytics">View analytics & export for</label>
            <select
              id="ma-team-analytics"
              className="ma-over-team-select"
              value={selectedSessionId ?? ''}
              onChange={e => setSelectedSessionId(e.target.value || null)}
            >
              {tournamentRows.map(row => (
                <option key={row.sessionId} value={row.sessionId}>
                  Team {row.teamNumber}
                  {row.teamLabel ? ` — ${row.teamLabel}` : ''}
                  {mySessionId === row.sessionId ? ' (your team)' : ''}
                  {row.totalCost > 0 ? ` · ₹${row.totalCost.toLocaleString()}` : ''}
                </option>
              ))}
            </select>
            {sessionGameLoading && (
              <span className="ma-over-team-picker-hint">Loading team data…</span>
            )}
          </div>
        )}

        {/* Analytics toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setShowData(v => !v)}
            style={{
              width: '100%', padding: '14px',
              fontSize: '15px', fontWeight: 600,
              background: showData ? '#1c2d4a' : 'white',
              color: showData ? 'white' : '#1c2d4a',
              border: '2px solid #1c2d4a',
              borderRadius: '10px', cursor: 'pointer'
            }}
          >
            {showData ? '▲ Hide detailed analytics' : '▼ Show detailed analytics'}
          </button>
        </div>

        {/* Analytics section */}
        {showData && displayGame && displayTotalCost != null && (
          <Analytics
            game={displayGame}
            totalSystemCost={Math.round(displayTotalCost)}
          />
        )}
        {showData && tournament && (!displayGame || displayTotalCost == null) && (
          <p style={{ textAlign: 'center', color: 'var(--ma-muted)', padding: '2rem' }}>
            Loading analytics for this team…
          </p>
        )}

        {/* Actions */}
        <div className="ma-actions">
          <button
            type="button"
            className="ma-btn-ghost"
            onClick={exportToCSV}
            disabled={
              tournament ? !sessionGame || sessionGameLoading : false
            }
          >
            Export CSV
          </button>
          <button type="button" className="ma-btn-week" onClick={resetGame}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}