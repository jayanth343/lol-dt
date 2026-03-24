import React,{useState,useEffect} from 'react';
import {TL,Ldr} from '../components/Shared';
import {apiMatches,apiFantasyMatches,apiTeams,apiPlayers} from '../lib/api';

// ── Fantasy point rules ───────────────────────────────────────────
// Cricket batting: 1pt/run, 10pt/four, 20pt/six, 50pt bonus @50 runs, 100pt bonus @100
// Cricket bowling: 25pt/wicket
// Goal (football): 40pt
// Set win (badminton/TT/carrom): 15pt
// Match win: 30pt bonus per player in winning team

function calcFantasyPoints(player,matches,teams){
  let pts=0;const breakdown=[];
  matches.forEach(m=>{
    if(m.status!=='completed')return;
    const playerTeam=String(player.teamId?._id||player.teamId);
    const t1=String(m.team1Id?._id||m.team1Id);
    const t2=String(m.team2Id?._id||m.team2Id);
    const inMatch=playerTeam===t1||playerTeam===t2;
    if(!inMatch)return;
    // Win bonus
    const winnerId=String(m.winnerId?._id||m.winnerId||'');
    if(winnerId&&playerTeam===winnerId){pts+=30;breakdown.push({label:'Win bonus',pts:30});}
    // Cricket: scan score events
    if(m.sport==='cricket'){
      (m.scoreEvents||[]).forEach(ev=>{
        if(ev.playerName&&ev.playerName.toLowerCase()!==player.name.toLowerCase())return;
        if(ev.value>=6&&ev.extra==='six'){pts+=20+10;breakdown.push({label:'Six',pts:30});}
        else if(ev.value>=4&&ev.extra==='four'){pts+=10;breakdown.push({label:'Four',pts:10});}
        else if(ev.value>0){pts+=ev.value;breakdown.push({label:`${ev.value} runs`,pts:ev.value});}
        if(ev.type==='wicket'&&ev.playerName){pts+=25;breakdown.push({label:'Wicket',pts:25});}
      });
    }
    // Football goals
    if(m.sport==='football'){
      (m.footballLive?.events||[]).forEach(ev=>{
        if(ev.type==='goal'&&ev.player&&ev.player.toLowerCase()===player.name.toLowerCase()){pts+=40;breakdown.push({label:'Goal',pts:40});}
      });
    }
  });
  return {pts,breakdown};
}

// ── Medal color ───────────────────────────────────────────────────
const medalColor=rank=>rank===1?'#f39c12':rank===2?'#95a5a6':rank===3?'#cd6133':'var(--tx4)';
const medalLabel=rank=>rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';

