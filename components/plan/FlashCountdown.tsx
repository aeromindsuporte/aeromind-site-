'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

/** Prazo verdadeiro; não cria escassez fictícia. Atualiza preço exibido ao expirar. */
export function FlashCountdown({endsAt,label}:{endsAt:string;label:string}){
 const router=useRouter();
 const [left,setLeft]=useState<number|null>(null);
 useEffect(()=>{
  const end=new Date(endsAt).getTime();
  let expired=false;
  const tick=()=>{
   const ms=Math.max(0,end-Date.now());
   setLeft(ms);
   if(ms===0&&!expired){expired=true;router.refresh();}
  };
  tick();
  const interval=window.setInterval(tick,30000);
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('focus',tick);
  return ()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',tick);window.removeEventListener('focus',tick);};
 },[endsAt,router]);
 if(left===0)return null;
 const days=left===null?null:Math.floor(left/86400000);
 const hours=left===null?null:Math.floor(left%86400000/3600000);
 const minutes=left===null?null:Math.ceil(left%3600000/60000);
 return <div className="am-flash-countdown" role="timer" aria-label="Prazo da oferta de lançamento">
  <strong>⚡ {label||'Oferta relâmpago'}</strong>
  <span>{left===null?'Oferta com prazo definido':days?days+'d '+hours+'h restantes':hours?hours+'h '+minutes+'min restantes':minutes+'min restantes'}</span>
  <small>Termina {new Date(endsAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} (Brasília)</small>
 </div>;
}
