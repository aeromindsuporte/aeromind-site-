'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

/** Feedback instantâneo sem bloquear links, formulários ou Server Actions. */
export function SiteInteractionFeedback(){
 const pathname=usePathname();
 const searchParams=useSearchParams();
 const [pending,setPending]=useState(false);
 const [label,setLabel]=useState('Carregando...');
 const timeout=useRef<number|null>(null);
 const routeKey=pathname+'?'+searchParams.toString();

 useEffect(()=>{
  setPending(false);
  if(timeout.current!==null){window.clearTimeout(timeout.current);timeout.current=null;}
 },[routeKey]);

 useEffect(()=>{
  const begin=(message:string)=>{
   setLabel(message);
   setPending(true);
   if(timeout.current!==null)window.clearTimeout(timeout.current);
   // Impede estado preso quando a rede falha ou o destino não muda.
   timeout.current=window.setTimeout(()=>{setPending(false);timeout.current=null;},15000);
  };
  const handleClick=(event:MouseEvent)=>{
   if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.defaultPrevented)return;
   if(!(event.target instanceof Element))return;
   const anchor=event.target.closest<HTMLAnchorElement>('a[href]');
   if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self')||anchor.getAttribute('aria-disabled')==='true')return;
   let target:URL;
   try{target=new URL(anchor.href,window.location.href);}catch{return;}
   if(target.origin!==window.location.origin)return;
   const current=new URL(window.location.href);
   if(target.pathname===current.pathname&&target.search===current.search)return;
   begin('Abrindo página...');
  };
  const handleSubmit=(event:Event)=>{
   if(!(event.target instanceof HTMLFormElement))return;
   const form=event.target;
   if(!form.checkValidity()||form.dataset.feedback==='off'||!form.hasAttribute('action'))return;
   form.classList.add('am-form-submitting');
   begin('Processando solicitação...');
   // Se a ação tratar o resultado sem navegação, devolve o estado visual.
   window.setTimeout(()=>form.classList.remove('am-form-submitting'),15000);
  };
  const stop=()=>{setPending(false);if(timeout.current!==null){window.clearTimeout(timeout.current);timeout.current=null;}};
  document.addEventListener('click',handleClick,true);
  document.addEventListener('submit',handleSubmit,true);
  window.addEventListener('pageshow',stop);
  window.addEventListener('popstate',stop);
  return ()=>{
   document.removeEventListener('click',handleClick,true);
   document.removeEventListener('submit',handleSubmit,true);
   window.removeEventListener('pageshow',stop);
   window.removeEventListener('popstate',stop);
   if(timeout.current!==null)window.clearTimeout(timeout.current);
  };
 },[]);

 return <div className={'am-interaction-feedback'+(pending?' is-active':'')} aria-live="polite" aria-atomic="true">
  <div className="am-page-progress" aria-hidden="true"><span/></div>
  {pending&&<div className="am-interaction-status"><span className="am-interaction-spinner" aria-hidden="true"/>{label}</div>}
 </div>;
}
