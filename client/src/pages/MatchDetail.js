import React,{useState,useEffect,useRef} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {TL,Ldr} from '../components/Shared';
import {apiMatch,getSocket} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import ScorerPanel from '../components/ScorerPanel';

// ── Worm Chart (run progression by over) ─────────────────────────
function WormChart({events,t1,t2,overs=20}){
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const W=canvas.width=canvas.offsetWidth||320;
    const H=canvas.height=160;
    ctx.clearRect(0,0,W,H);
    const build=(teamId)=>{
      let runs=0,balls=0,pts=[{over:0,runs:0}];
      (events||[]).filter(e=>String(e.teamId)===String(teamId)).forEach(e=>{
        const isWide=e.type==='wide'||e.type==='noball';
        if(!isWide)balls++;runs+=(e.value||0);
        if(balls>0&&balls%6===0){pts.push({over:balls/6,runs});}
      });
      if(balls%6!==0&&balls>0)pts.push({over:+(balls/6).toFixed(1),runs});
      return pts;
    };
    const d1=build(t1._id),d2=build(t2._id);
    const allPts=[...d1,...d2];
    const maxOver=Math.max(overs,...allPts.map(p=>p.over),1);
    const maxRuns=Math.max(50,...allPts.map(p=>p.runs));
    const pad={l:36,r:16,t:12,b:28};
    const sx=o=>pad.l+(o/maxOver)*(W-pad.l-pad.r);
    const sy=r=>H-pad.b-((r/maxRuns)*(H-pad.t-pad.b));
    ctx.strokeStyle='rgba(128,128,128,0.12)';ctx.lineWidth=.5;
    for(let i=0;i<=4;i++){const y=pad.t+i*(H-pad.t-pad.b)/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();}
    ctx.fillStyle='rgba(128,128,128,0.55)';ctx.font='10px monospace';ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=Math.round(maxRuns*(1-i/4));ctx.fillText(v,pad.l-4,pad.t+i*(H-pad.t-pad.b)/4+3);}
    ctx.textAlign='center';ctx.font='10px monospace';
    [0,5,10,15,20].filter(v=>v<=maxOver).forEach(v=>ctx.fillText(v,sx(v),H-8));
    const drawLine=(pts,color)=>{
      if(pts.length<2)return;
      ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';
      ctx.beginPath();pts.forEach((p,i)=>i===0?ctx.moveTo(sx(p.over),sy(p.runs)):ctx.lineTo(sx(p.over),sy(p.runs)));
      ctx.stroke();
      ctx.fillStyle=color;
      pts.forEach(p=>{ctx.beginPath();ctx.arc(sx(p.over),sy(p.runs),3,0,Math.PI*2);ctx.fill();});
    };
    drawLine(d1,t1.color||'#e74c3c');
    drawLine(d2,t2.color||'#3498db');
  },[events,t1,t2,overs]);
  if(!events?.length) return null;
  return(
    <div style={{padding:'14px 14px 0'}}>
      <div style={{display:'flex',gap:16,marginBottom:8,fontSize:11,color:'var(--tx3)'}}>
        <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:3,background:t1.color||'#e74c3c',display:'inline-block',borderRadius:2}}/>{t1.name}</span>
        <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:14,height:3,background:t2.color||'#3498db',display:'inline-block',borderRadius:2}}/>{t2.name}</span>
      </div>
      <canvas ref={canvasRef} style={{width:'100%',height:160,display:'block'}}/>
      <div style={{fontSize:10,color:'var(--tx4)',textAlign:'center',marginTop:4,marginBottom:8}}>Run progression by over</div>
    </div>
  );
}