export default function Fantasy(){
  const [players,setPlayers]=useState([]);
  const [matches,setMatches]=useState([]);
  const [teams,setTeams]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sport,setSport]=useState('all');
  const [expanded,setExpanded]=useState(null);

  useEffect(()=>{
    Promise.all([apiPlayers(),apiFantasyMatches(),apiTeams()])
      .then(([pl,ma,tm])=>{
        setPlayers(Array.isArray(pl)?pl:[]);
        setMatches(Array.isArray(ma)?ma:[]);
        setTeams(Array.isArray(tm)?tm:[]);
      }).finally(()=>setLoading(false));
  },[]);

  if(loading)return <div className="pg"><Ldr/></div>;

  const filteredPlayers=players.filter(p=>p.teamId&&(sport==='all'||p.sports?.includes(sport)));
  const ranked=filteredPlayers.map(p=>{
    const {pts,breakdown}=calcFantasyPoints(p,matches,teams);
    const team=teams.find(t=>String(t._id)===String(p.teamId?._id||p.teamId));
    return{...p,fantasyPts:pts,breakdown,team};
  }).sort((a,b)=>b.fantasyPts-a.fantasyPts);

  const top3=ranked.slice(0,3);
  const rest=ranked.slice(3);

  return(
    <div className="pg fade-up">
      {/* Header */}
      <div className="card" style={{marginBottom:18}}>
        <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,letterSpacing:'-.3px'}}>⭐ Fantasy Leaderboard</div>
            <div style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>Points auto-calculated from live match data</div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
            {['all','cricket','football','badminton','table_tennis','carrom'].map(s=>(
              <button key={s} onClick={()=>setSport(s)}
                style={{padding:'5px 12px',borderRadius:6,border:'1px solid var(--line)',fontSize:11,fontWeight:600,cursor:'pointer',
                  background:sport===s?'var(--red)':'var(--card2)',color:sport===s?'#fff':'var(--tx3)',transition:'all var(--ease)'}}>
                {s==='all'?'All':s.replace('_',' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scoring key */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>
        {[['Run','1pt'],['Four','10pt'],['Six','30pt'],['Wicket','25pt'],['Goal','40pt'],['Set win','15pt'],['Match win','30pt']].map(([l,v])=>(
          <div key={l} style={{padding:'5px 12px',background:'var(--card)',border:'1px solid var(--line)',borderRadius:6,fontSize:11}}>
            <span style={{color:'var(--tx3)'}}>{l}:</span> <strong style={{color:'var(--gold)'}}>{v}</strong>
          </div>
        ))}
      </div>

      {/* Podium */}
      {top3.length>=2&&(
        <div style={{display:'flex',alignItems:'flex-end',gap:12,marginBottom:20,justifyContent:'center'}}>
          {[top3[1],top3[0],top3[2]].filter(Boolean).map((p,podIdx)=>{
            const rank=podIdx===0?2:podIdx===1?1:3;
            const height=[110,140,90][podIdx];
            const teamColor=p.team?.color||'#555';
            return(
              <div key={p._id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:18,color:'var(--gold)'}}>{p.fantasyPts}<span style={{fontSize:11,fontWeight:400,color:'var(--tx3)'}}> pts</span></div>
                <div style={{width:52,height:52,borderRadius:'50%',background:`radial-gradient(circle at 35% 35%, ${teamColor}cc, ${teamColor}44)`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:'#fff',
                  border:`2px solid ${teamColor}`,boxShadow:`0 0 16px ${teamColor}55`}}>
                  {p.name.split(' ').map(w=>w[0]).join('').substring(0,2)}
                </div>
                <div style={{fontSize:12,fontWeight:700,textAlign:'center',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name.split(' ')[0]}</div>
                <div style={{fontSize:10,color:'var(--tx3)',textAlign:'center'}}>{p.team?.abbreviation||''}</div>
                <div style={{width:80,height,background:`linear-gradient(180deg, ${medalColor(rank)}33, ${medalColor(rank)}11)`,
                  borderTop:`3px solid ${medalColor(rank)}`,borderRadius:'4px 4px 0 0',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:8,
                  fontSize:22}}>{medalLabel(rank)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full leaderboard */}
      <div className="card">
        <div className="ch"><span className="ct">Full rankings</span><span style={{fontSize:12,color:'var(--tx3)'}}>{ranked.length} players</span></div>
        {ranked.length===0&&<div className="empty" style={{padding:40}}><div className="eh">No data yet</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>Complete matches to see rankings</div></div>}
        {ranked.map((p,i)=>{
          const rank=i+1;const open=expanded===p._id;
          return(
            <div key={p._id}>
              <div onClick={()=>setExpanded(open?null:p._id)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:'1px solid var(--line)',cursor:'pointer',
                  background:open?'var(--card2)':undefined,transition:'background var(--ease)'}}>
                <div style={{width:28,textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:14,color:medalColor(rank)}}>
                  {rank<=3?medalLabel(rank):rank}
                </div>
                {p.team&&<TL color={p.team.color} abbr={p.team.abbreviation} size={28}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--tx3)'}}>{p.team?.name||'—'} · {(p.sports||[]).join(', ')||'—'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:18,color:rank===1?'var(--gold)':'var(--tx)'}}>{p.fantasyPts}</div>
                  <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px'}}>pts</div>
                </div>
                <div style={{fontSize:12,color:'var(--tx4)',transition:'transform .2s',transform:open?'rotate(90deg)':'none'}}>›</div>
              </div>
              {open&&p.breakdown.length>0&&(
                <div style={{padding:'10px 18px 14px 58px',background:'var(--card2)',borderBottom:'1px solid var(--line)'}}>
                  <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8,fontWeight:700}}>Breakdown</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {Object.entries(p.breakdown.reduce((acc,b)=>{acc[b.label]=(acc[b.label]||0)+b.pts;return acc},{})).map(([label,pts])=>(
                      <div key={label} style={{padding:'4px 10px',background:'var(--card)',border:'1px solid var(--line)',borderRadius:4,fontSize:11}}>
                        {label}: <strong style={{color:'var(--gold)'}}>{pts}pts</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {open&&p.breakdown.length===0&&(
                <div style={{padding:'10px 18px 14px 58px',background:'var(--card2)',borderBottom:'1px solid var(--line)',fontSize:12,color:'var(--tx4)'}}>No points earned yet</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
