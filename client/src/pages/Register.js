import React,{useState} from 'react';
import {apiRegisterPlayer} from '../lib/api';
const SPORTS=['cricket','football','badminton','table_tennis','carrom'];
const SL={cricket:'🏏 Cricket',football:'⚽ Football',badminton:'🏸 Badminton',table_tennis:'🏓 Table Tennis',carrom:'🎯 Carrom'};
const DEPTS=['Digital Products','Infrastructure & Cloud','Data & Analytics','Security','Architecture','Delivery & Operations','Mobile Dev','Platform Engineering','Network & Connectivity','Quality Assurance','DevOps & SRE','Product Management','Other'];
export default function Register(){
  const [form,setForm]=useState({name:'',department:'',email:'',contact:'',sports:[],skillLevel:''});
  const [err,setErr]=useState('');const [ok,setOk]=useState(false);const [busy,setBusy]=useState(false);
  const tog=s=>setForm(f=>({...f,sports:f.sports.includes(s)?f.sports.filter(x=>x!==s):[...f.sports,s]}));
  const go=async()=>{
    setErr('');
    if(!form.name.trim()) return setErr('Full name required');
    if(!form.department) return setErr('Department required');
    if(!form.sports.length) return setErr('Select at least one sport');
    setBusy(true);const res=await apiRegisterPlayer(form);setBusy(false);
    if(res.error) return setErr(res.error);setOk(true);
  };
  if(ok) return (
    <div className="pg fade-up" style={{maxWidth:640}}>
      <div className="card" style={{textAlign:'center',padding:56}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'var(--grn-fill)',border:'2px solid var(--grn-bdr)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:32}}>✅</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,marginBottom:8}}>You're in the pool!</div>
        <p style={{color:'var(--tx2)',marginBottom:28}}>Team owners will bid for you during the live auction event.</p>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button className="btn btn-p" onClick={()=>{setOk(false);setForm({name:'',department:'',email:'',contact:'',sports:[],skillLevel:''});}}>Register another</button>
          <a href="/players" className="btn btn-s">View players</a>
        </div>
      </div>
    </div>
  );
  return (
    <div className="pg fade-up" style={{maxWidth:720}}>
      <div className="card" style={{marginBottom:0}}>
        <div className="sc-stripe"/>
        <div style={{padding:'24px 26px 0'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,letterSpacing:'-.5px',marginBottom:4}}>Player Registration</div>
          <div style={{fontSize:13,color:'var(--tx3)',marginBottom:24}}>CTO DT League of Legends · Season 2 · Open to all employees</div>
        </div>
        <div style={{padding:'0 26px 26px'}}>
          {err&&<div className="al al-er">{err}</div>}
          <div className="frow" style={{marginBottom:4}}>
            <div className="fg"><label className="fl">Full name *</label><input className="fi" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="fg"><label className="fl">Department *</label><select className="fs" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}><option value="">Select department</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></div>
            <div className="fg"><label className="fl">Work email</label><input className="fi" type="email" placeholder="you@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div className="fg"><label className="fl">Contact (optional)</label><input className="fi" placeholder="Phone number" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
          </div>
          <div className="fg">
            <label className="fl">Sports *</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {SPORTS.map(s=>{const on=form.sports.includes(s);return (
                <label key={s} style={{display:'flex',alignItems:'center',gap:8,background:on?'var(--red-fill)':'var(--card2)',border:`1.5px solid ${on?'var(--red-bdr)':'var(--line2)'}`,borderRadius:'var(--r)',padding:'9px 15px',cursor:'pointer',fontWeight:on?700:500,color:on?'var(--red)':'var(--tx3)',transition:'all var(--ease)',fontSize:13}}>
                  <input type="checkbox" checked={on} onChange={()=>tog(s)} style={{accentColor:'var(--red)',width:14,height:14}}/>
                  {SL[s]}
                </label>
              );})}
            </div>
          </div>
          <div className="fg">
            <label className="fl">Skill level</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[['Beginner','🌱','40 pts'],['Intermediate','⭐','50 pts'],['Advanced','🔥','60 pts']].map(([sk,ic,hint])=>{const on=form.skillLevel===sk;return (
                <button key={sk} type="button" onClick={()=>setForm({...form,skillLevel:form.skillLevel===sk?'':sk})}
                  style={{padding:'10px 18px',border:`1.5px solid ${on?'var(--gold-bdr)':'var(--line2)'}`,borderRadius:'var(--r)',background:on?'var(--gold-fill)':'var(--card2)',cursor:'pointer',fontWeight:on?700:500,color:on?'var(--gold)':'var(--tx3)',transition:'all var(--ease)',fontSize:13,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  {ic} {sk}<span style={{fontSize:10,opacity:.6}}>{hint}</span>
                </button>
              );})}
            </div>
          </div>
          <div className="al al-in" style={{marginBottom:18}}>After registration you'll be placed in the auction pool. Team owners bid during the live auction — highest bidder wins.</div>
          <button className="btn btn-p btn-full btn-lg" onClick={go} disabled={busy}>
            {busy?<><div className="spin spin-sm"/>Submitting…</>:'Join the League →'}
          </button>
        </div>
      </div>
    </div>
  );
}
