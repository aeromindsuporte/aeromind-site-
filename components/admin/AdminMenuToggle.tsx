'use client';
import {useEffect,useRef,useState} from 'react';

const MOBILE_QUERY='(max-width: 1050px)';

/** Controle único do menu administrativo. Não navega nem remonta páginas ou formulários. */
export function AdminMenuToggle(){
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{
  const root=document.querySelector<HTMLElement>('.admin-root');
  if(!root)return;
  root.classList.toggle('admin-nav-open',open);
  const previousOverflow=document.body.style.overflow;
  if(open&&window.matchMedia(MOBILE_QUERY).matches)document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&open){
    setOpen(false);
    trigger.current?.focus();
   }
  };
  const nav=document.getElementById('admin-navigation');
  const onNavClick=(event:MouseEvent)=>{
   if((event.target as HTMLElement)?.closest('a,.admin-sidebar-close'))setOpen(false);
  };
  document.addEventListener('keydown',onKey);
  nav?.addEventListener('click',onNavClick);
  return ()=>{
   root.classList.remove('admin-nav-open');
   document.body.style.overflow=previousOverflow;
   document.removeEventListener('keydown',onKey);
   nav?.removeEventListener('click',onNavClick);
  };
 },[open]);
 return <>
  <button ref={trigger} type="button" className="admin-menu-toggle"
    aria-label={open?'Fechar menu administrativo':'Abrir menu administrativo'}
    aria-expanded={open} aria-controls="admin-navigation" onClick={()=>setOpen(value=>!value)}>
    <span className="admin-menu-hamburger" aria-hidden="true"><i/><i/><i/></span>
    <span className="admin-menu-label">{open?'Fechar':'Menu'}</span>
  </button>
  {open&&<button type="button" className="admin-menu-overlay"
    aria-label="Fechar menu administrativo" onClick={()=>setOpen(false)}/>}
 </>;
}
