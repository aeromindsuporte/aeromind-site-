'use client';
import {useEffect,useState} from 'react';

/** Só é exibido após o redirect de sucesso confirmado pela função do servidor. */
export function DeviceApprovalToast(){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{
  const timeout=window.setTimeout(()=>setVisible(false),7000);
  return ()=>window.clearTimeout(timeout);
 },[]);
 if(!visible)return null;
 return <div className="am-device-toast" role="status" aria-live="polite">
  <span className="am-device-toast-icon" aria-hidden="true">✓</span>
  <div><strong>Celular autorizado, app liberado!</strong><p>A autorização foi confirmada. Você já pode voltar ao AeroMind no celular.</p></div>
  <button type="button" aria-label="Fechar confirmação" onClick={()=>setVisible(false)}>×</button>
 </div>;
}
