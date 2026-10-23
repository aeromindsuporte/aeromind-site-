'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Atualiza somente as telas administrativas enquanto a aba estiver visível.
 * Não envia notificações externas e não altera dados do cliente. */
export function AdminAlertsRefresh(){
 const router=useRouter();
 useEffect(()=>{
  const timer=window.setInterval(()=>{
   if(document.visibilityState==='visible')router.refresh();
  },90000);
  return ()=>window.clearInterval(timer);
 },[router]);
 return null;
}
