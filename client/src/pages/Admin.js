// client/src/pages/Admin.js
import React, { useState, useEffect } from 'react';
import { TL as TeamLogo, Ldr as Loader, SportIcon } from '../components/Shared';
import {
  apiMatches,
  apiTeams,
  apiPlayers,
  apiAddMatch,
  apiUpdateMatch,
  apiDeleteMatch,
  getSocket,
  apiCreateTournament,
  apiCreateSport,
  apiSports,
  apiTournaments,
  apiUpdateTournamentTeams,
  apiGenerateLeagueMatches,
  apiGenerateKnockoutMatches
} from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const PRESET_SPORTS = [
  { name: 'cricket', icon: '🏏', scoringType: 'custom', customSettings: { unit: 'Runs', pointsToWin: 1, gamesPerMatch: 1, minPointDelta: 0, allowDraw: true, maxDurationMins: 180, extraRules: 'Overs-based scoring' } },
  { name: 'football', icon: '⚽', scoringType: 'custom', customSettings: { unit: 'Goals', pointsToWin: 1, gamesPerMatch: 1, minPointDelta: 0, allowDraw: true, maxDurationMins: 90, extraRules: '' } },
  { name: 'badminton', icon: '🏸', scoringType: 'custom', customSettings: { unit: 'Points', pointsToWin: 21, gamesPerMatch: 3, minPointDelta: 2, allowDraw: false, maxDurationMins: 60, extraRules: 'Best of 3' } },
  { name: 'table_tennis', icon: '🏓', scoringType: 'custom', customSettings: { unit: 'Points', pointsToWin: 11, gamesPerMatch: 5, minPointDelta: 2, allowDraw: false, maxDurationMins: 45, extraRules: 'Best of 5' } },
  { name: 'carrom', icon: '🎯', scoringType: 'custom', customSettings: { unit: 'Points', pointsToWin: 25, gamesPerMatch: 1, minPointDelta: 0, allowDraw: false, maxDurationMins: 60, extraRules: '' } }
];
const VENUES  = ['Ground A','Ground B','Court 1','Court 2','Badminton Hall','TT Room','Indoor Zone'];

