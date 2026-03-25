import React,{useState,useEffect} from 'react';
import { createPortal } from 'react-dom';
import {NavLink} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export const SportIcon = ({ sport, style={} }) => {
  const s = { fontSize: 'inherit', verticalAlign: 'middle', ...style };
  if (!sport) return <HelpOutlineIcon style={s} />;
  const sp = sport.toLowerCase();
  if (sp.includes('cricket')) return <SportsCricketIcon style={s} />;
  if (sp.includes('football') || sp.includes('soccer')) return <SportsSoccerIcon style={s} />;
  if (sp.includes('badminton') || sp.includes('tennis')) return <SportsTennisIcon style={s} />;
  return <EmojiEventsIcon style={s} />;
};

export const TL=({color='#444',abbr='?',size=32,sq=false})=>(
  <div className={`tl${sq?' tl-sq':''}`}
    style={{background:color,width:size,height:size,fontSize:size*.34,
      boxShadow:`0 2px 8px ${color}55`}}>{abbr}</div>
);

export const FormDots=({form=[]})=>(
  <div className="form-dots">
    {form.slice(-5).map((f,i)=><div key={i} className={`fd ${f==='W'?'fd-w':'fd-l'}`}>{f}</div>)}
  </div>
);

export const Ldr=({txt='Loading…'})=>(
  <div className="ldr"><div className="spin"/><span style={{color:'var(--tx3)',fontSize:13}}>{txt}</span></div>
);

