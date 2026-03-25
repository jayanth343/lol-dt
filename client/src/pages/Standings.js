import React,{useState,useEffect} from 'react';
import {TL,FormDots,Ldr,SportIcon} from '../components/Shared';
import {apiStandings,getSocket} from '../lib/api';
const SPORTS=[['cricket','Cricket'],['football','Football'],['badminton','Badminton'],['table_tennis','Table Tennis'],['carrom','Carrom']];
export default function Standings(){
  const [sport,setSport]=useState('cricket');
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const load=s=>{setLoading(true);apiStandings(s).then(d=>{setData(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));};
  useEffect(()=>load(sport),[sport]);
  useEffect(()=>{const s=getSocket();s.on('standings:update',()=>load(sport));return()=>s.off('standings:update');},[sport]);
  return (
    <div className="pg fade-up">
      <div className="sport-sel stagger">
        {SPORTS.map(([k,lb])=>(
          <button key={k} className={`sport-btn${sport===k?' on':''}`} onClick={()=>setSport(k)}>
            <div style={{fontSize:26,marginBottom:6,display:'flex',justifyContent:'center'}}><SportIcon sport={k} style={{fontSize: 26}} /></div>{lb}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="ch">
          <span className="ct" style={{display: 'flex', alignItems: 'center', gap: 6}}><SportIcon sport={SPORTS.find(([k])=>k===sport)?.[0]} style={{fontSize: 20}} /> {SPORTS.find(([k])=>k===sport)?.[1]} — Points table</span>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <div style={{width:8,height:8,borderRadius:1,background:'var(--grn)'}}/><span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px'}}>Top 2 qualify</span>
          </div>
        </div>
        {loading?<Ldr/>:(
          <div style={{overflowX:'auto'}}>
            <table className="pts-tbl" style={{minWidth:540}}>
              <thead><tr>
                <th style={{width:48}}>#</th><th>Team</th>
                <th className="c">M</th><th className="c">W</th><th className="c">L</th>
                <th className="c">Pts</th><th className="c">NRR</th><th className="c">Form</th>
              </tr></thead>
              <tbody>
                {data.map((r,i)=>{
                  const t=r.teamId||{};const nrr=typeof r.nrr==='number'?r.nrr:parseFloat(r.nrr)||0;
                  return (
                    <tr key={r._id} className={i<2?'ql':''}>
                      <td><div style={{display:'flex',alignItems:'center',gap:7}}>
                        {i<2&&<div className="qual-bar"/>}
                        <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:17,color:i===0?'var(--gold)':i===1?'#888':i===2?'#c87533':'var(--tx4)'}}>{i===0?'①':i===1?'②':i===2?'③':i+1}</span>
                      </div></td>
                      <td><div style={{display:'flex',alignItems:'center',gap:10}}>
                        <TL color={t.color} abbr={t.abbreviation} size={32}/>
                        <div>
                          <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                          <div style={{fontSize:10,color:i<2?'var(--grn)':'var(--tx3)',fontWeight:i<2?700:400,marginTop:1}}>{i<2?'Qualifying ✓':t.department||''}</div>
                        </div>
                      </div></td>
                      <td className="c" style={{color:'var(--tx3)'}}>{r.played}</td>
                      <td className="c"><span style={{color:'var(--grn)',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{r.won}</span></td>
                      <td className="c"><span style={{color:'var(--red)',fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{r.lost}</span></td>
                      <td className="c"><span className="pts-badge">{r.points}</span></td>
                      <td className="c"><span style={{color:nrr>=0?'var(--grn)':'var(--red)',fontSize:13,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{nrr>=0?'+':''}{nrr.toFixed(2)}</span></td>
                      <td className="c"><FormDots form={r.form}/></td>
                    </tr>
                  );
                })}
                {data.length===0&&<tr><td colSpan={8}><div className="empty"><div className="ei">📊</div><div className="eh">No data yet</div></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div style={{padding:'9px 20px',borderTop:'1px solid var(--line)',display:'flex',gap:20,fontSize:10,color:'var(--tx4)',flexWrap:'wrap',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
          <span>M=Played</span><span>W=Won</span><span>L=Lost</span><span>Pts=2/win</span><span>NRR=Net run rate</span>
        </div>
      </div>
    </div>
  );
}
