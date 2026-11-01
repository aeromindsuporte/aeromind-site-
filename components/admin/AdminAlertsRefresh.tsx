'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

/** Evita consultas completas durante edição, navegação ou uso contínuo do painel.
 * Os alertas do suporte continuam sendo atualizados pelo seu mecanismo independente. */
export function AdminAlertsRefresh(){
 const router=useRouter();
 useEffect(()=>{
  let lastRefresh=Date.now();
  const refreshOnReturn=()=>{
   if(document.visibilityState!=='visible'||Date.now()-lastRefresh<300000)return;
   // Nunca substitui dados enquanto o usuário preenche algo ou mantém um modal aberto.
   if(document.querySelector('form:focus-within,[role="dialog"],[aria-modal="true"],.am-form-submitting'))return;
   lastRefresh=Date.now();
   router.refresh();
  };
  document.addEventListener('visibilitychange',refreshOnReturn);
  window.addEventListener('focus',refreshOnReturn);
  return ()=>{
   document.removeEventListener('visibilitychange',refreshOnReturn);
   window.removeEventListener('focus',refreshOnReturn);
  };
 },[router]);
 return null;
}
