import React from 'react';
import { useNavigate } from 'react-router-dom';

function BracketMatch({ match, onClick }) {
  if (!match) return <div style={{width: 140, height: 60, background: '#222', borderRadius: 8, opacity: 0.5}} />;
  return (
    <div 
      onClick={() => onClick(match._id)}
      style={{
        width: 140, 
        background: '#1a1a1a', 
        border: '1px solid #333', 
        borderRadius: 8, 
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderBottom: '1px solid #222' }}>
        <span style={{ fontSize: 13, fontWeight: 'bold' }}>{match.team1Id?.abbreviation || 'TBD'}</span>
        <span style={{ fontSize: 13 }}>{match.team1Score || '-'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px' }}>
        <span style={{ fontSize: 13, fontWeight: 'bold' }}>{match.team2Id?.abbreviation || 'TBD'}</span>
        <span style={{ fontSize: 13 }}>{match.team2Score || '-'}</span>
      </div>
    </div>
  );
}

export default function TournamentKnockout({ matches }) {
  const nav = useNavigate();
  // Assume matches have knockoutPosition: { round: 1, matchNum: 1 }
  // This is a simplified layout. In a real app we'd compute a full binary tree.
  const rounds = {};
  (matches || []).forEach(m => {
    if(!m.knockoutPosition) return;
    const r = m.knockoutPosition.round;
    if(!rounds[r]) rounds[r] = [];
    rounds[r].push(m);
  });

  const sortedRounds = Object.keys(rounds).sort((a,b)=>a-b);
  sortedRounds.forEach((r) => {
    rounds[r] = (rounds[r] || []).sort((a, b) => (a?.knockoutPosition?.matchNum || 0) - (b?.knockoutPosition?.matchNum || 0));
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 28, padding: 24, overflowX: 'auto' }}>
      {sortedRounds.map(rIndex => (
        <div key={rIndex} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 20, minWidth: 160 }}>
          <div style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 700 }}>Round {rIndex}</div>
          {rounds[rIndex].map(m => (
            <BracketMatch key={m._id} match={m} onClick={(id) => nav(`/matches/${id}`)} />
          ))}
        </div>
      ))}
    </div>
  );
}