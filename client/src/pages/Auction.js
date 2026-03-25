import React,{useState,useEffect,useRef,useCallback} from 'react';
import {TL,Ldr,SportIcon} from '../components/Shared';
import {PlayerFlipCard} from '../components/PlayerCard';
import {apiAuctionState,apiAuctionAvailable,apiAuctionStart,apiAuctionBid,apiAuctionSold,apiAuctionUnsold,apiAuctionPause,apiTeams,getSocket} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const COUNTDOWN_SECS=30;

function CountdownRing({seconds,total=COUNTDOWN_SECS}){
  const r=36,c=2*Math.PI*r;
  const pct=seconds/total;
  const danger=seconds<=10;
  const color=danger?'#e74c3c':seconds<=20?'#f39c12':'#2ecc71';
  return(
    <div style={{position:'relative',width:88,height:88,flexShrink:0}}>
      <svg width="88" height="88" style={{transform:'rotate(-90deg)'}}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={c*(1-pct)}
          style={{transition:'stroke-dashoffset 1s linear,stroke .3s',filter:danger?`drop-shadow(0 0 6px ${color})`:'none'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:22,color,lineHeight:1}}>{seconds}</span>
        <span style={{fontSize:9,color:'var(--tx4)',letterSpacing:'1px',marginTop:2}}>SEC</span>
      </div>
    </div>
  );
}


