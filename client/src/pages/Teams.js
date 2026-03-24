// client/src/pages/Teams.js
import React, { useState, useEffect } from 'react';
import { TL as TeamLogo, Ldr as Loader } from '../components/Shared';
import { apiTeams, apiTeam } from '../lib/api';

const SI = { cricket:'🏏', football:'⚽', badminton:'🏸', table_tennis:'🏓', carrom:'🎯' };

export default function Teams() {
  const [teams,    setTeams]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { apiTeams().then(d => { setTeams(Array.isArray(d) ? d : []); setLoading(false); }); }, []);

  const selectTeam = (t) => {
    setSelected(t._id);
    apiTeam(t._id).then(d => setDetail(d));
  };

  if (loading) return <div className="pg"><Loader /></div>;

  return (
    <div className="pg">
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '260px 1fr' : 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
        {/* Team list / cards */}
        {!selected ? teams.map(t => (
          <div key={t._id} className="card" style={{ cursor: 'pointer', transition: 'all .15s' }}
            onClick={() => selectTeam(t)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ height: 6, background: t.color }} />
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <TeamLogo color={t.color} abbr={t.abbreviation} size={48} />
                <div>
                  <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.department}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center', gap: 6 }}>
                {[['Budget', `${t.budget - t.spent}/${t.budget}`], ['Spent', t.spent]].map(([l, v]) => (
                  <div key={l} style={{ background: 'var(--surf2)', borderRadius: 6, padding: '8px 4px' }}>
                    <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color: t.color }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase' }}>{l}</div>
                  </div>
                ))}
                <div style={{ background: 'var(--surf2)', borderRadius: 6, padding: '8px 4px' }}>
                  <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 18, fontWeight: 700, color: t.color }}>
                    {Math.round((t.spent / t.budget) * 100)}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase' }}>Used</div>
                </div>
              </div>
            </div>
          </div>
        )) : (
          /* Sidebar team list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {teams.map(t => (
              <div key={t._id} className="card" style={{ cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, border: selected === t._id ? `2px solid ${t.color}` : '1px solid var(--bdr)' }}
                onClick={() => selectTeam(t)}>
                <TeamLogo color={t.color} abbr={t.abbreviation} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t.department}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team Detail */}
        {selected && detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setSelected(null); setDetail(null); }}>← All Teams</button>
            <div className="card">
              <div style={{ height: 8, background: detail.team?.color }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <TeamLogo color={detail.team?.color} abbr={detail.team?.abbreviation} size={60} />
                  <div>
                    <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 24, fontWeight: 700 }}>{detail.team?.name}</div>
                    <div style={{ color: 'var(--tx3)' }}>{detail.team?.department}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                  {[['Players', detail.players?.length || 0], ['Budget', detail.team?.budget], ['Spent', detail.team?.spent], ['Left', (detail.team?.budget || 0) - (detail.team?.spent || 0)]].map(([l, v]) => (
                    <div key={l} style={{ background: 'var(--surf2)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: detail.team?.color }}>{v}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="ch"><span className="ct">Squad ({detail.players?.length || 0})</span></div>
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {(detail.players || []).map(p => (
                  <div key={p._id} style={{ background: 'var(--surf2)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div className="pav" style={{ background: detail.team?.color, width: 38, height: 38, fontSize: 13, margin: '0 auto 6px' }}>
                      {p.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                      {p.sports.map(s => <span key={s} style={{ fontSize: 13 }}>{SI[s]}</span>)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 4 }}>{p.bidPrice}pts</div>
                  </div>
                ))}
                {(!detail.players || detail.players.length === 0) && <p style={{ color: 'var(--tx3)', gridColumn: '1/-1' }}>No players yet</p>}
              </div>
            </div>

            {detail.standings?.length > 0 && (
              <div className="card">
                <div className="ch"><span className="ct">Performance by Sport</span></div>
                <table className="tbl">
                  <thead><tr><th>Sport</th><th className="c">M</th><th className="c">W</th><th className="c">L</th><th className="c">Pts</th></tr></thead>
                  <tbody>
                    {detail.standings.map(s => (
                      <tr key={s._id}>
                        <td>{SI[s.sport]} {s.sport.replace('_', ' ')}</td>
                        <td className="c">{s.played}</td>
                        <td className="c" style={{ color: 'var(--grn)', fontWeight: 600 }}>{s.won}</td>
                        <td className="c" style={{ color: 'var(--red)', fontWeight: 600 }}>{s.lost}</td>
                        <td className="c"><span className="pts">{s.points}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
