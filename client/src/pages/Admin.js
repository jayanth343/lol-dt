// client/src/pages/Admin.js
import React, { useState, useEffect } from 'react';
import { TL as TeamLogo, Ldr as Loader } from '../components/Shared';
import { apiMatches, apiTeams, apiPlayers, apiAddMatch, apiUpdateMatch, apiDeleteMatch, getSocket } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const SPORTS  = ['cricket','football','badminton','table_tennis','carrom'];
const SI      = { cricket:'🏏', football:'⚽', badminton:'🏸', table_tennis:'🏓', carrom:'🎯' };
const VENUES  = ['Ground A','Ground B','Court 1','Court 2','Badminton Hall','TT Room','Indoor Zone'];

export default function Admin() {
  const nav = useNavigate();
  const [tab,     setTab]     = useState('matches');
  const [matches, setMatches] = useState([]);
  const [teams,   setTeams]   = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newMatch, setNewMatch] = useState({ sport:'cricket', team1Id:'', team2Id:'', matchDate:'', matchTime:'10:00', venue:'Ground A', round:'Group Stage', overs:20 });
  const [flash, setFlash]   = useState('');

  useEffect(() => {
    Promise.all([apiMatches(), apiTeams(), apiPlayers()])
      .then(([m, t, p]) => { setMatches(Array.isArray(m) ? m : []); setTeams(Array.isArray(t) ? t : []); setPlayers(Array.isArray(p) ? p : []); setLoading(false); });
  }, []);

  // Live status changes
  useEffect(() => {
    const socket = getSocket();
    socket.on('match:statusChange', ({ matchId, status }) => {
      setMatches(prev => prev.map(m => m._id === matchId ? { ...m, status } : m));
    });
    socket.on('match:score', ({ matchId, team1Score, team2Score, status }) => {
      setMatches(prev => prev.map(m => m._id === matchId ? { ...m, team1Score, team2Score, status } : m));
    });
    return () => { socket.off('match:statusChange'); socket.off('match:score'); };
  }, []);

  const msg = (m) => { setFlash(m); setTimeout(() => setFlash(''), 3000); };

  const saveEdit = async (id) => {
    const updated = await apiUpdateMatch(id, editForm);
    if (updated.error) return msg('❌ ' + updated.error);
    setMatches(prev => prev.map(m => m._id === id ? { ...m, ...editForm } : m));
    setEditing(null);
    msg('✅ Match updated');
  };

  const deleteMatch = async (id) => {
    if (!window.confirm('Delete this match?')) return;
    await apiDeleteMatch(id);
    setMatches(prev => prev.filter(m => m._id !== id));
    msg('Match deleted');
  };

  const createMatch = async () => {
    if (!newMatch.team1Id || !newMatch.team2Id || !newMatch.matchDate) return msg('Fill all required fields');
    const res = await apiAddMatch(newMatch);
    if (res.error) return msg('❌ ' + res.error);
    setMatches(prev => [res, ...prev]);
    setShowNew(false);
    msg('✅ Match scheduled');
  };

  const setStatus = async (id, status, winnerId = null) => {
    const body = { status };
    if (winnerId) body.winnerId = winnerId;
    await apiUpdateMatch(id, body);
    setMatches(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    getSocket().emit('match:setStatus', { matchId: id, status });
    msg(`Match marked ${status}`);
  };

  if (loading) return <div className="pg"><Loader /></div>;

  const live = matches.filter(m => m.status === 'live').length;

  return (
    <div className="pg">
      {/* Admin bar */}
      <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: 'var(--acc)', color: '#111', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 3 }}>⚙️ ADMIN</span>
        <span style={{ color: '#aaa', fontSize: 13 }}>Admin & Team Owner Panel</span>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: 11 }}>Socket.io live updates active</span>
      </div>

      {flash && <div className={`al ${flash.startsWith('❌') ? 'al-err' : 'al-ok'}`} style={{ marginBottom: 12 }}>{flash}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[['Matches', matches.length, '#e74c3c'], ['Live Now', live, '#e8000d'], ['Players', players.length, '#3498db'], ['Teams', teams.length, '#27ae60']].map(([l, v, c]) => (
          <div key={l} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 28, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="stabs">
          {[['matches','Matches'],['players','Players'],['teams','Teams']].map(([k,l]) => (
            <button key={k} className={`stab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── MATCHES ── */}
        {tab === 'matches' && (
          <>
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bdr)' }}>
              <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{matches.length} matches</span>
              <button className="btn btn-p btn-sm" onClick={() => setShowNew(!showNew)}>+ Schedule Match</button>
            </div>

            {showNew && (
              <div style={{ padding: 16, background: 'var(--surf2)', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>New Match</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  <div><label className="fl">Sport *</label><select className="fs" value={newMatch.sport} onChange={e => setNewMatch({ ...newMatch, sport: e.target.value })}>{SPORTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="fl">Team 1 *</label><select className="fs" value={newMatch.team1Id} onChange={e => setNewMatch({ ...newMatch, team1Id: e.target.value })}><option value="">Select</option>{teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                  <div><label className="fl">Team 2 *</label><select className="fs" value={newMatch.team2Id} onChange={e => setNewMatch({ ...newMatch, team2Id: e.target.value })}><option value="">Select</option>{teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                  <div><label className="fl">Date *</label><input className="fi" type="date" value={newMatch.matchDate} onChange={e => setNewMatch({ ...newMatch, matchDate: e.target.value })} /></div>
                  <div><label className="fl">Time</label><input className="fi" type="time" value={newMatch.matchTime} onChange={e => setNewMatch({ ...newMatch, matchTime: e.target.value })} /></div>
                  <div><label className="fl">Venue</label><select className="fs" value={newMatch.venue} onChange={e => setNewMatch({ ...newMatch, venue: e.target.value })}>{VENUES.map(v => <option key={v}>{v}</option>)}</select></div>
                  <div><label className="fl">Round</label><input className="fi" placeholder="Group A" value={newMatch.round} onChange={e => setNewMatch({ ...newMatch, round: e.target.value })} /></div>
                  {newMatch.sport === 'cricket' && <div><label className="fl">Overs</label><input className="fi" type="number" value={newMatch.overs} onChange={e => setNewMatch({ ...newMatch, overs: Number(e.target.value) })} /></div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-p btn-sm" onClick={createMatch}>Save Match</button>
                  <button className="btn btn-s btn-sm" onClick={() => setShowNew(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>Match</th><th>Sport</th><th className="c">Score</th><th className="c">Status</th><th className="c">Date</th><th className="c">Actions</th></tr></thead>
                <tbody>
                  {matches.map(m => {
                    const t1 = m.team1Id || {}; const t2 = m.team2Id || {};
                    return (
                      <tr key={m._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TeamLogo color={t1.color} abbr={t1.abbreviation} size={22} />
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{t1.name} <span style={{ color: 'var(--tx3)' }}>vs</span> {t2.name}</span>
                          </div>
                        </td>
                        <td><span style={{ fontSize: 12 }}>{SI[m.sport]} {m.sport?.replace('_',' ')}</span></td>
                        <td className="c">
                          {editing === m._id ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <input className="fi" style={{ width: 70, padding: '3px 6px', fontSize: 12 }} value={editForm.team1Score || ''} onChange={e => setEditForm({ ...editForm, team1Score: e.target.value })} placeholder="T1" />
                              <span style={{ alignSelf: 'center' }}>–</span>
                              <input className="fi" style={{ width: 70, padding: '3px 6px', fontSize: 12 }} value={editForm.team2Score || ''} onChange={e => setEditForm({ ...editForm, team2Score: e.target.value })} placeholder="T2" />
                            </div>
                          ) : <span style={{ fontSize: 12 }}>{m.team1Score || '—'} – {m.team2Score || '—'}</span>}
                        </td>
                        <td className="c">
                          {editing === m._id ? (
                            <select className="fs" style={{ padding: '3px 6px', fontSize: 12, width: 'auto' }} value={editForm.status || m.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                              {['upcoming','live','completed','cancelled'].map(s => <option key={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span className={`bdg ${m.status === 'live' ? 'b-r' : m.status === 'completed' ? 'b-g' : 'b-b'}`}>{m.status}</span>
                          )}
                        </td>
                        <td className="c" style={{ fontSize: 12, color: 'var(--tx3)' }}>{m.matchDate ? new Date(m.matchDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="c">
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {editing === m._id ? (
                              <>
                                <button className="btn btn-ok btn-sm" onClick={() => saveEdit(m._id)}>Save</button>
                                <button className="btn btn-s btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-s btn-sm" onClick={() => { setEditing(m._id); setEditForm({ team1Score: m.team1Score, team2Score: m.team2Score, status: m.status }); }}>Edit</button>
                                <button className="btn btn-p btn-sm" onClick={() => nav(`/matches/${m._id}`)}>Score</button>
                                {m.status === 'upcoming' && <button className="btn btn-ok btn-sm" onClick={() => setStatus(m._id, 'live')}>Go Live</button>}
                                <button className="btn btn-ng btn-sm" onClick={() => deleteMatch(m._id)}>Del</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── PLAYERS ── */}
        {tab === 'players' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Player</th><th>Dept</th><th>Sports</th><th>Skill</th><th className="c">Status</th><th className="c">Base</th><th className="c">Bid</th></tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.department}</td>
                    <td><div style={{ display: 'flex', gap: 3 }}>{p.sports.map(s => <span key={s} style={{ fontSize: 14 }}>{SI[s]}</span>)}</div></td>
                    <td><span className={`bdg ${p.skillLevel === 'Advanced' ? 'b-g' : p.skillLevel === 'Intermediate' ? 'b-b' : 'b-gr'}`}>{p.skillLevel || '—'}</span></td>
                    <td className="c"><span className={`bdg ${p.status === 'sold' ? 'b-g' : 'b-b'}`}>{p.status}</span></td>
                    <td className="c" style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600 }}>{p.basePrice}</td>
                    <td className="c" style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, color: 'var(--red)' }}>{p.bidPrice || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TEAMS ── */}
        {tab === 'teams' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>Team</th><th>Department</th><th className="c">Budget</th><th className="c">Spent</th><th className="c">Left</th><th>Usage</th></tr></thead>
              <tbody>
                {teams.map(t => {
                  const pct = Math.round((t.spent / t.budget) * 100);
                  return (
                    <tr key={t._id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TeamLogo color={t.color} abbr={t.abbreviation} size={26} />{t.name}</div></td>
                      <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.department}</td>
                      <td className="c" style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600 }}>{t.budget}</td>
                      <td className="c" style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, color: 'var(--red)' }}>{t.spent}</td>
                      <td className="c" style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 600, color: 'var(--grn)' }}>{t.budget - t.spent}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bdr)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: t.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--tx3)', minWidth: 30 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