export const SportFilt=({val,onChange})=>(
  <div className="sfs">
    {['all','cricket','football','badminton','table_tennis','carrom']
      .map((k)=>(
        <button key={k} className={`sf${val===k?' on':''}`} onClick={()=>onChange(k)}>
          {k !== 'all' && <SportIcon sport={k} style={{marginRight: 4}} />}
          {k.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </button>
      ))}
  </div>
);

export const MatchRow=({match,onClick})=>{
  const t1=match.team1Id||{};
  const t2=match.team2Id||{};
  const live=match.status==='live';
  const done=match.status==='completed';
  const wid=match.winnerId?._id||match.winnerId;
  const s1=String(match.team1Score||'0');
  const s2=String(match.team2Score||'0');
  const isLong = s1.length>3 || s2.length>3;
  return (
    <div className={`mrow${live?' is-live':''}`} onClick={()=>onClick&&onClick(match)}>
      <div className="mt">
        <div className="mt-team">
          <TL color={t1.color} abbr={t1.abbreviation} size={28}/>
          <div style={{minWidth: 0}}>
            <div className={`mt-name${done&&wid===t1._id?' w':''}`}>{t1.name||'—'}</div>
            <div style={{fontSize:10,color:'var(--tx4)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{match.round}</div>
          </div>
        </div>
        <div className="mt-score-wrap">
          <div className="mt-score" style={isLong ? {fontSize: 15, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', whiteSpace: 'nowrap'} : {}}>
            {live||done ? (
              isLong ? (
                <>
                  <span>{s1}</span>
                  <div style={{fontSize: 9, color: 'var(--tx4)', background: 'var(--card3)', padding: '1px 4px', borderRadius: 2, lineHeight: 1}}>VS</div>
                  <span>{s2}</span>
                </>
              ) : `${s1} – ${s2}`
            ) : 'vs'}
          </div>
          <span className="mt-sport" style={{marginTop: 6}}><SportIcon sport={match.sport} style={{fontSize: 14, marginRight: 4}} /> {match.sport?.replace('_',' ').toUpperCase()}</span>
        </div>
        <div className="mt-team r">
          <TL color={t2.color} abbr={t2.abbreviation} size={28}/>
          <div style={{textAlign:'right', minWidth: 0}}>
            <div className={`mt-name${done&&wid===t2._id?' w':''}`}>{t2.name||'—'}</div>
            <div style={{fontSize:10,color:'var(--tx4)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{match.matchTime} · {match.venue}</div>
          </div>
        </div>
      </div>
      <div className="mt-meta">
        {live&&<span className="s-live">● LIVE</span>}
        {!live&&<span className={done?'s-done':'s-soon'}>{done?'Final':'Soon'}</span>}
        {done&&match.winnerId&&<div style={{fontSize:10,marginTop:2,color:'var(--tx3)'}}>{match.winnerId.name||''} won</div>}
      </div>
    </div>
  );
};

export const Navbar=({onAuth})=>{
  const {user,isAdmin,teamId,signOut,role}=useAuth();
  const [cd,setCd]=useState({d:'--',h:'--',m:'--'});
  useEffect(()=>{
    const t=()=>{const d=new Date('2026-03-30T10:00:00')-new Date();if(d>0)setCd({d:String(Math.floor(d/86400000)).padStart(2,'0'),h:String(Math.floor((d%86400000)/3600000)).padStart(2,'0'),m:String(Math.floor((d%3600000)/60000)).padStart(2,'0')});};
    t();const i=setInterval(t,30000);return()=>clearInterval(i);
  },[]);
  return (
    <nav className="topbar">
      <NavLink to="/" className="logo">
        <div className="logo-mark">⚡</div>
        CTO DT LEAGUE
        <span className="logo-s2">S2</span>
      </NavLink>
      <div className="navs">
        {[
          ['/',       '🏠','Home'],
          ['/tournaments','🏆','Tournaments'],
          ['/matches','📅','Matches'],
          ['/standings','📊','Standings'],
          ['/teams',  '👥','Teams'],
          ['/players','🏃','Players'],
          ['/auction','🔨','Auction'],
          ['/fantasy','⭐','Fantasy'],
          ['/register','📝','Register'],
          ...(user && teamId ? [['/my-team','🛡️','My Team']] : []),
          ...(isAdmin ? [['/admin','⚙️','Admin']] : []),
        ].map(([to,ic,lb])=>(
          <NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`nl${isActive?' active':''}`}>
            {ic} <span className="nlb">{lb}</span>
          </NavLink>
        ))}
      </div>
      <div className="nav-right">
        <span style={{color:'var(--tx4)',fontSize:11,whiteSpace:'nowrap'}}>Eval {cd.d}d {cd.h}h</span>
        {user?(
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span className={`role-chip role-${role}`}>{role.replace('_',' ')}</span>
            <span style={{fontSize:12,color:'var(--tx2)',maxWidth:88,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</span>
            <button className="btn btn-dk btn-sm" onClick={signOut}>Out</button>
          </div>
        ):(
          <button className="btn btn-p btn-sm" onClick={onAuth}>Sign in</button>
        )}
      </div>
    </nav>
  );
};

export const AuthModal=({onClose})=>{
  const {signIn,signUp}=useAuth();
  const [mode,setMode]=useState('login');
  const [form,setForm]=useState({name:'',email:'',password:'',role:'viewer'});
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);
  const go=async()=>{
    setErr('');setBusy(true);
    const {error}=mode==='login'?await signIn(form.email,form.password):await signUp({name:form.name,email:form.email,password:form.password,role:form.role});
    setBusy(false);if(error)setErr(error);else onClose();
  };
  return createPortal(
    <div className="mo" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mb">
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
          <div style={{width:42,height:42,borderRadius:9,background:'linear-gradient(135deg,var(--red),var(--red2))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,boxShadow:'0 0 16px var(--red-glow)',flexShrink:0}}>⚡</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.3px'}}>{mode==='login'?'Welcome back':'Join the league'}</div>
            <div style={{fontSize:12,color:'var(--tx3)',marginTop:1}}>CTO DT League · Season 2</div>
          </div>
        </div>
        <div className="al al-in" style={{fontSize:12,marginBottom:14}}>Demo: admin@lol.com / admin123 · owner1@lol.com / owner123</div>
        {err&&<div className="al al-er">{err}</div>}
        {mode==='register'&&<>
          <div className="fg"><label className="fl">Full name</label><input className="fi" placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div className="fg"><label className="fl">Role</label>
            <select className="fs" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="viewer">Viewer</option><option value="team_owner">Team Owner</option><option value="captain">Captain</option><option value="admin">Admin</option>
            </select>
          </div>
        </>}
        <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="you@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} onKeyDown={e=>e.key==='Enter'&&go()}/></div>
        <button className="btn btn-p btn-full btn-lg" style={{marginBottom:12}} onClick={go} disabled={busy}>
          {busy?<><div className="spin spin-sm"/>Wait…</>:mode==='login'?'Sign in →':'Create account →'}
        </button>
        <p style={{textAlign:'center',fontSize:13,color:'var(--tx3)'}}>
          {mode==='login'?'No account? ':'Have one? '}
          <button className="clink" onClick={()=>{setMode(m=>m==='login'?'register':'login');setErr('');}}>
            {mode==='login'?'Register':'Sign in'}
          </button>
        </p>
      </div>
    </div>,
    document.body
  );
};
