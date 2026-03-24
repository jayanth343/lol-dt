import React,{useState,useEffect} from 'react';
import {TL,Ldr,SportFilt} from '../components/Shared';
import {apiPlayers} from '../lib/api';
const SI={cricket:'🏏',football:'⚽',badminton:'🏸',table_tennis:'🏓',carrom:'🎯'};
export default function Players(){
  const [players,setPlayers]=useState([]);
  const [search,setSearch]=useState('');
  const [sport,setSport]=useState('all');
  const [status,setStatus]=useState('all');
  const [sel,setSel]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{apiPlayers().then(d=>{setPlayers(Array.isArray(d)?d:[]);setLoading(false);});},[]);
  const filtered=players.filter(p=>{
    const ok=!search||p.name.toLowerCase().includes(search.toLowerCase())||p.department.toLowerCase().includes(search.toLowerCase());
    return ok&&(sport==='all'||p.sports.includes(sport))&&(status==='all'||p.status===status);
  });
  const player=players.find(p=>p._id===sel);const pt=player?.teamId;
  if(loading) return <div className="pg"><Ldr/></div>;
  return (
    <div className="pg fade-up">
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}} className="stagger">
        {[['Total',players.length,'var(--blue)'],['Available',players.filter(p=>p.status==='available').length,'var(--grn)'],['Sold',players.filter(p=>p.status==='sold').length,'var(--gold)']].map(([l,v,c])=>(
          <div key={l} className="card" style={{textAlign:'center',padding:18}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:32,fontWeight:700,color:c,lineHeight:1,letterSpacing:'-1px'}}>{v}</div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:4,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct">Players ({filtered.length})</span>
          <div style={{position:'relative'}}>
            <input className="fi" style={{width:210,paddingLeft:32,padding:'7px 12px 7px 32px'}} placeholder="Search…" value={search} onChange={e=>{setSearch(e.target.value);setSel(null);}}/>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--tx4)',fontSize:14}}>🔍</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 20px',borderBottom:'1px solid var(--line)',flexWrap:'wrap'}}>
          <SportFilt val={sport} onChange={s=>{setSport(s);setSel(null);}}/>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            {[['all','All'],['available','Available'],['sold','Sold']].map(([k,l])=>(
              <button key={k} className={`sf${status===k?' on':''}`} onClick={()=>{setStatus(k);setSel(null);}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:sel?'1fr 300px':'1fr'}}>
          <div className="pgrid" style={{borderRight:sel?'1px solid var(--line)':'none'}}>
            {filtered.map(p=>{
              const t=p.teamId||{};const ini=p.name.split(' ').map(w=>w[0]).join('').substring(0,2);
              return (
                <div key={p._id} className={`pcard${sel===p._id?' sel':''}`} onClick={()=>setSel(sel===p._id?null:p._id)}>
                  <div className="pav" style={{background:t.color||'#555'}}>{ini}</div>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{p.name}</div>
                  <div style={{fontSize:11,color:'var(--tx3)',marginBottom:8}}>{p.department}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center',marginBottom:7}}>
                    {p.sports.map(s=><span key={s} className="stag">{SI[s]}</span>)}
                    {p.skillLevel&&<span className="sktag">{p.skillLevel}</span>}
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:p.status==='available'?'var(--blue)':p.status==='sold'?'var(--grn)':'var(--tx3)',display:'flex',alignItems:'center',justifyContent:'center',gap:4,textTransform:'uppercase',letterSpacing:'.5px'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:p.status==='available'?'var(--blue)':p.status==='sold'?'var(--grn)':'var(--tx4)'}}/>
                    {p.status==='available'?'Available':p.status==='sold'?t.name||'Sold':'Unsold'}
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div className="empty" style={{gridColumn:'1/-1'}}><div className="ei">🔍</div><div className="eh">No players found</div></div>}
          </div>
          {sel&&player&&(
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:14,background:'var(--card2)'}}>
              <div style={{display:'flex',justifyContent:'flex-end'}}><button className="btn btn-dk btn-xs" onClick={()=>setSel(null)}>✕ Close</button></div>
              <div style={{textAlign:'center'}}>
                <div className="pav" style={{background:pt?.color||'#555',width:64,height:64,fontSize:22,margin:'0 auto 12px'}}>{player.name.split(' ').map(w=>w[0]).join('').substring(0,2)}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'-.3px'}}>{player.name}</div>
                <div style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>{player.department}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[['Status',player.status],['Base',`${player.basePrice} pts`],['Bid',player.bidPrice?`${player.bidPrice} pts`:'—'],['Skill',player.skillLevel||'—']].map(([l,v])=>(
                  <div key={l} style={{background:'var(--card3)',padding:'10px 12px',borderRadius:'var(--r)',border:'1px solid var(--line)'}}>
                    <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,fontWeight:700}}>{l}</div>
                    <div style={{fontWeight:600,fontSize:13,textTransform:'capitalize'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {player.sports.map(s=><span key={s} className="stag" style={{fontSize:11,padding:'4px 9px'}}>{SI[s]} {s.replace('_',' ')}</span>)}
              </div>
              {pt&&<div style={{background:`${pt.color}18`,border:`1.5px solid ${pt.color}35`,borderRadius:'var(--r-lg)',padding:14,display:'flex',alignItems:'center',gap:12}}>
                <TL color={pt.color} abbr={pt.abbreviation} size={36}/>
                <div><div style={{fontWeight:700,fontSize:14}}>{pt.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{pt.department}</div></div>
              </div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
