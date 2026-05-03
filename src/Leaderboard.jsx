import { useState, useEffect, useRef } from 'react';
import {
  getTournamentLeaderboard,
  getTournamentSessions,
  subscribeToGameRounds,
} from './sessionService';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ tournament, onClose }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const sessionIdsRef = useRef([]);

  const loadLeaderboard = async () => {
    const data = await getTournamentLeaderboard(tournament.id);
    setLeaderboard(data);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadLeaderboard();
  }, [tournament.id]);

  // Bug 2 fix: subscribe to game_rounds for ALL tournament sessions
  // This fires whenever any team completes a round and saves state
  useEffect(() => {
    const setupSubscriptions = async () => {
      const sessions = await getTournamentSessions(tournament.id);
      sessionIdsRef.current = sessions.map(s => s.id);

      // Subscribe to game_rounds inserts for each session
      const subs = sessions.map(session =>
        subscribeToGameRounds(session.id, () => {
          loadLeaderboard(); // reload leaderboard whenever any team advances
        })
      );

      return () => subs.forEach(sub => sub.unsubscribe());
    };

    let cleanup = () => {};
    setupSubscriptions().then(fn => { cleanup = fn || (() => {}); });

    return () => cleanup();
  }, [tournament.id]);

  // Fallback: poll every 8 seconds
  useEffect(() => {
    const interval = setInterval(loadLeaderboard, 8000);
    return () => clearInterval(interval);
  }, [tournament.id]);

  const allFinished = leaderboard.length > 0 && leaderboard.every(t => t.status === 'finished');
  const lowestCost = leaderboard.find(t => t.totalCost > 0)?.totalCost || 0;

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(28,45,74,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px',
        padding: '2rem', maxWidth: '620px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{ fontSize: '22px', margin: 0 }}>
              🏆 Tournament Leaderboard
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              Code: <strong style={{ fontFamily: 'monospace' }}>{tournament.code}</strong>
              {' · '}
              {allFinished ? '✅ All teams finished!' : '⏳ Live — updates automatically'}
            </p>
            {lastUpdated && (
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                Last updated: {formatTime(lastUpdated)}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid #d1d5db',
                borderRadius: '8px', padding: '6px 12px',
                cursor: 'pointer', fontSize: '13px', color: '#6b7280',
                flexShrink: 0, marginLeft: '1rem'
              }}
            >
              Close
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Loading teams...
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No data yet — teams are warming up!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaderboard.map((team, idx) => {
              const barPct = lowestCost > 0 && team.totalCost > 0
                ? Math.min(100, Math.round((lowestCost / team.totalCost) * 100))
                : 0;

              return (
                <div
                  key={team.sessionId}
                  style={{
                    border: `2px solid ${idx === 0 && team.totalCost > 0 ? '#fbbf24' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    background: idx === 0 && team.totalCost > 0 ? '#fffbeb' : 'white'
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>
                        {team.totalCost > 0 ? (MEDALS[idx] || `#${idx + 1}`) : '—'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>
                          Team {team.teamNumber}
                          {team.teamLabel && (
                            <span style={{ fontWeight: 500, color: '#6b7280' }}>
                              {' · '}{team.teamLabel}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          {team.status === 'finished'
                            ? '✅ Finished'
                            : team.status === 'playing'
                              ? `⏳ Week ${team.round}/20`
                              : '⏸️ Not started yet'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '22px', fontWeight: 700,
                        color: idx === 0 && team.totalCost > 0 ? '#92400e' : '#1c2d4a'
                      }}>
                        {team.totalCost > 0 ? `₹${team.totalCost.toLocaleString()}` : '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        system cost
                      </div>
                    </div>
                  </div>

                  {/* Cost bar */}
                  {team.totalCost > 0 && (
                    <div style={{
                      background: '#f3f4f6', borderRadius: '4px',
                      height: '6px', marginBottom: '0.75rem', overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${barPct}%`, height: '100%',
                        background: idx === 0 ? '#f59e0b' : '#3b82f6',
                        borderRadius: '4px', transition: 'width 0.5s ease'
                      }} />
                    </div>
                  )}

                  {/* Players — anonymous, show role only */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['retailer', 'wholesaler', 'distributor', 'factory'].map(role => {
                      const joined = team.players?.some(p => p.role === role);
                      return (
                        <span
                          key={role}
                          style={{
                            padding: '2px 8px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 500,
                            background: joined ? '#dbeafe' : '#f3f4f6',
                            color: joined ? '#1e40af' : '#9ca3af',
                            textTransform: 'capitalize'
                          }}
                        >
                          {joined ? '👤' : '🤖'} {role}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          display: 'flex', gap: '0.75rem', marginTop: '1.5rem'
        }}>
          <button
            type="button"
            onClick={loadLeaderboard}
            style={{
              flex: 1, padding: '10px', fontSize: '13px',
              border: '1px solid #d1d5db', borderRadius: '8px',
              background: 'white', cursor: 'pointer', color: '#374151'
            }}
          >
            🔄 Refresh
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', fontSize: '13px',
                border: 'none', borderRadius: '8px',
                background: '#1c2d4a', cursor: 'pointer', color: 'white',
                fontWeight: 600
              }}
            >
              Back to game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}