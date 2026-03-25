import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import { apiTournaments } from '../lib/api';
import { Ldr, SportIcon, TL } from '../components/Shared';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    apiTournaments().then(data => {
      setTournaments(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="pg"><Ldr/></div>;

  return (
    <div className="pg fade-up">
      <div className="al-head">
        <h2 style={{fontSize:24}}>🏆 Tournaments</h2>
      </div>

      <div style={{display:'grid',gap:15,marginTop:20}}>
        {tournaments.length === 0 ? <div className="al al-in">No tournaments found.</div> : null}
        {tournaments?.map(t => (
          <div key={t._id} className="card hover-grow" style={{padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14}}>
              <div style={{flex:1}}>
                <h3 style={{margin:0, display:'flex', alignItems:'center', gap:8}}>
                  <SportIcon sport={t.sport?.name || t.sport} style={{fontSize:18}} />
                  {t.name}
                </h3>
                <div style={{fontSize:12,color:'var(--tx3)',marginTop:5}}>
                  {t.format?.toUpperCase()} · {t.status?.toUpperCase()} · Teams: {(t.teams || []).length}/{t.minTeams || 2}-{t.maxTeams || '-'}
                </div>
                <div style={{fontSize:12,color:'var(--tx3)',marginTop:4}}>
                  Schedule: every {t.scheduleIntervalDays || 1} day(s) · {t.defaultMatchTime || '10:00'}
                </div>
                <div style={{fontSize:12,color:'var(--tx3)',marginTop:4}}>
                  Sport: <strong style={{color:'var(--tx2)'}}>{t.sport?.name || 'Unknown'}</strong>
                </div>
                {!!t.description && <div style={{fontSize:12,color:'var(--tx2)',marginTop:8}}>{t.description}</div>}
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
                  {(t.teams || []).slice(0, 6).map(team => (
                    <Chip
                      key={team._id}
                      size="small"
                      avatar={<TL color={team.color} abbr={team.abbreviation} size={16} />}
                      label={team.name}
                      sx={{
                        backgroundColor: 'rgba(52,152,219,.14)',
                        color: '#7dc3ff',
                        border: '1px solid rgba(52,152,219,.35)',
                        fontWeight: 600
                      }}
                    />
                  ))}
                  {(t.teams || []).length > 6 && (
                    <Chip
                      size="small"
                      label={`+${(t.teams || []).length - 6} more`}
                      sx={{
                        backgroundColor: 'rgba(127,140,141,.16)',
                        color: 'var(--tx3)',
                        border: '1px solid var(--line)'
                      }}
                    />
                  )}
                </div>

                {t.sport?.customSettings && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(120px,1fr))',gap:8,marginTop:12}}>
                    <div className="card" style={{padding:8,background:'var(--card2)'}}>
                      <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Points to win</div>
                      <div style={{fontWeight:700}}>{t.sport.customSettings.pointsToWin || '-'}</div>
                    </div>
                    <div className="card" style={{padding:8,background:'var(--card2)'}}>
                      <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Games per match</div>
                      <div style={{fontWeight:700}}>{t.sport.customSettings.gamesPerMatch || '-'}</div>
                    </div>
                    <div className="card" style={{padding:8,background:'var(--card2)'}}>
                      <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase'}}>Min delta</div>
                      <div style={{fontWeight:700}}>{t.sport.customSettings.minPointDelta || 0}</div>
                    </div>
                  </div>
                )}
              </div>
              <button className="btn" onClick={() => nav(`/tournaments/${t._id}`)}>View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
