import React,{useState} from 'react';
import {getSocket} from '../lib/api';
export default function ScorerPanel({match}){
  const s=getSocket();const sp=match.sport;
  const t1=match.team1Id||{};const t2=match.team2Id||{};
  const [batter,setBatter]=useState('');const [bowler,setBowler]=useState('');
  const [min,setMin]=useState('');const [scorer,setScorer]=useState('');
  const emit=(e,d)=>s.emit(e,{matchId:match._id,...d});
  const BB=(runs,extra,label,bg,tc='#fff')=>(
    <button key={label} className="sball" style={{background:bg,color:tc}} onClick={()=>emit('cricket:ball',{runs,extra,batter,bowler,description:''})}>{label}</button>
  );
  return (
    <div className="scorer">
      <div className="scorer-head">
        <div style={{width:8,height:8,borderRadius:'50%',background:'var(--red)',animation:'livePulse 2s infinite'}}/>
        <span style={{fontWeight:700,fontSize:13,color:'var(--tx)',textTransform:'uppercase',letterSpacing:'1px'}}>Live scorer</span>
        <span style={{marginLeft:'auto',fontSize:11,color:'var(--tx4)'}}>Admin only</span>
      </div>
      <div className="scorer-body">
        {sp==='cricket'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            {[['Batter',batter,setBatter],['Bowler',bowler,setBowler]].map(([l,v,sv])=>(
              <div key={l}>
                <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,fontWeight:700}}>{l}</div>
                <input className="sinp" placeholder={l+' name'} value={v} onChange={e=>sv(e.target.value)}/>
              </div>
            ))}
          </div>
          <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8,fontWeight:700}}>Runs</div>
          <div className="sbg" style={{marginBottom:12}}>
            {BB(0,'','0','rgba(255,255,255,.07)','var(--tx3)')}
            {BB(1,'','1','rgba(255,255,255,.1)','var(--tx2)')}
            {BB(2,'','2','rgba(255,255,255,.1)','var(--tx2)')}
            {BB(3,'','3','rgba(255,255,255,.1)','var(--tx2)')}
            {BB(4,'four','4','var(--grn)')}
            {BB(6,'six','6','var(--red)')}
          </div>
          <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8,fontWeight:700}}>Extras & events</div>
          <div className="sbg" style={{marginBottom:16}}>
            {BB(1,'wide','Wide','var(--gold)','#000')}
            {BB(1,'noball','No ball','var(--gold)','#000')}
            {BB(0,'wicket','OUT!','var(--red)')}
          </div>
          <button className="btn btn-dk btn-full" style={{marginBottom:8,fontSize:12}} onClick={()=>emit('cricket:innings2',{})}>⟳ Start 2nd innings</button>
          <button className="btn btn-ng btn-full" onClick={()=>emit('match:setStatus',{status:'completed'})}>✓ End match</button>
        </>}
        {sp==='football'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            {[['Scorer',scorer,setScorer,'Player'],['Minute',min,setMin,'e.g. 45']].map(([l,v,sv,ph])=>(
              <div key={l}>
                <div style={{fontSize:9,color:'var(--tx4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:4,fontWeight:700}}>{l}</div>
                <input className="sinp" placeholder={ph} value={v} onChange={e=>sv(e.target.value)}/>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[t1,t2].map(t=>(
              <button key={t._id} className="sball" style={{background:t.color||'#555',color:'#fff',padding:'16px 8px',fontSize:15}} onClick={()=>emit('football:goal',{teamId:t._id,player:scorer,minute:Number(min),type:'goal'})}>⚽ {t.abbreviation}</button>
            ))}
          </div>
          <button className="btn btn-ng btn-full" onClick={()=>emit('match:setStatus',{status:'completed'})}>✓ Full time</button>
        </>}
        {['badminton','table_tennis','carrom'].includes(sp)&&<>
          <div style={{fontSize:12,color:'var(--tx4)',marginBottom:14,textAlign:'center'}}>Tap to add a point</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[t1,t2].map(t=>(
              <button key={t._id} className="sball" style={{background:t.color||'#555',color:'#fff',padding:'20px 8px',fontSize:20}} onClick={()=>emit('points:add',{teamId:t._id})}>+1 {t.abbreviation}</button>
            ))}
          </div>
          <button className="btn btn-ng btn-full" onClick={()=>emit('match:setStatus',{status:'completed'})}>✓ End match</button>
        </>}
      </div>
    </div>
  );
}
