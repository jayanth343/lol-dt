import React,{useState,useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {TL,FormDots,MatchRow,Ldr,SportFilt,SportIcon} from '../components/Shared';
import {apiMatches,apiStandings,apiTeams,apiPlayers,getSocket} from '../lib/api';

export default function Home(){
  const nav=useNavigate();
  const [matches,setMatches]=useState([]);
  const [standings,setStandings]=useState([]);
  const [teams,setTeams]=useState([]);
  const [players,setPlayers]=useState([]);
  const [sport,setSport]=useState('all');
  const [loading,setLoading]=useState(true);
  const [cd,setCd]=useState({d:'00',h:'00',m:'00',s:'00'});

  useEffect(()=>{
    const tick=()=>{const d=new Date('2026-03-30T10:00:00')-new Date();if(d>0)setCd({d:String(Math.floor(d/86400000)).padStart(2,'0'),h:String(Math.floor((d%86400000)/3600000)).padStart(2,'0'),m:String(Math.floor((d%3600000)/60000)).padStart(2,'0'),s:String(Math.floor((d%60000)/1000)).padStart(2,'0')});};
    tick();const t=setInterval(tick,1000);return()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    Promise.all([apiMatches(),apiStandings('cricket'),apiTeams(),apiPlayers()])
      .then(([m,s,tm,pl])=>{
        setMatches(Array.isArray(m)?m:[]);
        setStandings(Array.isArray(s)?s:[]);
        setTeams(Array.isArray(tm)?tm:[]);
        setPlayers(Array.isArray(pl)?pl:[]);
      }).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    const s=getSocket();const h=({matchId,team1Score,team2Score,status})=>setMatches(p=>p.map(m=>m._id===matchId?{...m,team1Score,team2Score,status}:m));
    s.on('match:score',h);return()=>s.off('match:score',h);
  },[]);

  // Real-time DB: standings, teams, players, new matches
  useEffect(()=>{
    const s=getSocket();
    // Standings changed → re-fetch
    const onStandings=()=>apiStandings('cricket').then(d=>setStandings(Array.isArray(d)?d:[]));
    // Team budget updated (auction sold)
    const onTeam=({team})=>setTeams(p=>p.map(t=>t._id===team._id?{...t,...team}:t));
    // Player status/team changed
    const onPlayer=({player})=>setPlayers(p=>p.map(x=>x._id===player._id?{...x,...player}:x));
    const onPlayerNew=({player})=>setPlayers(p=>[...p,player]);
    // New match added by admin
    const onMatchNew=({match})=>setMatches(p=>[...p,match]);
    s.on('standings:update',onStandings);
    s.on('db:team:updated',onTeam);
    s.on('db:player:updated',onPlayer);
    s.on('db:player:new',onPlayerNew);
    s.on('db:match:new',onMatchNew);
    return()=>{
      s.off('standings:update',onStandings);
      s.off('db:team:updated',onTeam);
      s.off('db:player:updated',onPlayer);
      s.off('db:player:new',onPlayerNew);
      s.off('db:match:new',onMatchNew);
    };
  },[]);

  const all=sport==='all'?matches:matches.filter(m=>m.sport===sport);
  const live=all.filter(m=>m.status==='live');
  const upcoming=all.filter(m=>m.status==='upcoming').slice(0,4);
  const recent=all.filter(m=>m.status==='completed').slice(0,2);
  const top5=standings.slice(0,5);

  // Live derived stats
  const soldPlayers=players.filter(p=>p.status==='sold').length;
  const availPlayers=players.filter(p=>p.status==='available').length;
  const completedMatches=matches.filter(m=>m.status==='completed').length;
  const liveCount=matches.filter(m=>m.status==='live').length;

  // Top performers: sold players sorted by bidPrice desc
  const topPerformers=players
    .filter(p=>p.status==='sold'&&p.teamId)
    .sort((a,b)=>(b.bidPrice||0)-(a.bidPrice||0))
    .slice(0,4)
    .map(p=>{
      const team=teams.find(t=>String(t._id)===String(p.teamId?._id||p.teamId));
      return{...p,team};
    });

  if(loading) return <div className="pg"><Ldr/></div>;

  return (
    <div className="pg fade-up">
      <div className="two-col">
        <div className="col">
          {/* ── HERO ── */}
          <div className="hero">
            <div className="sc-stripe"/>
            <div className="hero-body">
              <div className="hero-label">
                {live.length>0&&<span className="live-dot">{live.length} LIVE</span>}
                CTO DT · Season 2 · 2026
              </div>
              <div className="hero-title">
                <em>League</em> of<br/><span>Legends</span> Sports
              </div>
              <div className="hero-sub">Internal sports platform for all CTO DT employees · Real-time live scoring & auctions</div>
              <div className="hero-rule"/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:20,flexWrap:'wrap'}}>
                <div className="hero-stats stagger">
                  {[['8','Teams','var(--gold)'],['42','Players','var(--blue)'],['5','Sports','var(--grn)']].map(([n,l,c])=>(
                    <div key={l} className="hstat">
                      <div className="hs-n" style={{color:c}}>{n}</div>
                      <div className="hs-l">{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:9,fontWeight:700}}>Final evaluation</div>
                  <div className="cd">
                    {[['d','Days'],['h','Hrs'],['m','Min'],['s','Sec']].map(([k,l])=>(
                      <div className="cd-u" key={k}><span className="cd-n">{cd[k]}</span><div className="cd-l">{l}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── MATCHES ── */}
          <div className="card">
            <div className="ch"><span className="ct">Matches</span><button className="clink" onClick={()=>nav('/matches')}>View all →</button></div>
            <SportFilt val={sport} onChange={setSport}/>
            {live.length>0&&<><div className="sdl">🔴 Live now</div>{live.map(m=><MatchRow key={m._id} match={m} onClick={()=>nav(`/matches/${m._id}`)}/>)}</>}
            {upcoming.length>0&&<><div className="sdl">⏱ Upcoming</div>{upcoming.map(m=><MatchRow key={m._id} match={m} onClick={()=>nav(`/matches/${m._id}`)}/>)}</>}
            {recent.length>0&&<><div className="sdl">📋 Results</div>{recent.map(m=><MatchRow key={m._id} match={m} onClick={()=>nav(`/matches/${m._id}`)}/>)}</>}
            {all.length===0&&<div className="empty"><div className="ei">📅</div><div className="eh">No matches</div></div>}
          </div>

          {/* ── POINTS TABLE ── */}
          <div className="card">
            <div className="ch"><span className="ct">🏏 Cricket — Points table</span><button className="clink" onClick={()=>nav('/standings')}>Full table →</button></div>
            <div style={{overflowX:'auto'}}>
              <table className="pts-tbl">
                <thead><tr>
                  <th style={{width:40}}>#</th><th>Team</th>
                  <th className="c">M</th><th className="c">W</th><th className="c">L</th>
                  <th className="c">Pts</th><th className="c">NRR</th><th className="c">Form</th>
                </tr></thead>
                <tbody>
                  {top5.map((r,i)=>{
                    const t=r.teamId||{};
                    const nrr=typeof r.nrr==='number'?r.nrr:parseFloat(r.nrr)||0;
                    return (
                      <tr key={r._id} className={i<2?'ql':''}>
                        <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:i===0?'var(--gold)':i===1?'#888':i===2?'#c87533':'var(--tx4)'}}>{i===0?'①':i===1?'②':i===2?'③':i+1}</span></td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            {i<2&&<div className="qual-bar"/>}
                            <TL color={t.color} abbr={t.abbreviation} size={28}/>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                              {i<2&&<div style={{fontSize:10,color:'var(--grn)',fontWeight:700,marginTop:1}}>Qualifying</div>}
                            </div>
                          </div>
                        </td>
                        <td className="c" style={{color:'var(--tx3)'}}>{r.played}</td>
                        <td className="c"><span style={{color:'var(--grn)',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{r.won}</span></td>
                        <td className="c"><span style={{color:'var(--red)',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{r.lost}</span></td>
                        <td className="c"><span className="pts-badge">{r.points}</span></td>
                        <td className="c"><span style={{color:nrr>=0?'var(--grn)':'var(--red)',fontSize:12,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{nrr>=0?'+':''}{nrr.toFixed(2)}</span></td>
                        <td className="c"><FormDots form={r.form}/></td>
                      </tr>
                    );
                  })}
                  {top5.length===0&&<tr><td colSpan={8}><div className="empty" style={{padding:24}}><div className="eh">No standings yet</div></div></td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{padding:'9px 20px',fontSize:10,color:'var(--tx4)',borderTop:'1px solid var(--line)',display:'flex',alignItems:'center',gap:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'1px'}}>
              <div style={{width:8,height:8,borderRadius:1,background:'var(--grn)',flexShrink:0}}/> Top 2 qualify per sport
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="col stagger">
          <div className="card">
            <div className="ch"><span className="ct">Season stats</span></div>
            <div className="srow" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
              {[['Matches',completedMatches||matches.length,'var(--red)'],['Players',players.length,'var(--blue)'],['Sports',5,'var(--grn)'],['Teams',teams.length,'var(--gold)']].map(([l,v,c])=>(
                <div key={l} className="sbox"><div className="sn" style={{color:c}}>{v}</div><div className="sl">{l}</div></div>
              ))}
            </div>
            {liveCount>0&&<div style={{padding:'8px 16px',borderTop:'1px solid var(--line)',display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <span className="live-dot">{liveCount} LIVE</span>
              <span style={{color:'var(--tx3)'}}>matches in progress right now</span>
            </div>}
          </div>

          <div className="card">
            <div className="ch"><span className="ct">Top performers</span><button className="clink" onClick={()=>nav('/fantasy')}>Fantasy →</button></div>
            {topPerformers.length===0&&<div className="empty" style={{padding:28}}><div className="eh">Auction in progress</div><div style={{fontSize:11,color:'var(--tx4)',marginTop:4}}>{availPlayers} players available · {soldPlayers} sold</div></div>}
            {topPerformers.map((p,i)=>(
              <div key={p._id} className="prow">
                <div style={{width:22,height:22,borderRadius:'50%',background:'var(--card3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--tx3)',flexShrink:0,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}</div>
                <TL color={p.team?.color||'#555'} abbr={p.team?.abbreviation||p.name.substring(0,2)} size={34}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:1, display: 'flex', alignItems: 'center', gap: 2}}>{(p.sports||[]).map(s=><SportIcon key={s} sport={s} style={{fontSize: 12}} />)} {p.team?.name||''}</div>
                </div>
                <div className="pstat" style={{color:'var(--gold)',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{p.bidPrice||p.basePrice} pts</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="ch"><span className="ct">Updates</span><span className="badge b-o">3 new</span></div>
            {[
              {ic:'⚡',t:'Season 2 open to all employees',s:'All CTO DT departments',u:true},
              {ic:'🔴',t:'Gold Eagles vs Iron Wolves — live',s:'Ground A · 11:00 AM',u:true},
              {ic:'🔨',t:'Auction: 6 players remaining',s:'Bidding open now',u:true},
              {ic:'📅',t:'Week 2 schedule published',s:'Mar 23–27',u:false},
            ].map((n,i)=>(
              <div key={i} className={`notif${n.u?' unread':''}`}>
                <span style={{fontSize:18,flexShrink:0,lineHeight:1}}>{n.ic}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:n.u?600:400}}>{n.t}</div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{n.s}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="ch"><span className="ct">Quick actions</span></div>
            <div style={{padding:14,display:'flex',flexDirection:'column',gap:9}}>
              <button className="btn btn-p btn-full" style={{justifyContent:'space-between'}} onClick={()=>nav('/register')}><span>📝 Register as player</span><span>→</span></button>
              <button className="btn btn-g btn-full" style={{justifyContent:'space-between'}} onClick={()=>nav('/auction')}><span>🔨 Live auction</span><span>→</span></button>
              <button className="btn btn-s btn-full" style={{justifyContent:'space-between'}} onClick={()=>nav('/fantasy')}><span>⭐ Fantasy leaderboard</span><span>→</span></button>
              <button className="btn btn-s btn-full" style={{justifyContent:'space-between'}} onClick={()=>nav('/standings')}><span>📊 Full standings</span><span>→</span></button>
              <button className="btn btn-s btn-full" style={{justifyContent:'space-between'}} onClick={()=>nav('/players')}><span>🏃 Browse players</span><span>→</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