export default function Admin() {
  const nav = useNavigate();
  const { showToast } = useToast();
  const [tab,     setTab]     = useState('matches');
  const [matches, setMatches] = useState([]);
  const [teams,   setTeams]   = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newMatch, setNewMatch] = useState({ sport:'', team1Id:'', team2Id:'', matchDate:'', matchTime:'10:00', venue:'Ground A', round:'Group Stage', overs:20 });
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [dragTeamIds, setDragTeamIds] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [editingTournamentId, setEditingTournamentId] = useState('');
  const [tForm, setTForm] = useState({
    name: '',
    sport: '',
    format: 'knockout',
    status: 'upcoming',
    minTeams: 2,
    maxTeams: 8,
    matchesPerPair: 1,
    scheduleIntervalDays: 1,
    defaultMatchTime: '10:00',
    topQualifiers: 3,
    description: '',
    venue: '',
    startDate: '',
    teams: []
  });
  const [sForm, setSForm] = useState({
    name: '',
    icon: '',
    unit: 'Points',
    pointsToWin: 21,
    gamesPerMatch: 1,
    minPointDelta: 0,
    allowDraw: false,
    maxDurationMins: 0,
    extraRules: ''
  });

  useEffect(() => {
    Promise.all([apiMatches(), apiTeams(), apiPlayers(), apiSports(), apiTournaments()])
      .then(([m, t, p, sp, tr]) => {
        setMatches(Array.isArray(m) ? m : []);
        setTeams(Array.isArray(t) ? t : []);
        setPlayers(Array.isArray(p) ? p : []);
        setSports(Array.isArray(sp) ? sp : []);
        setTournaments(Array.isArray(tr) ? tr : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  const msg = (message, severity = 'info') => showToast(message, severity);

  const saveEdit = async (id) => {
    const updated = await apiUpdateMatch(id, editForm);
    if (updated.error) return msg(updated.error, 'error');
    setMatches(prev => prev.map(m => m._id === id ? { ...m, ...editForm } : m));
    setEditing(null);
    msg('Match updated', 'success');
  };

  const deleteMatch = async (id) => {
    if (!window.confirm('Delete this match?')) return;
    await apiDeleteMatch(id);
    setMatches(prev => prev.filter(m => m._id !== id));
    msg('Match deleted', 'success');
  };

  const createMatch = async () => {
    if (!newMatch.sport || !newMatch.team1Id || !newMatch.team2Id || !newMatch.matchDate) return msg('Fill all required fields', 'warning');
    const sportObj = sports.find((s) => String(s._id) === String(newMatch.sport));
    const payload = {
      ...newMatch,
      sportRef: sportObj?._id,
      sport: sportObj?.name || newMatch.sport
    };
    const res = await apiAddMatch(payload);
    if (res.error) return msg(res.error, 'error');
    setMatches(prev => [res, ...prev]);
    setShowNew(false);
    msg('Match scheduled', 'success');
  };

  const setStatus = async (id, status, winnerId = null) => {
    const body = { status };
    if (winnerId) body.winnerId = winnerId;
    await apiUpdateMatch(id, body);
    setMatches(prev => prev.map(m => m._id === id ? { ...m, status } : m));
    getSocket().emit('match:setStatus', { matchId: id, status });
    msg(`Match marked ${status}`, 'success');
  };

  const refreshTournaments = async () => {
    const tr = await apiTournaments();
    setTournaments(Array.isArray(tr) ? tr : []);
  };

  const saveTournament = async () => {
    const minTeams = Math.max(2, Number(tForm.minTeams) || 2);
    const maxTeams = Math.max(minTeams, Number(tForm.maxTeams) || minTeams);
    if (!tForm.name.trim()) return msg('Tournament name is required', 'warning');
    if (!tForm.sport) return msg('Please select a sport', 'warning');
    if ((tForm.teams || []).length < minTeams) return msg(`Add at least ${minTeams} teams`, 'warning');
    if ((tForm.teams || []).length > maxTeams) return msg(`Maximum ${maxTeams} teams allowed`, 'warning');

    const payload = {
      name: tForm.name.trim(),
      sport: tForm.sport,
      format: tForm.format,
      status: tForm.status,
      minTeams,
      maxTeams,
      matchesPerPair: Math.max(1, Number(tForm.matchesPerPair) || 1),
      scheduleIntervalDays: Math.max(1, Number(tForm.scheduleIntervalDays) || 1),
      defaultMatchTime: tForm.defaultMatchTime || '10:00',
      topQualifiers: Math.max(1, Number(tForm.topQualifiers) || 3),
      description: tForm.description,
      venue: tForm.venue,
      startDate: tForm.startDate || null,
      teams: tForm.teams
    };

    const res = await apiCreateTournament(payload);
    if (res?.error) return msg(res.error, 'error');
    await refreshTournaments();
    setTForm({
      name: '', sport: '', format: 'knockout', status: 'upcoming', minTeams: 2, maxTeams: 8,
      matchesPerPair: 1, scheduleIntervalDays: 1, defaultMatchTime: '10:00', topQualifiers: 3,
      description: '', venue: '', startDate: '', teams: []
    });
    setSelectedTeamIds([]);
    msg('Tournament created', 'success');
  };

  const saveSport = async () => {
    if (!sForm.name.trim()) return msg('Sport name is required', 'warning');
    const payload = {
      name: sForm.name.trim(),
      icon: sForm.icon || '🏆',
      scoringType: 'custom',
      customSettings: {
        unit: sForm.unit || 'Points',
        pointsToWin: Math.max(1, Number(sForm.pointsToWin) || 21),
        gamesPerMatch: Math.max(1, Number(sForm.gamesPerMatch) || 1),
        minPointDelta: Math.max(0, Number(sForm.minPointDelta) || 0),
        allowDraw: !!sForm.allowDraw,
        maxDurationMins: Math.max(0, Number(sForm.maxDurationMins) || 0),
        extraRules: sForm.extraRules || ''
      }
    };
    const res = await apiCreateSport(payload);
    if (res?.error) return msg(res.error, 'error');
    const sp = await apiSports();
    setSports(Array.isArray(sp) ? sp : []);
    setSForm({
      name: '', icon: '', unit: 'Points', pointsToWin: 21, gamesPerMatch: 1,
      minPointDelta: 0, allowDraw: false, maxDurationMins: 0, extraRules: ''
    });
    msg('Custom sport created', 'success');
  };

  const ensurePresetSports = async () => {
    const existingNames = new Set((sports || []).map((s) => String(s.name || '').toLowerCase()));
    const missing = PRESET_SPORTS.filter((s) => !existingNames.has(s.name.toLowerCase()));
    if (!missing.length) return msg('Preset sports already available', 'info');

    await Promise.all(missing.map((sport) => apiCreateSport(sport)));
    const sp = await apiSports();
    setSports(Array.isArray(sp) ? sp : []);
    msg(`Added ${missing.length} preset sport(s)`, 'success');
  };

  const addTeamToForm = (teamId) => {
    setTForm(prev => prev.teams.includes(teamId) ? prev : { ...prev, teams: [...prev.teams, teamId] });
  };
  const removeTeamFromForm = (teamId) => {
    setTForm(prev => ({ ...prev, teams: prev.teams?.filter(id => id !== teamId) }));
  };
  const onDropAssigned = (e) => {
    e.preventDefault();
    dragTeamIds.forEach((id) => addTeamToForm(id));
    setDragTeamIds([]);
  };
  const onDropAvailable = (e) => {
    e.preventDefault();
    dragTeamIds.forEach((id) => removeTeamFromForm(id));
    setDragTeamIds([]);
  };

  const toggleTeamSelect = (teamId) => {
    setSelectedTeamIds((prev) => prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]);
  };

  const startTeamDrag = (teamId) => {
    const ids = selectedTeamIds.includes(teamId) ? selectedTeamIds : [teamId];
    setDragTeamIds(ids);
  };

  const saveTournamentTeams = async (tournamentId) => {
    const tournament = tournaments.find(t => t._id === tournamentId);
    if (!tournament) return;
    const minTeams = Math.max(2, Number(tournament.minTeams) || 2);
    const maxTeams = Math.max(minTeams, Number(tournament.maxTeams) || minTeams);
    const teamIds = (tournament.teams || []).map(t => t._id || t);
    const res = await apiUpdateTournamentTeams(tournamentId, teamIds, minTeams, maxTeams);
    if (res?.error) return msg(res.error, 'error');
    await refreshTournaments();
    msg('Tournament teams updated', 'success');
  };

  const generateMatchesForTournament = async (tournament) => {
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

    if (res?.error) return msg(res.error, 'error');
    msg(`Generated ${res?.count || 0} fixtures`, 'success');
  };

  const moveTeamInTournament = (tournamentId, team, toAssigned) => {
    setTournaments(prev => prev.map(t => {
      if (t._id !== tournamentId) return t;
      const existing = Array.isArray(t.teams) ? t.teams : [];
      const has = existing.some(et => String(et._id || et) === String(team._id || team));
      if (toAssigned && !has) return { ...t, teams: [...existing, team] };
      if (!toAssigned && has) return { ...t, teams: existing.filter(et => String(et._id || et) !== String(team._id || team)) };
      return t;
    }));
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[['Matches', matches.length, '#e74c3c'], ['Live Now', live, '#e8000d'], ['Players', players.length, '#3498db'], ['Teams', teams.length, '#27ae60']].map(([l, v, c]) => (
          <div key={l} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="stabs">
          {[['matches','Matches'],['players','Players'],['teams','Teams'],['tournaments','Tournaments']].map(([k,l]) => (
            <button key={k} className={`stab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── TOURNAMENTS ── */}
        {tab === 'tournaments' && (
          <div style={{ padding: 16 }}>
            <h3 style={{marginBottom: 10}}>Create Tournament</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10, marginTop:10 }}>
              <div>
                <label className="fl">Name</label>
                <input className="fi" placeholder="E.g. CTO Knockouts" value={tForm.name} onChange={(e)=>setTForm({...tForm, name:e.target.value})} />
              </div>
              <div>
                <label className="fl">Sport *</label>
                <select className="fs" value={tForm.sport} onChange={(e)=>setTForm({...tForm, sport:e.target.value})}>
                  <option value="">Select sport</option>
                  {sports?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="fl">Format</label>
                <select className="fs" value={tForm.format} onChange={(e)=>setTForm({...tForm, format:e.target.value})}>
                  <option value="knockout">Knockout</option>
                  <option value="league">League</option>
                </select>
              </div>
              <div>
                <label className="fl">Status</label>
                <select className="fs" value={tForm.status} onChange={(e)=>setTForm({...tForm, status:e.target.value})}>
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="fl">Min teams *</label>
                <input className="fi" type="number" min="2" value={tForm.minTeams} onChange={(e)=>setTForm({...tForm, minTeams: Math.max(2, Number(e.target.value) || 2)})} />
              </div>
              <div>
                <label className="fl">Max teams *</label>
                <input className="fi" type="number" min={tForm.minTeams} value={tForm.maxTeams} onChange={(e)=>setTForm({...tForm, maxTeams: Math.max(tForm.minTeams, Number(e.target.value) || tForm.minTeams)})} />
              </div>
              <div>
                <label className="fl">Start date</label>
                <input className="fi" type="date" value={tForm.startDate} onChange={(e)=>setTForm({...tForm, startDate:e.target.value})} />
              </div>
              {tForm.format === 'league' && (
                <>
                  <div>
                    <label className="fl">Matches per pair</label>
                    <input className="fi" type="number" min="1" value={tForm.matchesPerPair} onChange={(e)=>setTForm({...tForm, matchesPerPair: Math.max(1, Number(e.target.value) || 1)})} />
                  </div>
                  <div>
                    <label className="fl">Top qualifiers</label>
                    <input className="fi" type="number" min="1" max="8" value={tForm.topQualifiers} onChange={(e)=>setTForm({...tForm, topQualifiers: Math.max(1, Math.min(8, Number(e.target.value) || 3))})} />
                  </div>
                </>
              )}
              <div>
                <label className="fl">Schedule interval (days)</label>
                <input className="fi" type="number" min="1" value={tForm.scheduleIntervalDays} onChange={(e)=>setTForm({...tForm, scheduleIntervalDays: Math.max(1, Number(e.target.value) || 1)})} />
              </div>
              <div>
                <label className="fl">Default match time</label>
                <input className="fi" type="time" value={tForm.defaultMatchTime} onChange={(e)=>setTForm({...tForm, defaultMatchTime:e.target.value})} />
              </div>
              <div>
                <label className="fl">Venue</label>
                <input className="fi" placeholder="Ground A" value={tForm.venue} onChange={(e)=>setTForm({...tForm, venue:e.target.value})} />
              </div>
              <div style={{gridColumn:'span 2'}}>
                <label className="fl">Description</label>
                <input className="fi" placeholder="Tournament details..." value={tForm.description} onChange={(e)=>setTForm({...tForm, description:e.target.value})} />
              </div>
            </div>

            <div style={{display:'flex', gap:8, marginBottom:8}}>
              <button className="btn btn-s btn-sm" onClick={() => setSelectedTeamIds(teams?.filter(t => !tForm.teams.includes(t._id)).map(t => t._id) || [])}>Select all available</button>
              <button className="btn btn-s btn-sm" onClick={() => setSelectedTeamIds([])}>Clear selection</button>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12, marginBottom:10}}>
              <div
                style={{border:'1px dashed var(--line2)', borderRadius:8, padding:10, minHeight:190}}
                onDragOver={(e)=>e.preventDefault()}
                onDrop={onDropAvailable}
              >
                <div style={{fontWeight:700, marginBottom:8, fontSize:12, color:'var(--tx3)', textTransform:'uppercase'}}>Available teams</div>
                {teams?.filter(t => !tForm.teams.includes(t._id)).map(t => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={() => startTeamDrag(t._id)}
                    style={{display:'flex', alignItems:'center', gap:8, padding:'7px 8px', border:'1px solid var(--line)', borderRadius:8, marginBottom:6, cursor:'grab'}}
                  >
                    <input type="checkbox" checked={selectedTeamIds.includes(t._id)} onChange={() => toggleTeamSelect(t._id)} />
                    <TeamLogo color={t.color} abbr={t.abbreviation} size={20} />
                    <div style={{fontSize:12, fontWeight:600}}>{t.name}</div>
                  </div>
                ))}
              </div>
              <div
                style={{border:'1px dashed var(--acc)', borderRadius:8, padding:10, minHeight:190, background:'var(--card2)'}}
                onDragOver={(e)=>e.preventDefault()}
                onDrop={onDropAssigned}
              >
                <div style={{fontWeight:700, marginBottom:8, fontSize:12, color:'var(--tx3)', textTransform:'uppercase'}}>
                  Tournament teams ({tForm.teams.length}/{tForm.minTeams} min)
                </div>
                {tForm.teams?.map(teamId => {
                  const t = teams.find(tm => tm._id === teamId);
                  if (!t) return null;
                  return (
                    <div
                      key={t._id}
                      draggable
                      onDragStart={() => startTeamDrag(t._id)}
                      style={{display:'flex', alignItems:'center', gap:8, padding:'7px 8px', border:'1px solid var(--line)', borderRadius:8, marginBottom:6, cursor:'grab'}}
                    >
                      <TeamLogo color={t.color} abbr={t.abbreviation} size={20} />
                      <div style={{fontSize:12, fontWeight:600, flex:1}}>{t.name}</div>
                      <button className="btn btn-ng btn-sm" onClick={()=>removeTeamFromForm(t._id)}>Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:16}}>
              <button className="btn btn-p btn-sm" onClick={saveTournament}>Save Tournament</button>
              <button className="btn btn-s btn-sm" onClick={ensurePresetSports}>Load preset sports</button>
              <span style={{fontSize:11, color:'var(--tx3)'}}>Tip: select multiple teams and drag once.</span>
            </div>

            <div style={{borderTop:'1px solid var(--line)', paddingTop:16}}>
              <h3 style={{marginBottom: 10}}>Create Custom Sport</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10, marginTop:10 }}>
                <div><label className="fl">Name</label><input className="fi" placeholder="E.g. Volleyball" value={sForm.name} onChange={(e)=>setSForm({...sForm, name:e.target.value})} /></div>
                <div><label className="fl">Icon (optional)</label><input className="fi" placeholder="🏐" value={sForm.icon} onChange={(e)=>setSForm({...sForm, icon:e.target.value})} /></div>
                <div><label className="fl">Score unit</label><input className="fi" placeholder="Points/Goals/Runs" value={sForm.unit} onChange={(e)=>setSForm({...sForm, unit:e.target.value})} /></div>
                <div><label className="fl">Points to win game</label><input className="fi" type="number" min="1" value={sForm.pointsToWin} onChange={(e)=>setSForm({...sForm, pointsToWin:Number(e.target.value)})} /></div>
                <div><label className="fl">Games per match</label><input className="fi" type="number" min="1" value={sForm.gamesPerMatch} onChange={(e)=>setSForm({...sForm, gamesPerMatch:Number(e.target.value)})} /></div>
                <div><label className="fl">Min point delta</label><input className="fi" type="number" min="0" value={sForm.minPointDelta} onChange={(e)=>setSForm({...sForm, minPointDelta:Number(e.target.value)})} /></div>
                <div><label className="fl">Max duration (mins)</label><input className="fi" type="number" min="0" value={sForm.maxDurationMins} onChange={(e)=>setSForm({...sForm, maxDurationMins:Number(e.target.value)})} /></div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:18}}>
                  <input type="checkbox" checked={sForm.allowDraw} onChange={(e)=>setSForm({...sForm, allowDraw:e.target.checked})} />
                  <label className="fl" style={{margin:0}}>Allow draw</label>
                </div>
                <div style={{gridColumn:'span 3'}}><label className="fl">Other factors / rules</label><input className="fi" placeholder="Tie-break, bonus points, penalty rules..." value={sForm.extraRules} onChange={(e)=>setSForm({...sForm, extraRules:e.target.value})} /></div>
              </div>
              <button className="btn btn-p btn-sm" onClick={saveSport}>Save Sport</button>
            </div>

            <div style={{borderTop:'1px solid var(--line)', marginTop:18, paddingTop:16}}>
              <h3 style={{marginBottom:10}}>Existing Tournaments</h3>
              {tournaments.length === 0 && <div className="al al-in">No tournaments created yet.</div>}
              <div style={{display:'grid', gap:10}}>
                {tournaments?.map(t => {
                  const assignedIds = (t.teams || []).map(tm => String(tm._id || tm));
                  const availableForTournament = teams?.filter(tm => !assignedIds.includes(String(tm._id)));
                  return (
                    <div key={t._id} className="card" style={{padding:12}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700, display:'flex', alignItems:'center', gap:6}}>
                            <SportIcon sport={t.sport?.name || t.sport} style={{fontSize:16}} /> {t.name}
                          </div>
                          <div style={{fontSize:11, color:'var(--tx3)'}}>
                            {(t.format || '-').toUpperCase()} · {(t.status || '-').toUpperCase()} · Teams: {(t.teams || []).length} / {t.minTeams || 2}-{t.maxTeams || '-'}
                          </div>
                          <div style={{fontSize:11, color:'var(--tx3)'}}>
                            Every {t.scheduleIntervalDays || 1} day(s) · {t.defaultMatchTime || '10:00'}
                          </div>
                        </div>
                        <div style={{display:'flex', gap:6}}>
                          <button className="btn btn-s btn-sm" onClick={()=>setEditingTournamentId(editingTournamentId===t._id ? '' : t._id)}>{editingTournamentId===t._id ? 'Close' : 'Manage teams'}</button>
                          <button className="btn btn-ok btn-sm" onClick={()=>saveTournamentTeams(t._id)}>Save teams</button>
                          <button className="btn btn-p btn-sm" onClick={()=>generateMatchesForTournament(t)}>Generate</button>
                          <button className="btn btn-s btn-sm" onClick={()=>nav(`/tournaments/${t._id}?review=1`)}>Review dates</button>
                        </div>
                      </div>

                      {editingTournamentId === t._id && (
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8}}>
                          <div
                            style={{border:'1px dashed var(--line2)', borderRadius:8, padding:8, minHeight:110}}
                            onDragOver={(e)=>e.preventDefault()}
                            onDrop={(e)=>{e.preventDefault(); dragTeamIds.forEach((id) => { const team = teams.find(tm => tm._id===id); if (team) moveTeamInTournament(t._id, team, false); }); setDragTeamIds([]);}}
                          >
                            <div style={{fontSize:11, color:'var(--tx3)', marginBottom:6}}>Available</div>
                            {availableForTournament.map(tm => (
                              <div key={tm._id} draggable onDragStart={()=>setDragTeamIds([tm._id])} style={{display:'flex', alignItems:'center', gap:8, border:'1px solid var(--line)', borderRadius:8, padding:'6px 8px', marginBottom:5}}>
                                <TeamLogo color={tm.color} abbr={tm.abbreviation} size={18} />
                                <span style={{fontSize:12}}>{tm.name}</span>
                                <button className="btn btn-s btn-sm" onClick={()=>moveTeamInTournament(t._id, tm, true)}>Add</button>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{border:'1px dashed var(--acc)', borderRadius:8, padding:8, minHeight:110, background:'var(--card2)'}}
                            onDragOver={(e)=>e.preventDefault()}
                            onDrop={(e)=>{e.preventDefault(); dragTeamIds.forEach((id) => { const team = teams.find(tm => tm._id===id); if (team) moveTeamInTournament(t._id, team, true); }); setDragTeamIds([]);}}
                          >
                            <div style={{fontSize:11, color:'var(--tx3)', marginBottom:6}}>Assigned ({(t.teams||[]).length})</div>
                            {(t.teams || []).map(tm => {
                              const teamObj = tm._id ? tm : teams.find(tt => String(tt._id) === String(tm));
                              if (!teamObj) return null;
                              return (
                                <div key={teamObj._id} draggable onDragStart={()=>setDragTeamIds([teamObj._id])} style={{display:'flex', alignItems:'center', gap:8, border:'1px solid var(--line)', borderRadius:8, padding:'6px 8px', marginBottom:5}}>
                                  <TeamLogo color={teamObj.color} abbr={teamObj.abbreviation} size={18} />
                                  <span style={{fontSize:12, flex:1}}>{teamObj.name}</span>
                                  <button className="btn btn-ng btn-sm" onClick={()=>moveTeamInTournament(t._id, teamObj, false)}>Remove</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MATCHES ── */}
        {tab === 'matches' && (
          <>
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{matches.length} matches</span>
              <button className="btn btn-p btn-sm" onClick={() => setShowNew(!showNew)}>+ Schedule Match</button>
            </div>

            {showNew && (
              <div style={{ padding: 16, background: 'var(--card2)', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>New Match</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  <div><label className="fl">Sport *</label><select className="fs" value={newMatch.sport} onChange={e => setNewMatch({ ...newMatch, sport: e.target.value })}><option value="">Select sport</option>{sports?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
                  <div><label className="fl">Team 1 *</label><select className="fs" value={newMatch.team1Id} onChange={e => setNewMatch({ ...newMatch, team1Id: e.target.value })}><option value="">Select</option>{teams?.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                  <div><label className="fl">Team 2 *</label><select className="fs" value={newMatch.team2Id} onChange={e => setNewMatch({ ...newMatch, team2Id: e.target.value })}><option value="">Select</option>{teams?.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                  <div><label className="fl">Date *</label><input className="fi" type="date" value={newMatch.matchDate} onChange={e => setNewMatch({ ...newMatch, matchDate: e.target.value })} /></div>
                  <div><label className="fl">Time</label><input className="fi" type="time" value={newMatch.matchTime} onChange={e => setNewMatch({ ...newMatch, matchTime: e.target.value })} /></div>
                  <div><label className="fl">Venue</label><select className="fs" value={newMatch.venue} onChange={e => setNewMatch({ ...newMatch, venue: e.target.value })}>{VENUES.map(v => <option key={v}>{v}</option>)}</select></div>
                  <div><label className="fl">Round</label><input className="fi" placeholder="Group A" value={newMatch.round} onChange={e => setNewMatch({ ...newMatch, round: e.target.value })} /></div>
                  {(sports.find((s) => String(s._id) === String(newMatch.sport))?.name === 'cricket') && <div><label className="fl">Overs</label><input className="fi" type="number" value={newMatch.overs} onChange={e => setNewMatch({ ...newMatch, overs: Number(e.target.value) })} /></div>}
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
                  {matches?.map(m => {
                    const t1 = m.team1Id || {}; const t2 = m.team2Id || {};
                    return (
                      <tr key={m._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TeamLogo color={t1.color} abbr={t1.abbreviation} size={22} />
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{t1.name} <span style={{ color: 'var(--tx3)' }}>vs</span> {t2.name}</span>
                          </div>
                        </td>
                          <td><span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><SportIcon sport={m.sport} style={{fontSize: 14}} /> {m.sport?.replace('_',' ')}</span></td>
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
                {players?.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.department}</td>
                      <td><div style={{ display: 'flex', gap: 3 }}>{p.sports?.map(s => <SportIcon key={s} sport={s} style={{ fontSize: 14 }} />)}</div></td>
                    <td><span className={`bdg ${p.skillLevel === 'Advanced' ? 'b-g' : p.skillLevel === 'Intermediate' ? 'b-b' : 'b-gr'}`}>{p.skillLevel || '—'}</span></td>
                    <td className="c"><span className={`bdg ${p.status === 'sold' ? 'b-g' : 'b-b'}`}>{p.status}</span></td>
                    <td className="c" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>{p.basePrice}</td>
                    <td className="c" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, color: 'var(--red)' }}>{p.bidPrice || '—'}</td>
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
                {teams?.map(t => {
                  const pct = Math.round((t.spent / t.budget) * 100);
                  return (
                    <tr key={t._id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TeamLogo color={t.color} abbr={t.abbreviation} size={26} />{t.name}</div></td>
                      <td style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.department}</td>
                      <td className="c" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600 }}>{t.budget}</td>
                      <td className="c" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, color: 'var(--red)' }}>{t.spent}</td>
                      <td className="c" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, color: 'var(--grn)' }}>{t.budget - t.spent}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
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


