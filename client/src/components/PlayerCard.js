import React,{useState,useEffect,useRef} from 'react';
import { SportIcon } from './Shared';

const SPORT_COLOR={cricket:'#e74c3c',football:'#27ae60',badminton:'#8e44ad',table_tennis:'#2980b9',carrom:'#d35400'};

// ── Cinematic flip card ───────────────────────────────────────────
// phase: hidden → facedown → flipping → revealed
export function PlayerFlipCard({player, bidPulse=false, autoReveal=true}){
  const [phase,setPhase]=useState(autoReveal?'hidden':'revealed');
  const prevId=useRef(null);

  useEffect(()=>{
    if(!player||!autoReveal) return;
    if(player._id!==prevId.current){
      prevId.current=player._id;
      setPhase('hidden');
      setTimeout(()=>setPhase('facedown'), 60);
      setTimeout(()=>setPhase('flipping'),  500);
      setTimeout(()=>setPhase('revealed'),  1100);
    }
  },[player?._id, autoReveal]);

  if(!player) return null;
  const initials=player.name?.split(' ').map(w=>w[0]).join('').substring(0,2)||'?';
  const sportColor=SPORT_COLOR[player.sports?.[0]]||'#e74c3c';
  const isRevealed=phase==='revealed';
  const isFlipping=phase==='flipping';

  return(
    <div style={{perspective:600,width:140,margin:'0 auto'}}>
      <style>{`
        @keyframes card-flip{
          0%  {transform:rotateY(0deg)}
          49% {transform:rotateY(90deg)}
          50% {transform:rotateY(90deg)}
          100%{transform:rotateY(0deg)}
        }
        @keyframes card-drop{
          0%  {transform:translateY(-30px) scale(.9);opacity:0}
          60% {transform:translateY(4px) scale(1.02);opacity:1}
          100%{transform:translateY(0) scale(1);opacity:1}
        }
        @keyframes shimmer-scan{
          0%  {top:-40%}
          100%{top:140%}
        }
        .card-flip-anim{animation:card-flip .65s cubic-bezier(.4,0,.2,1) forwards}
        .card-drop-anim{animation:card-drop .4s cubic-bezier(.22,1,.36,1) forwards}
      `}</style>

      <div className={phase==='facedown'?'card-drop-anim':isFlipping?'card-flip-anim':''}
        style={{
          width:140,minHeight:200,borderRadius:14,
          position:'relative',overflow:'hidden',
          opacity:phase==='hidden'?0:1,
          transition:isRevealed?'box-shadow .3s':'none',
          boxShadow:isRevealed
            ?(bidPulse?`0 0 0 3px var(--gold), 0 0 40px var(--gold-glow)`:`0 0 24px ${sportColor}66`)
            :'0 8px 32px rgba(0,0,0,.5)',
          background:isRevealed
            ?`linear-gradient(135deg, ${sportColor}22 0%, var(--card) 60%)`
            :`linear-gradient(135deg, #1a1a2e, #16213e)`,
          border:isRevealed?`1.5px solid ${sportColor}88`:'1.5px solid rgba(255,255,255,.08)',
        }}>

        {/* Face down */}
        {!isRevealed&&(
          <div style={{padding:20,height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
            <div style={{fontSize:36,opacity:.3}}>⚡</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:3,width:'100%',opacity:.15}}>
              {Array.from({length:16}).map((_,i)=>(
                <div key={i} style={{height:8,borderRadius:2,background:'rgba(255,255,255,.6)'}}/>
              ))}
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.2)',letterSpacing:'2px',textTransform:'uppercase',marginTop:4}}>Player</div>
          </div>
        )}

        {/* Face up */}
        {isRevealed&&(
          <div style={{padding:'16px 14px',textAlign:'center'}}>
            {/* Shimmer sweep */}
            <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,overflow:'hidden',pointerEvents:'none',borderRadius:14}}>
              <div style={{
                position:'absolute',left:'-20%',width:'40%',height:'100%',
                background:'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)',
                animation:'shimmer-scan .6s ease-out forwards',
              }}/>
            </div>
            {/* Avatar */}
            <div style={{
              width:64,height:64,borderRadius:'50%',margin:'0 auto 10px',
              background:`radial-gradient(circle at 35% 35%, ${sportColor}, ${sportColor}88)`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:'#fff',
              border:`2.5px solid ${sportColor}`,
              boxShadow:`0 0 20px ${sportColor}66`,
            }}>{initials}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,letterSpacing:'-.3px',lineHeight:1.2}}>{player.name}</div>
            <div style={{color:'var(--tx3)',fontSize:10,marginTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{player.department}</div>
            <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
              {(player.sports||[]).map(s=><span key={s} className="stag" style={{fontSize:10,padding:'2px 7px', display: 'flex', alignItems: 'center'}}><SportIcon sport={s} style={{fontSize: 12, marginRight: 3}}/> {s.replace('_',' ')}</span>)}
            </div>
            {player.skillLevel&&<div style={{marginTop:6,fontSize:9,color:sportColor,textTransform:'uppercase',letterSpacing:'1.5px',fontWeight:700}}>{player.skillLevel}</div>}
            <div style={{marginTop:10,padding:'5px 14px',background:'rgba(0,0,0,.3)',borderRadius:'var(--r)',display:'inline-block',fontSize:11,border:'1px solid rgba(255,255,255,.08)'}}>
              Base <strong style={{color:'var(--gold)',fontFamily:"'JetBrains Mono',monospace"}}>{player.basePrice}</strong> pts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WhatsApp share card ───────────────────────────────────────────
export function WhatsAppShareCard({title, lines, hashtags=[], buttonLabel='📲 Share / Copy'}){
  const [copied,setCopied]=useState(false);
  const text=[title,'', ...lines, '', hashtags.map(h=>`#${h}`).join(' ')].join('\n').trim();

  const share=()=>{
    if(navigator.share){
      navigator.share({text,title}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=>{
        setCopied(true);
        setTimeout(()=>setCopied(false),2500);
      });
    }
  };

  return(
    <div className="card">
      <div className="ch"><span className="ct">📤 Share</span></div>
      <div style={{padding:'12px 16px 16px'}}>
        <div style={{
          background:'#0d1f16',border:'1px solid #1a3a22',borderRadius:10,
          padding:'14px 16px',fontFamily:'monospace',fontSize:12,
          whiteSpace:'pre-wrap',color:'#dcfce7',lineHeight:1.7,
          marginBottom:12,maxHeight:220,overflowY:'auto',
        }}>{text}</div>
        <button onClick={share} style={{
          width:'100%',padding:'12px 0',
          background:copied?'#128C7E':'#25D366',
          color:'#fff',border:'none',borderRadius:8,
          fontWeight:700,fontSize:14,cursor:'pointer',
          letterSpacing:'.3px',transition:'background .2s',
        }}>
          {copied?'✅ Copied to clipboard!':buttonLabel}
        </button>
      </div>
    </div>
  );
}
