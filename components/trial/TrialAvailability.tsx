'use client';

import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';

type Props={slug:string;initialRemaining:number|null};
export function TrialAvailability({slug,initialRemaining}:Props){
 const [remaining,setRemaining]=useState<number|null>(initialRemaining);
 const latest=useRef<number|null>(initialRemaining);
 const router=useRouter();

 useEffect(()=>{
  let active=true;
  const client=createClient();
  const readSlots=async()=>{
   if(typeof document!=='undefined'&&document.visibilityState==='hidden')return;
   try{
    const {data,error}=await client.rpc('aeromind_public_free_trial_slots',{p_slug:slug});
    if(!active||error||typeof data!=='number'||!Number.isInteger(data)||data<0)return;
    setRemaining(data);
    if(latest.current!==data){
     latest.current=data;
     router.refresh();
    }
   }catch{
    // Em caso de desconexão, mantenha somente o último dado fornecido pelo servidor.
   }
  };
  const handleFocus=()=>{void readSlots();};
  const poll=window.setInterval(()=>{void readSlots();},25000);
  window.addEventListener('focus',handleFocus);
  return ()=>{active=false;window.clearInterval(poll);window.removeEventListener('focus',handleFocus);};
 },[router,slug]);

 const isEmpty=remaining===0;
 return <section className={'trial-scarcity'+(isEmpty?' trial-scarcity-empty':'')} aria-label="Disponibilidade do teste gratuito">
   <div className="trial-scarcity-main">
    <div className="trial-stopwatch" aria-hidden="true">
      <svg viewBox="0 0 96 116" width="94" height="113" fill="none">
       <path d="M34 7h28M48 7v16M73 24l10-9" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
       <circle cx="48" cy="66" r="37" stroke="currentColor" strokeWidth="7"/>
       <path d="M48 42v25l17 11" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <div className="trial-scarcity-copy">
     <span className="trial-scarcity-tag">DISPONIBILIDADE LIMITADA</span>
     <h2>{isEmpty?'O lote atual foi preenchido.':'As ativações gratuitas são liberadas em lotes.'}</h2>
     <p>{isEmpty?'Novas ativações dependerão da abertura de outro lote. Consulte os planos disponíveis.':'Se houver vaga disponível agora, garanta a sua o quanto antes.'}</p>
    </div>
    <div className="trial-slots-circle" role="status" aria-live="polite">
     <svg className="trial-chrono-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle className="trial-chrono-track" cx="50" cy="50" r="42" fill="none" strokeWidth="1.7"/>
      {Array.from({length:24},(_,i)=><line key={i}
       className={i%6===0?'trial-chrono-tick trial-chrono-tick-major':'trial-chrono-tick'}
       x1="50" y1={i%6===0?"4":"6"} x2="50" y2={i%6===0?"12":"10"}
       transform={`rotate(${i*15} 50 50)`}/>)}
      <g className="trial-chrono-sweep">
       <circle cx="50" cy="50" r="42" fill="none" stroke="#FFB6E1"
        strokeWidth="4.5" strokeLinecap="round" strokeDasharray="112 152"/>
       <circle cx="50" cy="8" r="3.4" fill="#FFF6FC"/>
      </g>
     </svg>
     <div className="trial-slots-inner" key={remaining===null?'unknown':remaining}>
      <span className="trial-slots-person" aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="10" cy="7" r="4"/><path d="M2 20v-2a8 8 0 0 1 16 0v2Z"/><circle cx="19" cy="8" r="3"/><path d="M19 14a6 6 0 0 1 4 6h-3v-2a10 10 0 0 0-1-4Z"/></svg></span>
      <strong>{remaining===null?'—':remaining}</strong>
      <small>{remaining===null?'Disponibilidade sob consulta':remaining===0?'Vagas esgotadas':'ativações disponíveis agora'}</small>
     </div>
    </div>
   </div>
   <div className="trial-scarcity-footer">
    <span className="trial-users-icon" aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="10" cy="7" r="4"/><path d="M2 20v-2a8 8 0 0 1 16 0v2Z"/><circle cx="19" cy="8" r="3"/><path d="M19 14a6 6 0 0 1 4 6h-3v-2a10 10 0 0 0-1-4Z"/></svg></span>
    <p>{isEmpty?'Lote encerrado':remaining===null?'Consulta de disponibilidade na ativação':'Vagas reais, atualizadas após cada ativação'} <span aria-hidden="true">•</span> Liberação por ordem de ativação</p>
   </div>
  </section>;
}
