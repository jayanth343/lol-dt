import React,{useState,useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {MatchRow,Ldr,SportFilt} from '../components/Shared';
import {apiMatches,getSocket} from '../lib/api';
export default function Matches(){
  const nav=useNavigate();
  const [matches,setMatches]=useState([]);
  const [sport,setSport]=useState('all');
  const [tab,setTab]=useState('all');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{apiMatches().then(d=>{setMatches(Array.isArray(d)?d:[]);setLoading(false);});},[]); 
  useEffect(()=>{const s=getSocket();const h=({matchId,team1Score,team2Score,status})=>setMatches(p=>p.map(m=>m._id===matchId?{...m,team1Score,team2Score,status}:m));s.on('match:score',h);return()=>s.off('match:score',h);},[]);
  const filtered=matches.filter(m=>(sport==='all'||m.sport===sport)&&(tab==='all'||m.status===tab));
  const grouped=filtered.reduce((a,m)=>{const k=new Date(m.matchDate).toDateString();if(!a[k])a[k]=[];a[k].push(m);return a;},{});
  if(loading) return <div className="pg"><Ldr/></div>;
  return (
    <div className="pg fade-up">
      <div className="card">
        <div className="ch"><span className="ct">Match schedule — Season 2</span><span style={{fontSize:12,color:'var(--tx3)'}}>{filtered.length} matches</span></div>
        <SportFilt val={sport} onChange={setSport}/>
        <div className="stabs">
          {[['all','All'],['live','● Live'],['upcoming','Upcoming'],['completed','Results']].map(([k,l])=>(
            <button key={k} className={`stab${tab===k?' on':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        {Object.entries(grouped).map(([date,ms])=>(
          <div key={date}>
            <div className="sdl">{new Date(date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
            {ms.map(m=><MatchRow key={m._id} match={m} onClick={()=>nav(`/matches/${m._id}`)}/>)}
          </div>
        ))}
        {filtered.length===0&&<div className="empty"><div className="ei">📅</div><div className="eh">No matches found</div></div>}
      </div>
    </div>
  );
}