// ── Over summary ──────────────────────────────────────────────────
function OverSummary({events,teamId}){
  const overs=[];let balls=[],overNum=1,ballCount=0;
  (events||[]).filter(e=>String(e.teamId)===String(teamId)).forEach(e=>{
    const isWide=e.type==='wide'||e.type==='noball';
    balls.push(e);
    if(!isWide){ballCount++;if(ballCount===6){overs.push({num:overNum,balls:[...balls]});balls=[];overNum++;ballCount=0;}}
  });
  if(balls.length>0)overs.push({num:overNum,balls:[...balls],partial:true});
  if(!overs.length)return null;
  const totalRuns=ov=>ov.balls.reduce((s,b)=>s+(b.value||0)+(b.type==='wide'||b.type==='noball'?1:0),0);
  return(
    <div style={{padding:'0 14px 14px',overflowX:'auto'}}>
      <table style={{width:'100%',fontSize:11,borderCollapse:'collapse',minWidth:300}}>
        <thead><tr style={{color:'var(--tx4)',fontSize:10,textTransform:'uppercase',letterSpacing:'.8px'}}>
          <th style={{textAlign:'left',padding:'4px 8px 4px 0',fontWeight:600}}>Over</th>
          <th style={{textAlign:'left',padding:'4px 0',fontWeight:600}}>Balls</th>
          <th style={{textAlign:'right',padding:'4px 0',fontWeight:600}}>Runs</th>
        </tr></thead>
        <tbody>
          {overs.slice(-6).map((ov,i)=>(
            <tr key={i} style={{borderTop:'1px solid var(--line)'}}>
              <td style={{padding:'5px 8px 5px 0',color:'var(--tx3)',fontFamily:"'JetBrains Mono',monospace"}}>{ov.num}{ov.partial?'*':''}</td>
              <td style={{padding:'5px 0'}}><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                {ov.balls.map((b,j)=>{
                  const isW=b.type==='wicket';const is4=b.value===4;const is6=b.value===6;const isWd=b.type==='wide'||b.type==='noball';
                  return <span key={j} style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,
                    background:isW?'#e74c3c':is6?'var(--gold)':is4?'#2ecc71':isWd?'#8e44ad':'var(--card3)',
                    color:(isW||is6||is4||isWd)?'#fff':'var(--tx2)',border:'1px solid var(--line)'}}>
                    {isW?'W':isWd?'•':b.value}
                  </span>;
                })}
              </div></td>
              <td style={{textAlign:'right',padding:'5px 0',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'var(--tx)'}}>{totalRuns(ov)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ── WhatsApp / Social Share Card ─────────────────────────────────
function ShareCard({match,t1,t2}){
  const [copied,setCopied]=useState(false);
  const SI2={cricket:'🏏',football:'⚽',badminton:'🏸',table_tennis:'🏓',carrom:'🎯'};
  const sport=SI2[match.sport]||'🏆';
  const winner=match.winnerId;
  const date=new Date(match.matchDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  const text=
`${sport} *CTO DT League of Legends – Season 2*
📅 ${date} · ${match.venue||'TBD'}

🔴 *${t1.name||'Team 1'}* ${match.team1Score||'—'}
🔵 *${t2.name||'Team 2'}* ${match.team2Score||'—'}

${winner?`🏆 *${winner.name||''}* wins!`:'Match completed'}

#LeagueOfLegends #CTODT`;

  const share=()=>{
    if(navigator.share){navigator.share({text,title:'Match Result'}).catch(()=>{});}
    else{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}
  };
  return(
    <div className="card" style={{marginBottom:16}}>
      <div className="ch"><span className="ct">📤 Share result</span></div>
      <div style={{padding:'12px 16px 4px'}}>
        <div style={{background:'#075e54',borderRadius:10,padding:'14px 16px',fontFamily:'monospace',fontSize:12,whiteSpace:'pre-wrap',color:'#e9fbe9',lineHeight:1.6,marginBottom:12}}>{text}</div>
        <button onClick={share} style={{width:'100%',padding:'11px 0',background:'#25D366',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer',letterSpacing:'.3px'}}>
          {copied?'✅ Copied!':'📲 Share via WhatsApp / Copy'}
        </button>
      </div>
    </div>
  );
}

// ── Auto Commentary Generator ─────────────────────────────────────
const COMMENTARY_TEMPLATES={
  six:['What a shot! {name} launches it over the boundary for a massive SIX!','HUGE! {name} clears the rope! Six all the way!','That\'s in the stands! {name} goes big — SIX!'],
  four:['Cracking shot from {name}! Races away to the boundary for FOUR!','{name} finds the gap and it rolls to the fence — FOUR!','Timed to perfection! Four runs for {name}.'],
  wicket:['OUT! The fielding side goes wild! Big wicket falls!','WICKET! The batsman has to walk back. Huge moment!','Dismissed! The bowler can\'t hide their joy.'],
  wide:['Down the leg side — wide called. Extra run added.','Strays too far — umpire signals wide ball.'],
  0:['Tight delivery. Defended solidly. Dot ball.','Beats the bat! No run. Pressure building.','Good ball. Kept quiet. Dot ball.'],
  default:['Pushed away for {runs} run(s).','Clipped off the pads — {runs} run(s).','Worked through the leg side — {runs}.'],
};
function getCommentary(ev){
  const picks=arr=>arr[Math.floor(Math.random()*arr.length)];
  const name=ev.playerName||'the batsman';
  if(ev.type==='wicket')return picks(COMMENTARY_TEMPLATES.wicket);
  if(ev.type==='wide'||ev.type==='noball')return picks(COMMENTARY_TEMPLATES.wide);
  if(ev.value===6)return picks(COMMENTARY_TEMPLATES.six).replace('{name}',name);
  if(ev.value===4)return picks(COMMENTARY_TEMPLATES.four).replace('{name}',name);
  if(ev.value===0)return picks(COMMENTARY_TEMPLATES[0]);
  return picks(COMMENTARY_TEMPLATES.default).replace('{runs}',ev.value);
}
function AutoCommentary({events,t1,t2}){
  const items=events.slice(0,8);
  if(!items.length)return null;
  return(
    <div className="card" style={{marginBottom:16}}>
      <div className="ch"><span className="ct">🎙️ Auto commentary</span><span style={{fontSize:10,color:'var(--tx4)',background:'var(--card2)',padding:'2px 8px',borderRadius:4,border:'1px solid var(--line)'}}>AI-generated</span></div>
      <div style={{maxHeight:260,overflowY:'auto'}}>
        {items.map((ev,i)=>{
          const isW=ev.type==='wicket';const is6=ev.value===6;const is4=ev.value===4;
          return(
            <div key={ev._id||i} style={{padding:'10px 16px',borderBottom:'1px solid var(--line)',display:'flex',gap:12,alignItems:'flex-start',
              background:i===0?'var(--card2)':undefined}}>
              <div style={{width:28,height:28,borderRadius:6,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,
                background:isW?'rgba(231,76,60,.15)':is6?'rgba(243,156,18,.15)':is4?'rgba(46,204,113,.15)':'var(--card3)',
                color:isW?'#e74c3c':is6?'#f39c12':is4?'#2ecc71':'var(--tx3)'}}>
                {isW?'W':is6?'6':is4?'4':ev.value||'•'}
              </div>
              <div>
                <div style={{fontSize:12.5,color:isW?'#e74c3c':is6?'var(--gold)':is4?'#2ecc71':'var(--tx2)',lineHeight:1.5,fontWeight:isW||is6?600:400}}>
                  {getCommentary(ev)}
                </div>
                {ev.playerName&&<div style={{fontSize:10,color:'var(--tx4)',marginTop:3}}>{ev.playerName}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Ball({v,ex}){
  if(ex==='wicket') return <div className="ball bW">W</div>;
  if(ex==='wide')   return <div className="ball bWd">Wd</div>;
  if(ex==='noball') return <div className="ball bWd">Nb</div>;
  if(v===4) return <div className="ball b4">4</div>;
  if(v===6) return <div className="ball b6">6</div>;
  if(v===0) return <div className="ball b0">0</div>;
  return <div className="ball bn">{v}</div>;
}
export default function MatchDetail(){
  const {id}=useParams();const nav=useNavigate();const {isOwner}=useAuth();
  const [match,setMatch]=useState(null);const [events,setEvents]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{apiMatch(id).then(m=>{setMatch(m);setEvents((m.scoreEvents||[]).slice().reverse());setLoading(false);});},[id]);
  useEffect(()=>{
    const socket=getSocket();socket.emit('match:join',id);
    socket.on('cricket:update',({matchId,cricketLive,team1Score,team2Score,event})=>{if(matchId!==id)return;setMatch(p=>p?{...p,cricketLive,team1Score:team1Score||p.team1Score,team2Score:team2Score||p.team2Score}:p);if(event)setEvents(p=>[event,...p]);});
    socket.on('football:update',({matchId,footballLive,team1Score,team2Score,event})=>{if(matchId!==id)return;setMatch(p=>p?{...p,footballLive,team1Score,team2Score}:p);if(event)setEvents(p=>[event,...p]);});
    socket.on('points:update',({matchId,pointsLive,team1Score,team2Score})=>{if(matchId!==id)return;setMatch(p=>p?{...p,pointsLive,team1Score,team2Score}:p);});
    socket.on('match:statusChange',({matchId,status})=>{if(matchId!==id)return;setMatch(p=>p?{...p,status}:p);});
    return()=>{socket.emit('match:leave',id);['cricket:update','football:update','points:update','match:statusChange'].forEach(e=>socket.off(e));};
  },[id]);
  if(loading) return <div className="pg"><Ldr/></div>;
  if(!match)  return <div className="pg"><div className="al al-er">Match not found.</div></div>;
  const t1=match.team1Id||{};const t2=match.team2Id||{};
  const cl=match.cricketLive||{};const fl=match.footballLive||{};const pl=match.pointsLive||{};
  const live=match.status==='live';const done=match.status==='completed';
  return (
    <div className="pg fade-up">
      <button className="btn btn-s btn-sm" style={{marginBottom:16}} onClick={()=>nav('/matches')}>← Back</button>
      <div className="two-col">
        <div className="col">
          {/* SCORECARD */}
          <div className="sc">
            <div className="sc-stripe"/>
            <div className="sc-head">
              <span style={{fontSize:12,color:'var(--tx3)',fontWeight:600}}>{SI[match.sport]} {match.sport?.replace('_',' ')} · {match.round} · {match.venue}</span>
              <div style={{display:'flex',gap:8}}>
                {live&&<span className="live-dot">LIVE</span>}
                {done&&<span style={{background:'var(--grn)',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:3}}>FINAL</span>}
              </div>
            </div>
            <div className="sc-body">
              {/* CRICKET */}
              {match.sport==='cricket'&&(
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:20,alignItems:'center'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <TL color={t1.color} abbr={t1.abbreviation} size={40}/>
                        <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,letterSpacing:'-.3px'}}>{t1.name}</span>
                      </div>
                      <div className="sc-runs">{cl.innings===2?match.team2Score:match.team1Score||'—'}</div>
                      {live&&<><div className="sc-overs">Overs: {cl.overs}</div><div style={{marginTop:5}}>CRR: <span className="sc-crr">{cl.crr}</span></div></>}
                      {live&&cl.innings===2&&<div className="sc-tgt">Target: {cl.target} · Need: {Math.max(0,cl.target-cl.runs)} · RRR: <strong style={{color:'var(--gold)'}}>{cl.rrr}</strong></div>}
                    </div>
                    <div style={{textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:700,color:'var(--tx4)'}}>VS</div>
                    <div style={{textAlign:'right'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'flex-end',marginBottom:8}}>
                        <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,letterSpacing:'-.3px'}}>{t2.name}</span>
                        <TL color={t2.color} abbr={t2.abbreviation} size={40}/>
                      </div>
                      <div className="sc-runs">{cl.innings===2?`${cl.runs}/${cl.wickets}`:match.team2Score||'TBB'}</div>
                      {done&&match.winnerId&&<div style={{fontSize:13,color:'var(--gold)',marginTop:4,fontWeight:700}}>{match.winnerId.name} wins 🏆</div>}
                    </div>
                  </div>
                  {live&&cl.currentOver?.length>0&&<>
                    <div className="sc-div"/>
                    <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:9,fontWeight:700}}>This Over</div>
                    <div className="co">{cl.currentOver.map((v,i)=><Ball key={i} v={v===-1?0:v} ex={v===-1?'wicket':v===-2?'wide':''}/>)}</div>
                  </>}
                  {live&&cl.batsmen?.length>0&&<>
                    <div className="sc-div"/>
                    <table style={{width:'100%',fontSize:12,color:'var(--tx2)',borderCollapse:'collapse'}}>
                      <thead><tr style={{color:'var(--tx4)',fontSize:10,textTransform:'uppercase',letterSpacing:'.8px'}}>
                        <th style={{textAlign:'left',paddingBottom:6,fontWeight:700}}>Batter</th><th style={{textAlign:'center',fontWeight:700}}>R</th><th style={{textAlign:'center',fontWeight:700}}>B</th><th style={{textAlign:'center',fontWeight:700}}>4s</th><th style={{textAlign:'center',fontWeight:700}}>6s</th><th style={{textAlign:'center',fontWeight:700}}>SR</th>
                      </tr></thead>
                      <tbody>
                        {cl.batsmen.map((b,i)=>(
                          <tr key={i}>
                            <td style={{paddingRight:12,fontWeight:b.onStrike?700:400}}>{b.name}{b.onStrike?' *':''}</td>
                            <td style={{textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:16,color:'var(--tx)'}}>{b.runs}</td>
                            <td style={{textAlign:'center'}}>{b.balls}</td>
                            <td style={{textAlign:'center',color:'var(--grn)'}}>{b.fours}</td>
                            <td style={{textAlign:'center',color:'var(--red)'}}>{b.sixes}</td>
                            <td style={{textAlign:'center',color:'var(--gold)',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{b.balls>0?((b.runs/b.balls)*100).toFixed(1):'0.0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {cl.bowler&&<div style={{marginTop:8,fontSize:12,color:'var(--tx3)'}}>Bowling: <strong style={{color:'var(--tx)'}}>{cl.bowler.name}</strong> — {cl.bowler.overs} ov, {cl.bowler.runs} runs, {cl.bowler.wickets} wkts</div>}
                  </>}
                </>
              )}
              {/* FOOTBALL */}
              {match.sport==='football'&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:20,alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}><TL color={t1.color} abbr={t1.abbreviation} size={48}/>
                    <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800}}>{t1.name}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:56,fontWeight:700,color:'var(--tx)',lineHeight:1}}>{fl.team1Goals??match.team1Score??'0'}</div></div>
                  </div>
                  <div style={{textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700,color:live?'var(--red)':'var(--tx3)'}}>{live?`${fl.minute||0}'`:done?'FT':'KO'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:12,flexDirection:'row-reverse'}}><TL color={t2.color} abbr={t2.abbreviation} size={48}/>
                    <div style={{textAlign:'right'}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800}}>{t2.name}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:56,fontWeight:700,color:'var(--tx)',lineHeight:1}}>{fl.team2Goals??match.team2Score??'0'}</div></div>
                  </div>
                </div>
              )}
              {/* POINTS SPORTS */}
              {['badminton','table_tennis','carrom'].includes(match.sport)&&(
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:20,alignItems:'center',marginBottom:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}><TL color={t1.color} abbr={t1.abbreviation} size={44}/>
                      <div><div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800}}>{t1.name}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:52,fontWeight:700,color:'var(--tx)',lineHeight:1}}>{pl.team1Sets??0}</div>
                      <div style={{fontSize:11,color:'var(--tx3)'}}>sets</div></div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      {live&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:700,color:'var(--gold)'}}>{pl.team1Points??0}–{pl.team2Points??0}</div>}
                      <div style={{fontSize:11,color:'var(--tx3)'}}>Set {pl.currentSet??1}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12,flexDirection:'row-reverse'}}><TL color={t2.color} abbr={t2.abbreviation} size={44}/>
                      <div style={{textAlign:'right'}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800}}>{t2.name}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:52,fontWeight:700,color:'var(--tx)',lineHeight:1}}>{pl.team2Sets??0}</div>
                      <div style={{fontSize:11,color:'var(--tx3)'}}>sets</div></div>
                    </div>
                  </div>
                  {pl.sets?.length>0&&<div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                    {pl.sets.map((s,i)=><div key={i} style={{background:'var(--card3)',padding:'4px 14px',borderRadius:4,fontSize:14,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:'var(--tx2)',border:'1px solid var(--line)'}}>Set {i+1}: {s.t1}–{s.t2}</div>)}
                  </div>}
                </>
              )}
            </div>
          </div>

          {/* CRICKET EXTRAS: Worm + Over breakdown */}
          {match.sport==='cricket'&&events.length>0&&<>
            <div className="card">
              <div className="ch"><span className="ct">📈 Run Worm</span></div>
              <WormChart events={[...events].reverse()} t1={t1} t2={t2} overs={match.overs||20}/>
            </div>
            <div className="card">
              <div className="ch"><span className="ct">Over-by-over</span><span style={{fontSize:11,color:'var(--tx3)'}}>Last 6 overs</span></div>
              <OverSummary events={[...events].reverse()} teamId={cl.innings===2?t2._id:t1._id}/>
            </div>
          </>}

          {/* COMMENTARY */}
          <div className="card">
            <div className="ch"><span className="ct">Commentary & events</span></div>
            <div style={{maxHeight:360,overflowY:'auto'}}>
              {events.length===0&&<div className="empty" style={{padding:32}}><div className="eh">No events yet</div></div>}
              {events.map((ev,i)=>(
                <div key={ev._id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',borderBottom:'1px solid var(--line)',animation:i===0?'fadeIn .3s ease':undefined}}>
                  <Ball v={ev.value} ex={ev.type==='wicket'?'wicket':ev.type==='wide'?'wide':ev.extra}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:ev.type==='wicket'?700:400,color:ev.type==='wicket'?'var(--red)':ev.value===6?'var(--gold)':ev.value===4?'var(--grn)':'var(--tx)'}}>{ev.description}</div>
                    {ev.playerName&&<div style={{fontSize:11,color:'var(--tx4)',marginTop:1}}>{ev.playerName}</div>}
                  </div>
                  <div style={{fontSize:11,color:'var(--tx4)',fontFamily:"'JetBrains Mono',monospace"}}>{ev.extra||(ev.value>0?`+${ev.value}`:'•')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col">
          {isOwner&&live&&<ScorerPanel match={match}/>}

          {/* ── WhatsApp Share Card ── */}
          {done&&<ShareCard match={match} t1={t1} t2={t2}/>}

          {/* ── Auto Commentary (cricket only) ── */}
          {match.sport==='cricket'&&events.length>0&&<AutoCommentary events={events} t1={t1} t2={t2}/>}

          <div className="card">
            <div className="ch"><span className="ct">Match info</span></div>
            {[['📅 Date',new Date(match.matchDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})],['⏰ Time',match.matchTime],['📍 Venue',match.venue],['🏆 Round',match.round],[`${SI[match.sport]} Sport`,match.sport?.replace('_',' ')],['Status',match.status]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 18px',borderBottom:'1px solid var(--line)',fontSize:13}}>
                <span style={{color:'var(--tx3)'}}>{l}</span><span style={{fontWeight:600,textTransform:'capitalize'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
