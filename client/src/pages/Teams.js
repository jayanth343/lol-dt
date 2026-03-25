import React,{useState,useEffect,useRef} from 'react';
import { createPortal } from 'react-dom';
import Chip from '@mui/material/Chip';
import {TL,Ldr,SportIcon} from '../components/Shared';
import {PlayerFlipCard,WhatsAppShareCard} from '../components/PlayerCard';
import {apiTeams,apiTeam,apiCreateSubTeam,apiUpdateSubTeam,apiDeleteSubTeam,apiManageTeam} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const SPORT_LABEL={cricket:'Cricket',football:'Football',badminton:'Badminton',table_tennis:'Table Tennis',carrom:'Carrom'};

// ── Small stat box ────────────────────────────────────────────────
function StatBox({label,value,color='var(--tx)'}){
  return(
    <div style={{background:'var(--card2)',borderRadius:'var(--r)',padding:'10px 8px',textAlign:'center',border:'1px solid var(--line)'}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:700,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginTop:4}}>{label}</div>
    </div>
  );
}

// ── Sports distribution bar ───────────────────────────────────────
function SportBar({players}){
  const counts={};
  players.forEach(p=>(p.sports||[]).forEach(s=>{counts[s]=(counts[s]||0)+1;}));
  const total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
  if(!Object.keys(counts).length) return null;
  return(
    <div style={{marginTop:14}}>
      <div style={{fontSize:10,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700,marginBottom:8}}>Sports in squad</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([sport,cnt])=>(
          <div key={sport} style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14,width:20,display:'flex',alignItems:'center'}}><SportIcon sport={sport} style={{fontSize:16}}/></span>
            <div style={{flex:1,height:6,background:'var(--card3)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${(cnt/total)*100}%`,background:'var(--red)',borderRadius:3,transition:'width .6s var(--ease)'}}/>
            </div>
            <span style={{fontSize:11,color:'var(--tx3)',minWidth:80}}>{SPORT_LABEL[sport]}</span>
            <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:'var(--tx2)',minWidth:16,textAlign:'right'}}>{cnt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player row (list view with sports) ────────────────────────────
function PlayerRow({p,teamColor,onFlip}){
  return(
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid var(--line)',cursor:'pointer',transition:'background var(--ease)'}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--card2)'}
      onMouseLeave={e=>e.currentTarget.style.background=''}
      onClick={()=>onFlip(p)}>
      {/* Avatar */}
      <div style={{width:36,height:36,borderRadius:'50%',background:teamColor||'#555',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:12,color:'#fff',flexShrink:0}}>
        {p.name.split(' ').map(w=>w[0]).join('').substring(0,2)}
      </div>
      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
        <div style={{fontSize:11,color:'var(--tx3)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.department}</div>
      </div>
      {/* Sports played */}
      <div style={{display:'flex',gap:3,flexShrink:0}}>
        {(p.sports||[]).map(s=><SportIcon key={s} sport={s} style={{fontSize:16}} title={SPORT_LABEL[s]}/>)}
      </div>
      {/* Skill */}
      {p.skillLevel&&(
        <span style={{fontSize:9,padding:'2px 7px',borderRadius:3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',
          background:p.skillLevel==='Advanced'?'var(--gold-fill)':p.skillLevel==='Intermediate'?'var(--blue-fill)':'var(--card3)',
          color:p.skillLevel==='Advanced'?'var(--gold)':p.skillLevel==='Intermediate'?'var(--blue)':'var(--tx4)',
          border:`1px solid ${p.skillLevel==='Advanced'?'var(--gold-bdr)':p.skillLevel==='Intermediate'?'var(--blue-bdr)':'var(--line)'}`}}>
          {p.skillLevel}
        </span>
      )}
      {/* Bid */}
      {p.bidPrice&&(
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13,color:'var(--gold)',flexShrink:0}}>{p.bidPrice}pts</div>
      )}
      {/* Flip hint */}
      <div style={{fontSize:10,color:'var(--tx4)',flexShrink:0}}>flip →</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function Teams({ onlyMyTeam=false }){
  const { role, teamId: myTeamId } = useAuth();
  const { showToast } = useToast();
  const [teams,setTeams]=useState([]);
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');
  const [flipPlayer,setFlipPlayer]=useState(null);
  const [showFlip,setShowFlip]=useState(false);
  const [subTeamBusy,setSubTeamBusy]=useState(false);
  const [subTeamForm,setSubTeamForm]=useState({name:'',sport:'cricket',description:'',playerIds:[]});
  const [draftSelectedIds,setDraftSelectedIds]=useState([]);
  const [draftDragIds,setDraftDragIds]=useState([]);
  const [editingSubTeamId,setEditingSubTeamId]=useState('');
  const [editForm,setEditForm]=useState(null);
  const [teamForm,setTeamForm]=useState({name:'',department:'',abbreviation:'',color:'#e74c3c'});
  const [teamSaveBusy,setTeamSaveBusy]=useState(false);

  const hydrateDetail = (d) => {
    if(d && !d.error){
      setDetail(d);
      const t = d.team || {};
      setTeamForm({
        name: t.name || '',
        department: t.department || '',
        abbreviation: t.abbreviation || '',
        color: t.color || '#e74c3c'
      });
    }
  };

  useEffect(()=>{
    setLoading(true);

    if (onlyMyTeam) {
      if (!myTeamId) {
        setErr('No team assigned to this account');
        setLoading(false);
        return;
      }

      Promise.all([apiTeams(), apiTeam(myTeamId)])
        .then(([allTeams, d]) => {
          if(allTeams&&allTeams.error){setErr(allTeams.error);setLoading(false);return;}
          setTeams(Array.isArray(allTeams)?allTeams:[]);
          setSelected(String(myTeamId));
          hydrateDetail(d);
          setLoading(false);
        })
        .catch(e=>{setErr(e.message||'Failed to load team');setLoading(false);});
      return;
    }

    apiTeams()
      .then(d=>{
        if(d&&d.error){setErr(d.error);setLoading(false);return;}
        setTeams(Array.isArray(d)?d:[]);
        setLoading(false);
      })
      .catch(e=>{setErr(e.message||'Failed to load teams');setLoading(false);});
  },[onlyMyTeam,myTeamId]);

  const selectTeam=t=>{
    setSelected(t._id);
    setDetail(null);
    setFlipPlayer(null);
    setShowFlip(false);
    apiTeam(t._id)
      .then(d=>{hydrateDetail(d);})
      .catch(()=>{});
  };
  const back=()=>{if(onlyMyTeam)return;setSelected(null);setDetail(null);setFlipPlayer(null);setShowFlip(false);};

  // Trigger cinematic flip for a player
  const triggerFlip=p=>{
    setFlipPlayer(null);
    setShowFlip(false);
    setTimeout(()=>{setFlipPlayer({...p,_id:p._id+'_'+Date.now()});setShowFlip(true);},50);
  };

  if(loading) return <div className="pg"><Ldr/></div>;
  if(err) return(
    <div className="pg fade-up">
      <div className="al al-er" style={{marginBottom:16}}>❌ {err}</div>
      <div style={{fontSize:13,color:'var(--tx3)'}}>Make sure the server is running and MongoDB is connected.</div>
    </div>
  );

  const currentTeam=detail?.team;
  const players=detail?.players||[];
  const standings=detail?.standings||[];
  const subTeams=detail?.subTeams||currentTeam?.subTeams||[];
  const canManageSubTeams = !!currentTeam && ['team_owner','captain','admin'].includes(role) && (role==='admin' || String(myTeamId||'')===String(currentTeam?._id||''));

  const toggleDraftPlayer=(pid)=>setDraftSelectedIds(prev=>prev.includes(pid)?prev.filter(x=>x!==pid):[...prev,pid]);
  const draftSportPlayers = players.filter(p=>(p.sports||[]).includes(subTeamForm.sport));
  const draftAvailablePlayers = draftSportPlayers.filter(p=>!subTeamForm.playerIds.includes(p._id));
  const startDraftDrag=(pid)=>setDraftDragIds(draftSelectedIds.includes(pid)?draftSelectedIds:[pid]);
  const addDraftPlayers=(ids=[])=>setSubTeamForm(prev=>({ ...prev, playerIds:[...new Set([...(prev.playerIds||[]), ...ids])] }));
  const removeDraftPlayers=(ids=[])=>setSubTeamForm(prev=>({ ...prev, playerIds:(prev.playerIds||[]).filter(id=>!ids.includes(id)) }));

  const saveSubTeam=async()=>{
    if(!currentTeam?._id) return;
    if(!subTeamForm.name.trim()) return showToast('Sub-team name is required','warning');
    if(!subTeamForm.sport) return showToast('Sport is required','warning');
    setSubTeamBusy(true);
    const res=await apiCreateSubTeam(currentTeam._id,{
      name: subTeamForm.name.trim(),
      sport: subTeamForm.sport,
      description: subTeamForm.description,
      playerIds: subTeamForm.playerIds
    });
    setSubTeamBusy(false);
    if(res?.error) return showToast(res.error,'error');

    const fresh=await apiTeam(currentTeam._id);
    if(fresh && !fresh.error) setDetail(fresh);
    setSubTeamForm({name:'',sport:subTeamForm.sport,description:'',playerIds:[]});
    setDraftSelectedIds([]);
    setDraftDragIds([]);
    showToast('Sub-team created','success');
  };

  const openEditSubTeam=(st)=>{
    setEditingSubTeamId(st._id);
    setEditForm({
      _id: st._id,
      name: st.name || '',
      sport: st.sport || 'cricket',
      description: st.description || '',
      playerIds: (st.playerIds || []).map(p => p._id || p)
    });
  };

  const updateSubTeam=async()=>{
    if(!currentTeam?._id || !editForm?._id) return;
    if(!editForm.name.trim()) return showToast('Sub-team name is required','warning');
    const res=await apiUpdateSubTeam(currentTeam._id,editForm._id,{
      name: editForm.name.trim(),
      sport: editForm.sport,
      description: editForm.description,
      playerIds: editForm.playerIds || []
    });
    if(res?.error) return showToast(res.error,'error');
    const fresh=await apiTeam(currentTeam._id);
    if(fresh && !fresh.error) setDetail(fresh);
    setEditingSubTeamId('');
    setEditForm(null);
    showToast('Sub-team updated','success');
  };

  const removeSubTeam=async(subTeamId)=>{
    if(!currentTeam?._id || !subTeamId) return;
    const res=await apiDeleteSubTeam(currentTeam._id,subTeamId);
    if(res?.error) return showToast(res.error,'error');
    const fresh=await apiTeam(currentTeam._id);
    if(fresh && !fresh.error) setDetail(fresh);
    if(editingSubTeamId===subTeamId){setEditingSubTeamId('');setEditForm(null);}
    showToast('Sub-team deleted','success');
  };

  const saveTeamProfile=async()=>{
    if(!currentTeam?._id) return;
    if(!teamForm.name.trim()) return showToast('Team name is required','warning');
    if(!teamForm.abbreviation.trim()) return showToast('Abbreviation is required','warning');
    setTeamSaveBusy(true);
    const res=await apiManageTeam(currentTeam._id,{
      name: teamForm.name.trim(),
      department: teamForm.department.trim(),
      abbreviation: teamForm.abbreviation.trim().toUpperCase().slice(0,3),
      color: teamForm.color
    });
    setTeamSaveBusy(false);
    if(res?.error) return showToast(res.error,'error');

    const fresh=await apiTeam(currentTeam._id);
    if(fresh && !fresh.error) hydrateDetail(fresh);
    setTeams(prev=>prev.map(t=>String(t._id)===String(currentTeam._id)?{...t,...res}:t));
    showToast('Team profile updated','success');
  };

  return(
    <div className="pg fade-up">

      {/* ══════════════════════════════════════════
          GRID VIEW — all teams
      ══════════════════════════════════════════ */}
      {!selected&& !onlyMyTeam && (
        <>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,letterSpacing:'-.5px',marginBottom:18}}>
            Teams <span style={{fontSize:14,fontWeight:400,color:'var(--tx3)',fontFamily:'inherit'}}>· {teams.length} squads</span>
          </div>

          {teams.length===0&&(
            <div className="card" style={{padding:52,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:16}}>👥</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,marginBottom:8}}>No teams found</div>
              <div style={{color:'var(--tx3)',fontSize:13,marginBottom:24}}>Run the seed script to populate data.</div>
              <div style={{background:'var(--card2)',borderRadius:'var(--r)',padding:'14px 20px',display:'inline-block',
                textAlign:'left',border:'1px solid var(--line)',fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:'var(--tx2)'}}>
                <div style={{color:'var(--tx4)',marginBottom:6}}>// From project root:</div>
                <div style={{color:'var(--gold)'}}>node server/seed.js</div>
              </div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
            {teams?.map(t=>{
              const left=t.budget-t.spent;
              const pct=Math.max(0,Math.min(100,Math.round(t.spent/t.budget*100)));
              return(
                <div key={t._id} className="card"
                  style={{cursor:'pointer',transition:'transform var(--ease)',overflow:'hidden'}}
                  onClick={()=>selectTeam(t)}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-3px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                  <div style={{height:5,background:t.color}}/>
                  <div style={{padding:18}}>
                    {/* Team header */}
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                      <TL color={t.color} abbr={t.abbreviation} size={48}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,letterSpacing:'-.3px',
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</div>
                        <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{t.department}</div>
                        {t.ownerId&&(
                          <div style={{fontSize:10,color:'var(--tx4)',marginTop:3,display:'flex',alignItems:'center',gap:4}}>
                            <span>👤</span><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.ownerId.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Budget bar */}
                    <div style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--tx3)',marginBottom:5}}>
                        <span>Budget used</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:pct>80?'var(--red)':t.color}}>{pct}%</span>
                      </div>
                      <div style={{height:5,background:'var(--card3)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:pct>80?'var(--red)':t.color,borderRadius:3}}/>
                      </div>
                    </div>
                    {/* Stats */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                      <StatBox label="Left" value={left} color="var(--gold)"/>
                      <StatBox label="Spent" value={t.spent} color="var(--tx2)"/>
                      <StatBox label="Total" value={t.budget} color="var(--tx3)"/>
                    </div>
                    <div style={{marginTop:10,fontSize:11,color:'var(--tx4)',textAlign:'right'}}>View squad →</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          DETAIL VIEW — selected team
      ══════════════════════════════════════════ */}
      {selected&&(
        <div style={{display:'grid',gridTemplateColumns:onlyMyTeam?'1fr':'200px 1fr',gap:16,alignItems:'start'}}>

          {/* ── Sidebar team list ── */}
          {!onlyMyTeam && <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn btn-s btn-sm" style={{marginBottom:4}} onClick={back}>← All Teams</button>
            {teams?.map(t=>(
              <div key={t._id} onClick={()=>selectTeam(t)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                  borderRadius:'var(--r)',cursor:'pointer',
                  background:selected===t._id?'var(--card2)':'var(--card)',
                  border:selected===t._id?`1.5px solid ${t.color}`:'1px solid var(--line)',
                  transition:'all var(--ease)'}}>
                <TL color={t.color} abbr={t.abbreviation} size={28}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{t.budget-t.spent} pts left</div>
                </div>
              </div>
            ))}
          </div>}

          {/* ── Main detail panel ── */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {!detail&&<div className="card" style={{padding:40,textAlign:'center'}}><Ldr txt="Loading team…"/></div>}

            {detail&&<>
              {/* ── MY TEAM / TEAM PROFILE MANAGE ── */}
              {canManageSubTeams && (
                <div className="card">
                  <div className="ch">
                    <span className="ct">{onlyMyTeam ? 'My Team Panel' : 'Team Management'}</span>
                    <span style={{fontSize:12,color:'var(--tx3)'}}>Owner/Captain controls</span>
                  </div>
                  <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    <div>
                      <label className="fl">Name</label>
                      <input className="fi" value={teamForm.name} onChange={e=>setTeamForm({...teamForm,name:e.target.value})} />
                    </div>
                    <div>
                      <label className="fl">Department</label>
                      <input className="fi" value={teamForm.department} onChange={e=>setTeamForm({...teamForm,department:e.target.value})} />
                    </div>
                    <div>
                      <label className="fl">Abbreviation</label>
                      <input className="fi" maxLength={3} value={teamForm.abbreviation} onChange={e=>setTeamForm({...teamForm,abbreviation:e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="fl">Color</label>
                      <input className="fi" type="color" value={teamForm.color} onChange={e=>setTeamForm({...teamForm,color:e.target.value})} />
                    </div>
                    <div style={{gridColumn:'span 4',display:'flex',justifyContent:'flex-end'}}>
                      <button className="btn btn-p btn-sm" disabled={teamSaveBusy} onClick={saveTeamProfile}>{teamSaveBusy?'Saving...':'Save Team'}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 1. TEAM HEADER ── */}
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{height:6,background:currentTeam?.color}}/>
                <div style={{padding:20}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:18,flexWrap:'wrap'}}>
                    <TL color={currentTeam?.color} abbr={currentTeam?.abbreviation} size={64}/>
                    <div style={{flex:1,minWidth:180}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,letterSpacing:'-.5px'}}>{currentTeam?.name}</div>
                      <div style={{color:'var(--tx3)',fontSize:13,marginTop:4,display:'flex',alignItems:'center',gap:6}}>
                        <span>🏢</span>{currentTeam?.department}
                      </div>
                      {currentTeam?.ownerId&&(
                        <div style={{marginTop:8,display:'inline-flex',alignItems:'center',gap:8,
                          padding:'6px 12px',background:'var(--card2)',borderRadius:'var(--r)',border:'1px solid var(--line)'}}>
                          <div style={{width:24,height:24,borderRadius:'50%',background:currentTeam.color,
                            display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff'}}>
                            {currentTeam.ownerId.name?.charAt(0)||'?'}
                          </div>
                          <div>
                            <div style={{fontSize:12,fontWeight:600}}>{currentTeam.ownerId.name}</div>
                            <div style={{fontSize:10,color:'var(--tx4)'}}>Team Owner · {currentTeam.ownerId.email}</div>
                          </div>
                        </div>
                      )}
                      {!currentTeam?.ownerId&&(
                        <div style={{marginTop:8,fontSize:11,color:'var(--tx4)',fontStyle:'italic'}}>No owner assigned</div>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                    <StatBox label="Players" value={players.length} color="var(--blue)"/>
                    <StatBox label="Budget"  value={currentTeam?.budget} color="var(--tx2)"/>
                    <StatBox label="Spent"   value={currentTeam?.spent}  color="var(--red)"/>
                    <StatBox label="Left"    value={(currentTeam?.budget||0)-(currentTeam?.spent||0)} color="var(--gold)"/>
                  </div>

                  {/* Budget bar */}
                  {currentTeam&&(()=>{
                    const pct=Math.max(0,Math.min(100,Math.round(currentTeam.spent/currentTeam.budget*100)));
                    return(
                      <div style={{marginTop:14}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--tx3)',marginBottom:5}}>
                          <span>Budget used</span>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:pct>80?'var(--red)':currentTeam.color}}>{pct}%</span>
                        </div>
                        <div style={{height:7,background:'var(--card3)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:pct>80?'var(--red)':currentTeam.color,borderRadius:4,transition:'width .8s var(--ease)'}}/>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ── 2. SQUAD — player rows with flip cards ── */}
              <div className="card">
                <div className="ch">
                  <span className="ct">Squad</span>
                  <span style={{fontSize:12,color:'var(--tx3)'}}>{players.length} players · click any row to reveal card</span>
                </div>

                {players.length===0&&(
                  <div className="empty" style={{padding:40}}>
                    <div className="ei">🏃</div>
                    <div className="eh">No players yet</div>
                    <div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>Players appear after auction</div>
                  </div>
                )}

                {/* Player list */}
                {players?.map(p=>(
                  <PlayerRow key={p._id} p={p} teamColor={currentTeam?.color} onFlip={triggerFlip}/>
                ))}

                {/* Cinematic flip modal */}
                {showFlip&&flipPlayer&&createPortal(
                  <div onClick={()=>setShowFlip(false)}
                    style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',
                      display:'flex',alignItems:'flex-start',justifyContent:'center',
                      paddingTop:32,
                      zIndex:9999,backdropFilter:'blur(4px)'}}>
                    <div onClick={e=>e.stopPropagation()}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.4)',letterSpacing:'2px',textTransform:'uppercase'}}>Player Reveal</div>
                      <PlayerFlipCard player={flipPlayer} bidPulse={false} autoReveal={true}/>
                      <button onClick={()=>setShowFlip(false)}
                        style={{marginTop:8,padding:'8px 24px',background:'rgba(255,255,255,.1)',
                          color:'rgba(255,255,255,.7)',border:'1px solid rgba(255,255,255,.15)',
                          borderRadius:8,cursor:'pointer',fontSize:12}}>
                        Close
                      </button>
                    </div>
                  </div>,
                  document.body
                )}

                {/* Sports distribution */}
                {players.length>0&&(
                  <div style={{padding:'0 16px 16px'}}>
                    <SportBar players={players}/>
                  </div>
                )}
              </div>

              {/* ── 2.5 SUB-TEAMS BY SPORT ── */}
              <div className="card">
                <div className="ch">
                  <span className="ct">Sub-teams by sport</span>
                  <span style={{fontSize:12,color:'var(--tx3)'}}>{subTeams.length} sub-teams</span>
                </div>

                {canManageSubTeams&&(
                  <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)',display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                    <div>
                      <label className="fl">Sub-team name *</label>
                      <input className="fi" value={subTeamForm.name} onChange={e=>setSubTeamForm({...subTeamForm,name:e.target.value})} placeholder="Cricket XI"/>
                    </div>
                    <div>
                      <label className="fl">Sport *</label>
                      <select className="fs" value={subTeamForm.sport} onChange={e=>setSubTeamForm({...subTeamForm,sport:e.target.value})}>
                        {['cricket','football','badminton','table_tennis','carrom'].map(s=><option key={s} value={s}>{SPORT_LABEL[s]||s}</option>)}
                      </select>
                    </div>
                    <div style={{gridColumn:'span 2'}}>
                      <label className="fl">Description</label>
                      <input className="fi" value={subTeamForm.description} onChange={e=>setSubTeamForm({...subTeamForm,description:e.target.value})} placeholder="Primary match squad"/>
                    </div>
                    <div style={{gridColumn:'span 2'}}>
                      <label className="fl">Players (Drag & Drop)</label>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:6}}>
                        <div style={{border:'1px dashed var(--line2)',borderRadius:8,padding:8,minHeight:140}}
                          onDragOver={(e)=>e.preventDefault()}
                          onDrop={(e)=>{e.preventDefault(); removeDraftPlayers(draftDragIds); setDraftDragIds([]);}}>
                          <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>Available ({draftAvailablePlayers.length})</div>
                          <div style={{display:'flex',gap:6,marginBottom:8}}>
                            <button className="btn btn-s btn-sm" onClick={()=>setDraftSelectedIds(draftAvailablePlayers.map(p=>p._id))}>Select all</button>
                            <button className="btn btn-s btn-sm" onClick={()=>setDraftSelectedIds([])}>Clear</button>
                          </div>
                          {draftAvailablePlayers.map(p=>(
                            <div key={p._id} draggable onDragStart={()=>startDraftDrag(p._id)} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 8px',border:'1px solid var(--line)',borderRadius:8,marginBottom:5,cursor:'grab'}}>
                              <input type="checkbox" checked={draftSelectedIds.includes(p._id)} onChange={()=>toggleDraftPlayer(p._id)} />
                              <span style={{fontSize:12,flex:1}}>{p.name}</span>
                              <button className="btn btn-s btn-sm" onClick={()=>addDraftPlayers([p._id])}>Add</button>
                            </div>
                          ))}
                          {draftSportPlayers.length===0&&<span style={{fontSize:11,color:'var(--tx4)'}}>No players for this sport.</span>}
                        </div>

                        <div style={{border:'1px dashed var(--acc)',borderRadius:8,padding:8,minHeight:140,background:'var(--card2)'}}
                          onDragOver={(e)=>e.preventDefault()}
                          onDrop={(e)=>{e.preventDefault(); addDraftPlayers(draftDragIds); setDraftDragIds([]);}}>
                          <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>Sub-team players ({subTeamForm.playerIds.length})</div>
                          {(subTeamForm.playerIds||[]).map(pid=>{
                            const p=players.find(pp=>pp._id===pid);
                            if(!p) return null;
                            return (
                              <div key={pid} draggable onDragStart={()=>setDraftDragIds([pid])} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 8px',border:'1px solid var(--line)',borderRadius:8,marginBottom:5,cursor:'grab'}}>
                                <span style={{fontSize:12,flex:1}}>{p.name}</span>
                                <button className="btn btn-ng btn-sm" onClick={()=>removeDraftPlayers([pid])}>Remove</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{gridColumn:'span 2',display:'flex',justifyContent:'flex-end'}}>
                      <button className="btn btn-p btn-sm" disabled={subTeamBusy} onClick={saveSubTeam}>{subTeamBusy?'Saving...':'Create Sub-team'}</button>
                    </div>
                  </div>
                )}

                {subTeams.length===0&&<div className="empty" style={{padding:22}}><div className="eh">No sub-teams yet</div></div>}
                {subTeams.map(st=>(
                  <div key={st._id} style={{padding:'10px 16px',borderBottom:'1px solid var(--line)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:700}}><SportIcon sport={st.sport} style={{fontSize:16}}/>{st.name}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:11,color:'var(--tx3)'}}>Captain: {st.captainId?.name||'—'}</span>
                        {canManageSubTeams&&<button className="btn btn-s btn-sm" onClick={()=>openEditSubTeam(st)}>{editingSubTeamId===st._id?'Editing':'Manage'}</button>}
                        {canManageSubTeams&&<button className="btn btn-ng btn-sm" onClick={()=>removeSubTeam(st._id)}>Delete</button>}
                      </div>
                    </div>
                    {!!st.description&&<div style={{fontSize:12,color:'var(--tx3)',marginTop:4}}>{st.description}</div>}
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                      {(st.playerIds||[]).map(p=>(
                        <Chip
                          key={p._id||p}
                          label={p.name||'Player'}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(52,152,219,.14)',
                            color: '#7dc3ff',
                            border: '1px solid rgba(52,152,219,.35)',
                            fontWeight: 600,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      ))}
                    </div>

                    {canManageSubTeams && editingSubTeamId===st._id && editForm && (
                      <div style={{marginTop:10,padding:10,border:'1px solid var(--line)',borderRadius:8,background:'var(--card2)'}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                          <input className="fi" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} placeholder="Sub-team name" />
                          <select className="fs" value={editForm.sport} onChange={e=>setEditForm({...editForm,sport:e.target.value})}>
                            {['cricket','football','badminton','table_tennis','carrom'].map(s=><option key={s} value={s}>{SPORT_LABEL[s]||s}</option>)}
                          </select>
                          <input className="fi" style={{gridColumn:'span 2'}} value={editForm.description||''} onChange={e=>setEditForm({...editForm,description:e.target.value})} placeholder="Description" />
                        </div>

                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                          <div style={{border:'1px dashed var(--line2)',borderRadius:8,padding:8,maxHeight:180,overflowY:'auto'}}>
                            <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>Available</div>
                            {players.filter(p=>(p.sports||[]).includes(editForm.sport) && !(editForm.playerIds||[]).includes(p._id)).map(p=>(
                              <div key={p._id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',border:'1px solid var(--line)',borderRadius:8,marginBottom:5}}>
                                <span style={{fontSize:12,flex:1}}>{p.name}</span>
                                <button className="btn btn-s btn-sm" onClick={()=>setEditForm(prev=>({...prev,playerIds:[...new Set([...(prev.playerIds||[]),p._id])] }))}>Add</button>
                              </div>
                            ))}
                          </div>
                          <div style={{border:'1px dashed var(--acc)',borderRadius:8,padding:8,maxHeight:180,overflowY:'auto',background:'var(--card3)'}}>
                            <div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>Assigned</div>
                            {(editForm.playerIds||[]).map(pid=>{
                              const p=players.find(pp=>pp._id===pid);
                              if(!p) return null;
                              return (
                                <div key={pid} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',border:'1px solid var(--line)',borderRadius:8,marginBottom:5}}>
                                  <span style={{fontSize:12,flex:1}}>{p.name}</span>
                                  <button className="btn btn-ng btn-sm" onClick={()=>setEditForm(prev=>({...prev,playerIds:(prev.playerIds||[]).filter(x=>x!==pid)}))}>Remove</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{display:'flex',justifyContent:'flex-end',gap:6,marginTop:8}}>
                          <button className="btn btn-s btn-sm" onClick={()=>{setEditingSubTeamId('');setEditForm(null);}}>Cancel</button>
                          <button className="btn btn-ok btn-sm" onClick={updateSubTeam}>Save</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── 3. SPORTS BREAKDOWN TABLE ── */}
              {players.length>0&&(()=>{
                const sportMap={};
                players.forEach(p=>(p.sports||[]).forEach(s=>{
                  if(!sportMap[s])sportMap[s]=[];
                  sportMap[s].push(p);
                }));
                return(
                  <div className="card">
                    <div className="ch"><span className="ct">Sports played by each player</span></div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                        <thead>
                          <tr style={{borderBottom:'1px solid var(--line)'}}>
                            <th style={{textAlign:'left',padding:'8px 16px',color:'var(--tx4)',fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'.8px'}}>Player</th>
                            {['cricket','football','badminton','table_tennis','carrom'].map(s=>(
                              <th key={s} style={{textAlign:'center',padding:'8px 10px',color:'var(--tx4)',fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'.5px'}}>
                                <div style={{display:'flex',justifyContent:'center'}}><SportIcon sport={s} style={{fontSize:16}}/></div>
                                <div style={{fontSize:9,marginTop:2}}>{s.replace('_','\n')}</div>
                              </th>
                            ))}
                            <th style={{textAlign:'right',padding:'8px 16px',color:'var(--tx4)',fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'.8px'}}>Skill</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players?.map(p=>(
                            <tr key={p._id} style={{borderBottom:'1px solid var(--line)',cursor:'pointer',transition:'background var(--ease)'}}
                              onMouseEnter={e=>e.currentTarget.style.background='var(--card2)'}
                              onMouseLeave={e=>e.currentTarget.style.background=''}
                              onClick={()=>triggerFlip(p)}>
                              <td style={{padding:'10px 16px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                  <div style={{width:28,height:28,borderRadius:'50%',background:currentTeam?.color,
                                    display:'flex',alignItems:'center',justifyContent:'center',
                                    fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:10,color:'#fff',flexShrink:0}}>
                                    {p.name.split(' ').map(w=>w[0]).join('').substring(0,2)}
                                  </div>
                                  <div>
                                    <div style={{fontWeight:600,fontSize:12}}>{p.name}</div>
                                    <div style={{fontSize:10,color:'var(--tx3)'}}>{p.department}</div>
                                  </div>
                                </div>
                              </td>
                              {['cricket','football','badminton','table_tennis','carrom'].map(s=>(
                                <td key={s} style={{textAlign:'center',padding:'10px'}}>
                                  {(p.sports||[]).includes(s)
                                    ?<span style={{display: 'inline-flex', alignItems: 'center'}}><SportIcon sport={s} style={{fontSize: 16}} /></span>
                                    :<span style={{color:'var(--line2)',fontSize:12}}>—</span>}
                                </td>
                              ))}
                              <td style={{padding:'10px 16px',textAlign:'right'}}>
                                <span style={{fontSize:9,padding:'2px 7px',borderRadius:3,fontWeight:700,textTransform:'uppercase',
                                  background:p.skillLevel==='Advanced'?'var(--gold-fill)':p.skillLevel==='Intermediate'?'var(--blue-fill)':'var(--card3)',
                                  color:p.skillLevel==='Advanced'?'var(--gold)':p.skillLevel==='Intermediate'?'var(--blue)':'var(--tx4)',
                                  border:`1px solid ${p.skillLevel==='Advanced'?'var(--gold-bdr)':p.skillLevel==='Intermediate'?'var(--blue-bdr)':'var(--line)'}`}}>
                                  {p.skillLevel||'—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ── 4. STANDINGS PER SPORT ── */}
              {standings.length>0&&(
                <div className="card">
                  <div className="ch"><span className="ct">Performance by sport</span></div>
                  <div style={{overflowX:'auto'}}>
                    <table className="pts-tbl">
                      <thead><tr>
                        <th>Sport</th>
                        <th className="c">M</th><th className="c">W</th>
                        <th className="c">L</th><th className="c">Pts</th><th className="c">NRR</th>
                      </tr></thead>
                      <tbody>
                        {standings.map(s=>{
                          const nrr=typeof s.nrr==='number'?s.nrr:parseFloat(s.nrr)||0;
                          return(
                            <tr key={s._id}>
                              <td><div style={{display:'flex',alignItems:'center',gap:8}}><SportIcon sport={s.sport} style={{fontSize: 16}} /> {s.sport.replace('_',' ')}</div></td>
                              <td className="c" style={{color:'var(--tx3)'}}>{s.played}</td>
                              <td className="c"><span style={{color:'var(--grn)',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{s.won}</span></td>
                              <td className="c"><span style={{color:'var(--red)',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{s.lost}</span></td>
                              <td className="c"><span className="pts-badge">{s.points}</span></td>
                              <td className="c"><span style={{color:nrr>=0?'var(--grn)':'var(--red)',fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>{nrr>=0?'+':''}{nrr.toFixed(2)}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. WHATSAPP SHARE */}
              <WhatsAppShareCard
                title={`👥 *${currentTeam?.name}* — CTO DT League of Legends S2`}
                lines={[
                  `🏬 ${currentTeam?.department}`,
                  currentTeam?.ownerId?`👤 Owner: ${currentTeam.ownerId.name}`:'',
                  ``,
                  `📊 *Squad (${players.length} players)*`,
                  ...players?.map(p=>`  • ${p.name} — ${(p.sports||[]).map(s=>SPORT_LABEL[s]||s).join(', ')} ${p.skillLevel?`(${p.skillLevel})`:''} ${p.bidPrice?`${p.bidPrice}pts`:''}`),
                  ``,
                  standings.length>0?`🏆 *Results*`:null,
                  ...standings.map(s=>`  ${s.sport.replace('_',' ')}: ${s.won}W–${s.lost}L (${s.points}pts)`),
                ].filter(l=>l!==null)}
                hashtags={['LeagueOfLegends','CTODT','Season2']}
                buttonLabel="📲 Share team on WhatsApp"
              />
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