export default function Auction(){
  const {isAdmin,isOwner,teamId}=useAuth();
  const { showToast } = useToast();
  const [state,setState]=useState(null);
  const [teams,setTeams]=useState([]);
  const [avail,setAvail]=useState([]);
  const [sold,setSold]=useState([]);
  const [tab,setTab]=useState('q');
  const [loading,setLoading]=useState(true);
  const [bidding,setBidding]=useState(false);
  const [countdown,setCountdown]=useState(COUNTDOWN_SECS);
  const [bidPulse,setBidPulse]=useState(false);
  const countRef=useRef(null);
  const lastBidRef=useRef(0);

  useEffect(()=>{
    Promise.all([apiAuctionState(),apiAuctionAvailable(),apiTeams()]).then(([st,av,tm])=>{
      setState(st||{status:'waiting',currentBid:0,bids:[]});
      setAvail(Array.isArray(av)?av:[]);
      setTeams(Array.isArray(tm)?tm:[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const resetCountdown=useCallback(()=>{
    clearInterval(countRef.current);
    setCountdown(COUNTDOWN_SECS);
    countRef.current=setInterval(()=>{
      setCountdown(p=>{if(p<=1){clearInterval(countRef.current);return 0;}return p-1;});
    },1000);
  },[]);

  const stopCountdown=useCallback(()=>{clearInterval(countRef.current);setCountdown(COUNTDOWN_SECS);},[]);
  useEffect(()=>()=>clearInterval(countRef.current),[]);

  const flash=useCallback((m,severity='info')=>showToast(m,severity),[showToast]);

  useEffect(()=>{
    const socket=getSocket();
    socket.on('auction:update',data=>{
      setState(data);
      if(['sold','waiting','active'].includes(data.status))
        apiAuctionAvailable().then(av=>setAvail(Array.isArray(av)?av:[]));
      if(data.status==='active'){
        if(data.currentBid>lastBidRef.current){
          lastBidRef.current=data.currentBid;
          resetCountdown();
          setBidPulse(true);
          setTimeout(()=>setBidPulse(false),600);
        } else if(lastBidRef.current===0){
          lastBidRef.current=data.currentBid||0;
          resetCountdown();
        }
      } else {stopCountdown();lastBidRef.current=0;}
    });
    socket.on('auction:sold',({player,team,price})=>{
      setSold(p=>[{player,team,price},...p]);
      setAvail(p=>p.filter(x=>x._id!==player._id));
      flash(`${player.name} sold to ${team.name} for ${price} pts!`,'success');
    });
    // DB-level team budget sync (change stream)
    socket.on('team:budget',({teamId,spent,budget})=>{
      setTeams(p=>p.map(t=>String(t._id)===String(teamId)?{...t,spent,budget}:t));
    });
    socket.on('db:player:updated',({player})=>{
      if(player.status!=='available')
        setAvail(p=>p.filter(x=>x._id!==player._id));
    });
    return()=>{socket.off('auction:update');socket.off('auction:sold');socket.off('team:budget');socket.off('db:player:updated');};
  },[flash,resetCountdown,stopCountdown]);
  const handleSold=async()=>{const r=await apiAuctionSold();if(r?.error)flash(r.error,'error');};
  const handleUnsold=async()=>{await apiAuctionUnsold();flash('Player marked unsold.','success');};
  const handlePause=async()=>await apiAuctionPause();
  const handleStart=async pid=>{
    lastBidRef.current=0;
    const r=await apiAuctionStart({playerId:pid});
    if(r?.error)flash(r.error,'error');else resetCountdown();
  };
  const placeBid=async amount=>{
    if(!teamId){flash('Login as team owner to bid','warning');return;}
    if(!state||state.status!=='active'){flash('Auction not active','warning');return;}
    if(amount<=state.currentBid){flash(`Bid must exceed ${state.currentBid} pts`,'warning');return;}
    setBidding(true);const r=await apiAuctionBid({teamId:String(teamId),amount});setBidding(false);
    if(r?.error)flash(r.error,'error');
  };

  if(loading) return <div className="pg"><Ldr/></div>;

  const player=state?.currentPlayer;
  const lead=state?.leadingTeam;
  const bids=state?.bids||[];
  const active=state?.status==='active';
  const paused=state?.status==='paused';
  const canStart=isAdmin&&!active&&!paused&&avail.length>0;
  const myTeam=teams.find(t=>String(t._id)===String(teamId));
  const danger=countdown<=10&&active;

  return(
    <div className="pg fade-up">
      <style>{`
        @keyframes bid-flash{0%{box-shadow:0 0 0 0 var(--gold-glow)}100%{box-shadow:0 0 40px 16px transparent}}
        @keyframes sold-pop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        .bid-pulse-anim{animation:bid-flash .5s ease-out}
        .sold-pop{animation:sold-pop .5s cubic-bezier(.22,1,.36,1)}
      `}</style>

      <div className="card" style={{marginBottom:18,borderRadius:'var(--r)'}}>
        <div style={{padding:'12px 20px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,letterSpacing:'-.3px'}}>🔨 Player Auction · Season 2</div>
          <div style={{display:'flex',gap:10,marginLeft:'auto',alignItems:'center',flexWrap:'wrap'}}>
            {isOwner&&myTeam&&<span style={{fontSize:12,color:'var(--tx3)',fontWeight:600}}>Budget: <strong style={{color:'var(--gold)',fontFamily:"'JetBrains Mono',monospace"}}>{myTeam.budget-myTeam.spent} pts</strong></span>}
            <span style={{fontSize:12,color:'var(--tx3)'}}>{avail.length} players left</span>
            {active&&<span className="live-dot">BIDDING LIVE</span>}
            {paused&&<span className="badge b-o">PAUSED</span>}
            {(state?.status==='waiting'||state?.status==='sold')&&<span className="badge b-b">WAITING</span>}
            {state?.status==='closed'&&<span className="badge b-n">CLOSED</span>}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="col">
          <div className={`aspot${active?' active-auction':''}`}
            style={{border:danger?'1.5px solid #e74c3c':undefined,transition:'border-color .3s'}}>
            <div className={`a-bar${active?' live':' idle'}`} style={{background:danger?'#e74c3c':undefined}}/>
            <div className="a-head" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px'}}>
                {active?'Now Up for Bid':state?.status==='sold'?'Player Sold!':paused?'Auction Paused':'Waiting for Next Player'}
              </div>
              {active&&<span className="live-dot">LIVE</span>}
            </div>
            <div className="a-body">
              {state?.status==='closed'&&<><div style={{fontSize:52,marginBottom:12}}>🏆</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800}}>Auction Complete!</div><div style={{color:'var(--tx3)',marginTop:8}}>All players allocated.</div></>}
              {(state?.status==='waiting'||!player)&&state?.status!=='closed'&&state?.status!=='sold'&&<><div style={{fontSize:44,marginBottom:12}}>⏳</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800}}>Waiting to Start</div><div style={{color:'var(--tx3)',marginTop:8,fontSize:13}}>{isAdmin?'Select a player below to begin.':'Admin will start shortly.'}</div></>}
              {state?.status==='sold'&&player&&<div className="sold-pop"><div style={{fontSize:44,marginBottom:8}}>🎉</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,color:'var(--gold)'}}>SOLD!</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,marginTop:4}}>{player.name}</div>{lead&&<div style={{color:'var(--tx3)',fontSize:13,marginTop:4}}>→ {lead.name} for <strong style={{color:'var(--gold)',fontFamily:"'JetBrains Mono',monospace"}}>{state.currentBid} pts</strong></div>}</div>}
              {paused&&player&&<><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:'var(--gold)',marginBottom:8}}>Paused</div><PlayerFlipCard player={player} bidPulse={false}/><div className="a-bid idle" style={{marginTop:8}}>{state.currentBid||0}</div>{isAdmin&&<button className="btn btn-b" style={{marginTop:14}} onClick={handlePause}>▶ Resume</button>}</>}
              {active&&player&&<>
                {/* Card reveal + countdown stacked */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,marginBottom:8}}>
                  <PlayerFlipCard player={player} bidPulse={bidPulse}/>
                  <CountdownRing seconds={countdown}/>
                </div>
                <div style={{margin:'14px 0 5px'}}>
                  <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:5,fontWeight:700}}>Current Bid</div>
                  <div className={`a-bid${bidPulse?' bid-pulse-anim':''}`} style={{color:danger?'#e74c3c':undefined,transition:'color .3s'}}>{state.currentBid||0}</div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginTop:8}}>{lead?<span>Highest bid: <strong style={{color:'var(--tx)'}}>{lead.name}</strong></span>:'No bids yet — be first!'}</div>
                  {countdown===0&&lead&&<div style={{fontSize:12,color:'var(--gold)',fontWeight:700,marginTop:6}}>⏰ Time up — {lead.name} wins!</div>}
                  {countdown===0&&!lead&&<div style={{fontSize:12,color:'#e74c3c',fontWeight:700,marginTop:6}}>⏰ Time up — no bids</div>}
                </div>
                {isOwner&&(<div style={{marginTop:16}}>
                  {myTeam&&(myTeam.budget-myTeam.spent)<(state.currentBid+10)?
                    <div className="al al-er" style={{textAlign:'center'}}>Insufficient budget</div>:
                    <><div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:10}}>
                      {[10,20,50,100].map(inc=>{const nb=(state.currentBid||0)+inc;const ok=!myTeam||(myTeam.budget-myTeam.spent)>=nb;return(
                        <button key={inc} disabled={bidding||!ok} onClick={()=>placeBid(nb)}
                          style={{padding:'12px 22px',background:ok?'var(--gold)':'var(--card3)',color:ok?'#000':'var(--tx4)',border:'none',borderRadius:'var(--r)',fontWeight:700,fontSize:17,cursor:ok?'pointer':'not-allowed',fontFamily:"'JetBrains Mono',monospace",transition:'all var(--ease)',opacity:ok?1:.4,boxShadow:ok?'0 0 14px var(--gold-glow)':'none'}}>
                          {nb}</button>
                      );})}
                    </div>
                    <button disabled={bidding} onClick={()=>{const a=parseInt(prompt(`Custom bid (current: ${state.currentBid})`));if(a&&a>0)placeBid(a);}}
                      style={{background:'var(--glass2)',color:'var(--tx2)',border:'1px solid var(--line2)',padding:'9px 20px',borderRadius:'var(--r)',fontWeight:600,fontSize:13,cursor:'pointer',width:'100%',transition:'all var(--ease)'}}>
                      Custom bid…</button></>
                  }
                </div>)}
                {isAdmin&&<div style={{display:'flex',gap:8,marginTop:14,justifyContent:'center',flexWrap:'wrap'}}>
                  <button className="btn btn-p" onClick={handleSold} disabled={!lead}>🔨 SOLD</button>
                  <button className="btn btn-s" onClick={handlePause}>⏸ Pause</button>
                  <button className="btn btn-s" onClick={handleUnsold}>⏭ Unsold</button>
                </div>}
              </>}
            </div>
          </div>

          {canStart&&<div className="card">
            <div className="ch"><span className="ct">Start next player</span><span style={{fontSize:12,color:'var(--tx3)'}}>{avail.length} available</span></div>
            <div style={{padding:14,display:'flex',flexDirection:'column',gap:8}}>
              {avail.slice(0,5).map(p=>(
                <div key={p._id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--card2)',borderRadius:'var(--r)',border:'1px solid var(--line)'}}>
                  <div style={{width:34,height:34,borderRadius:'50%',background:'var(--red-fill)',border:'1px solid var(--red-bdr)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:'var(--red)',flexShrink:0}}>{p.name.split(' ').map(w=>w[0]).join('').substring(0,2)}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div><div style={{fontSize:11,color:'var(--tx3)', display: 'flex', alignItems: 'center', gap: 4}}>{(p.sports||[]).map(s=><SportIcon key={s} sport={s} style={{fontSize: 12}} />)} &middot; {p.basePrice} pts base</div></div>
                  <button className="btn btn-p btn-sm" onClick={()=>handleStart(p._id)}>Start →</button>
                </div>
              ))}
            </div>
          </div>}

          <div className="card">
            <div className="ch"><span className="ct">Bid history</span>{bids.length>0&&<span className="badge b-o">{bids.length} bids</span>}</div>
            <div style={{maxHeight:240,overflowY:'auto'}}>
              {bids.length===0&&<div className="empty" style={{padding:28}}><div className="eh">No bids yet</div></div>}
              {bids.map((b,i)=>(
                <div key={i} className={`bentry${i===0?' top':''}`}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:b.teamColor||'#888',flexShrink:0}}/>
                    <span style={{fontWeight:600}}>{b.teamName||'—'}</span>
                    {i===0&&<span className="badge b-o" style={{fontSize:9,padding:'1px 6px'}}>TOP</span>}
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,color:i===0?'var(--gold)':'var(--tx)'}}>{b.amount} pts</div>
                </div>
              ))}
            </div>
          </div>

          {sold.length>0&&<div className="card">
            <div className="ch"><span className="ct">Sold this session</span><span className="badge b-g">{sold.length}</span></div>
            {sold.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',borderBottom:'1px solid var(--line)'}}>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{s.player.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{s.team.name}</div></div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:'var(--gold)'}}>{s.price} pts</div>
              </div>
            ))}
          </div>}
        </div>

        <div className="col">
          <div className="card">
            <div className="ch"><span className="ct">Team budgets</span></div>
            {teams.map(t=>{
              const left=t.budget-t.spent;const pct=Math.max(0,Math.round(left/t.budget*100));const low=left<80;const me=String(t._id)===String(teamId);const leading=lead&&String(t._id)===String(lead.id);
              return(<div key={t._id} className="brow" style={{background:me?'var(--gold-fill)':leading?'rgba(46,204,113,0.06)':undefined,borderLeft:me?'2px solid var(--gold)':leading?'2px solid #2ecc71':'none'}}>
                <TL color={t.color} abbr={t.abbreviation} size={28}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:me?700:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6}}>
                    {t.name}
                    {me&&<span style={{fontSize:8,background:'var(--gold)',color:'#000',padding:'1px 5px',borderRadius:2,fontWeight:700,letterSpacing:'.5px'}}>YOU</span>}
                    {leading&&<span style={{fontSize:8,background:'#2ecc71',color:'#fff',padding:'1px 5px',borderRadius:2,fontWeight:700}}>LEADING</span>}
                  </div>
                  <div className="bbar" style={{marginTop:5}}><div className="bfill" style={{width:`${pct}%`,background:low?'var(--red)':t.color}}/></div>
                </div>
                <div style={{textAlign:'right',minWidth:60}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:low?'var(--red)':me?'var(--gold)':'var(--tx)'}}>{left}</div>
                  <div style={{fontSize:10,color:'var(--tx4)'}}>/{t.budget}</div>
                </div>
              </div>);
            })}
          </div>

          <div className="card">
            <div className="stabs">
              <button className={`stab${tab==='q'?' on':''}`} onClick={()=>setTab('q')}>Queue ({avail.length})</button>
              <button className={`stab${tab==='g'?' on':''}`} onClick={()=>setTab('g')}>How it works</button>
            </div>
            {tab==='q'&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:14}}>
              {avail.map((p,i)=>(
                <div key={p._id} style={{textAlign:'center',padding:'10px 6px',background:i===0&&active?'var(--red-fill)':'var(--card2)',borderRadius:'var(--r)',border:`1px solid ${i===0&&active?'var(--red-bdr)':'var(--line)'}`}}>
                  <div className="pav" style={{background:i===0&&active?'var(--red)':'#555',width:34,height:34,fontSize:11,margin:'0 auto 5px'}}>{p.name.split(' ').map(w=>w[0]).join('').substring(0,2)}</div>
                  <div style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name.split(' ')[0]}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'JetBrains Mono',monospace"}}>{p.basePrice}pts</div>
                </div>
              ))}
              {avail.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:20,color:'var(--tx3)',fontSize:12}}>No more players</div>}
            </div>}
            {tab==='g'&&<div style={{padding:16,display:'flex',flexDirection:'column',gap:12}}>
              {[['1','Admin picks a player','Spotlight activates · 30 sec countdown starts'],['2','Each bid resets timer','Race against time to outbid others'],['3','Highest bid wins','Admin clicks SOLD to confirm'],['4','Budget deducted','Team balance updates live']].map(([n,t,s])=>(
                <div key={n} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'var(--red)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12,color:'#fff',flexShrink:0}}>{n}</div>
                  <div><div style={{fontWeight:600,fontSize:13}}>{t}</div><div style={{fontSize:12,color:'var(--tx3)',marginTop:1}}>{s}</div></div>
                </div>
              ))}
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
