'use client';

import Link from 'next/link';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {createClient} from '@/lib/supabase/browser';

const LandingSessionContext=createContext(false);

/** A landing continua pública e rápida: checamos a sessão uma vez no navegador. */
export function LandingSessionLinks({children}:{children:ReactNode}){
 const [signedIn,setSignedIn]=useState(false);
 const supabase=useMemo(()=>createClient(),[]);
 useEffect(()=>{
  let mounted=true;
  let lastRequest=0;
  async function checkUser(){
   const request=++lastRequest;
   try{
    const {data:{user},error}=await supabase.auth.getUser();
    if(mounted&&request===lastRequest)setSignedIn(Boolean(user)&&!error);
   }catch{
    if(mounted&&request===lastRequest)setSignedIn(false);
   }
  }
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT'){
    ++lastRequest;
    if(mounted)setSignedIn(false);
   }else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED'){
    // Supabase recomenda não aguardar chamadas Auth dentro deste callback.
    window.setTimeout(()=>{if(mounted)void checkUser();},0);
   }
  });
  void checkUser();
  return ()=>{mounted=false;++lastRequest;subscription.unsubscribe();};
 },[supabase]);
 return <LandingSessionContext.Provider value={signedIn}>{children}</LandingSessionContext.Provider>;
}

/** Mostra o acesso à conta sem trocar o destino dos CTAs de visitantes. */
export function LandingAccountLink({guestHref,guestLabel,className,prefix,suffix}:{
 guestHref:string;guestLabel:string;className?:string;prefix?:ReactNode;suffix?:ReactNode;
}){
 const signedIn=useContext(LandingSessionContext);
 return <Link href={signedIn?'/minha-conta':guestHref} className={className}>
  {prefix}{signedIn?'Minha conta':guestLabel}{suffix}
 </Link>;
}
