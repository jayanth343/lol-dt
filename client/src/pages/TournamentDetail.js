import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import {
  apiTournament,
  apiTournamentMatches,
  apiTournamentLeagueStandings,
  apiUpdateTournamentSchedule,
  apiGenerateLeagueMatches,
  apiGenerateKnockoutMatches
} from '../lib/api';
import { Ldr, SportIcon, TL } from '../components/Shared';
import TournamentKnockout from '../components/TournamentKnockout';
import { useToast } from '../context/ToastContext';

export default function TournamentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [topQualifiers, setTopQualifiers] = useState(3);
  const [scheduleDraft, setScheduleDraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const reviewMode = searchParams.get('review') === '1';

  const refresh = useCallback(() => {
    Promise.all([
      apiTournament(id).catch(() => null),
      apiTournamentMatches(id).catch(() => []),
      apiTournamentLeagueStandings(id).catch(() => ({ table: [], topQualifiers: 3 }))
    ]).then(([t, m, st]) => {
      setTournament(t);
      setMatches(Array.isArray(m) ? m : []);
      setStandings(Array.isArray(st?.table) ? st.table : []);
      setTopQualifiers(Number(st?.topQualifiers) || 3);
      setScheduleDraft((Array.isArray(m) ? m : []).map((mx) => ({
        matchId: mx._id,
        matchDate: mx.matchDate ? new Date(mx.matchDate).toISOString().slice(0, 10) : '',
        matchTime: mx.matchTime || '10:00',
        venue: mx.venue || ''
      })));
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sortedMatches = useMemo(() => [...(matches || [])].sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate)), [matches]);

  const runGenerator = async () => {
    if (!tournament?._id) return;
    const payload = {
      startDate: tournament.startDate || new Date().toISOString(),
      intervalDays: Math.max(1, Number(tournament.scheduleIntervalDays) || 1),
      matchTime: tournament.defaultMatchTime || '10:00',
      venue: tournament.venue || '',
      matchesPerPair: Math.max(1, Number(tournament.matchesPerPair) || 1)
    };
    const res = tournament.format === 'league'
      ? await apiGenerateLeagueMatches(tournament._id, payload)
      : await apiGenerateKnockoutMatches(tournament._id, payload);

    if (res?.error) return showToast(res.error, 'error');
    showToast(`Generated ${res?.count || 0} fixtures`, 'success');
    refresh();
  };

  const saveSchedule = async () => {
    const res = await apiUpdateTournamentSchedule(id, scheduleDraft);
    if (res?.error) return showToast(res.error, 'error');
    showToast(`Updated ${res?.updated || 0} match schedule rows`, 'success');
    refresh();
  };

  if (loading) return <div className="pg"><Ldr/></div>;
  if (!tournament) return <div className="pg"><div className="al al-er">Tournament not found</div></div>;

  return (
    <div className="pg fade-up">
      <div className="al-head">
        <h2 style={{fontSize:24, display:'flex', alignItems:'center', gap:8}}>
          <SportIcon sport={tournament.sport?.name || tournament.sport} style={{fontSize:22}} /> {tournament.name}
        </h2>
        <div style={{color:'var(--tx3)'}}>{tournament.format.toUpperCase()} · {tournament.status?.toUpperCase()}</div>
      </div>

      <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
        <button className="btn btn-p btn-sm" onClick={runGenerator}>Generate fixtures</button>
        {reviewMode && <button className="btn btn-ok btn-sm" onClick={saveSchedule}>Save reviewed dates</button>}
      </div>

      <div className="card" style={{padding:16, marginTop:14}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(5,minmax(120px,1fr))', gap:10}}>
          <div>
            <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Sport</div>
            <div style={{fontWeight:700}}>{tournament.sport?.name || 'Unknown'}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Teams</div>
            <div style={{fontWeight:700}}>{(tournament.teams || []).length} / {tournament.minTeams || 2}-{tournament.maxTeams || '-'}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Venue</div>
            <div style={{fontWeight:700}}>{tournament.venue || 'TBD'}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Start date</div>
            <div style={{fontWeight:700}}>{tournament.startDate ? new Date(tournament.startDate).toLocaleDateString('en-IN') : 'TBD'}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Schedule cadence</div>
            <div style={{fontWeight:700}}>Every {tournament.scheduleIntervalDays || 1} day(s)</div>
          </div>
        </div>

        {!!tournament.description && <div style={{marginTop:12, color:'var(--tx2)'}}>{tournament.description}</div>}

        {tournament.sport?.customSettings && (
          <div style={{marginTop:14}}>
            <div style={{fontSize:11,color:'var(--tx4)',textTransform:'uppercase',marginBottom:8}}>Sport rules</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(120px,1fr))',gap:8}}>
              <div className="card" style={{padding:8,background:'var(--card2)'}}><div style={{fontSize:10,color:'var(--tx4)'}}>Unit</div><div style={{fontWeight:700}}>{tournament.sport.customSettings.unit || '-'}</div></div>
              <div className="card" style={{padding:8,background:'var(--card2)'}}><div style={{fontSize:10,color:'var(--tx4)'}}>Points to win</div><div style={{fontWeight:700}}>{tournament.sport.customSettings.pointsToWin || '-'}</div></div>
              <div className="card" style={{padding:8,background:'var(--card2)'}}><div style={{fontSize:10,color:'var(--tx4)'}}>Games / match</div><div style={{fontWeight:700}}>{tournament.sport.customSettings.gamesPerMatch || '-'}</div></div>
              <div className="card" style={{padding:8,background:'var(--card2)'}}><div style={{fontSize:10,color:'var(--tx4)'}}>Min delta</div><div style={{fontWeight:700}}>{tournament.sport.customSettings.minPointDelta || 0}</div></div>
            </div>
            {!!tournament.sport.customSettings.extraRules && <div style={{marginTop:8,fontSize:12,color:'var(--tx3)'}}>Other factors: {tournament.sport.customSettings.extraRules}</div>}
          </div>
        )}

        <div style={{marginTop:14}}>
          <div style={{fontSize:11,color:'var(--tx4)',textTransform:'uppercase',marginBottom:8}}>Participating teams</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {(tournament.teams || []).map(team => (
              <Chip
                key={team._id}
                size="small"
                avatar={<TL color={team.color} abbr={team.abbreviation} size={18} />}
                label={team.name}
                sx={{
                  backgroundColor: 'rgba(52,152,219,.14)',
                  color: '#7dc3ff',
                  border: '1px solid rgba(52,152,219,.35)',
                  fontWeight: 600
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: 30 }}>
        {tournament.format === 'knockout' ? (
          <TournamentKnockout matches={matches} />
        ) : (
          <>
            <div className="card" style={{padding:16, marginBottom:12}}>
              <div style={{fontWeight:700, marginBottom:10}}>League table (top {topQualifiers})</div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th><th>Team</th><th className="c">P</th><th className="c">W</th><th className="c">D</th><th className="c">L</th><th className="c">Pts</th><th className="c">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.team?._id || row.rank} style={{background: row.qualifiesTop3 ? 'rgba(46,204,113,0.06)' : 'transparent'}}>
                      <td>{row.rank}</td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <TL color={row.team?.color} abbr={row.team?.abbreviation} size={18} />
                          <span>{row.team?.name || 'TBD'}</span>
                        </div>
                      </td>
                      <td className="c">{row.played}</td>
                      <td className="c">{row.won}</td>
                      <td className="c">{row.drawn}</td>
                      <td className="c">{row.lost}</td>
                      <td className="c"><strong>{row.points}</strong></td>
                      <td className="c">{row.scoreDiff}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && <tr><td colSpan={8}><div className="al al-in">No completed league matches yet.</div></td></tr>}
                </tbody>
              </table>
            </div>

            <div className="card" style={{padding:16}}>
              <div style={{fontWeight:700, marginBottom:10}}>League fixtures</div>
              {sortedMatches.length === 0 && <div className="al al-in">No fixtures yet.</div>}
              {sortedMatches.map((m) => {
                const row = scheduleDraft.find((s) => s.matchId === m._id);
                return (
                  <div key={m._id} style={{display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr auto', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <TL color={m.team1Id?.color} abbr={m.team1Id?.abbreviation} size={20} />
                      <span style={{fontWeight:600}}>{m.team1Id?.name || 'TBD'}</span>
                      <span style={{color:'var(--tx4)'}}>vs</span>
                      <span style={{fontWeight:600}}>{m.team2Id?.name || 'TBD'}</span>
                      <TL color={m.team2Id?.color} abbr={m.team2Id?.abbreviation} size={20} />
                    </div>
                    {reviewMode ? (
                      <input className="fi" type="date" value={row?.matchDate || ''} onChange={(e) => setScheduleDraft((prev) => prev.map((x) => x.matchId === m._id ? { ...x, matchDate: e.target.value } : x))} />
                    ) : (
                      <div>{m.matchDate ? new Date(m.matchDate).toLocaleDateString('en-IN') : 'TBD'}</div>
                    )}
                    {reviewMode ? (
                      <input className="fi" type="time" value={row?.matchTime || '10:00'} onChange={(e) => setScheduleDraft((prev) => prev.map((x) => x.matchId === m._id ? { ...x, matchTime: e.target.value } : x))} />
                    ) : (
                      <div>{m.matchTime || '10:00'}</div>
                    )}
                    {reviewMode ? (
                      <input className="fi" value={row?.venue || ''} onChange={(e) => setScheduleDraft((prev) => prev.map((x) => x.matchId === m._id ? { ...x, venue: e.target.value } : x))} />
                    ) : (
                      <div>{m.venue || '-'}</div>
                    )}
                    <button className="btn btn-s btn-sm" onClick={() => nav(`/matches/${m._id}`)}>Open</button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
