'use client';
import { useState } from 'react';
export function DownloadButton(){
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 async function download(){
  if(loading)return;
  setLoading(true);setError('');
  try{
    const res=await fetch('/api/apk-link',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store'});
    const data=await res.json() as {url?:string;error?:string};
    if(!res.ok||!data.url){setError(data.error||'Não foi possível obter o download.');return;}
    // Only Supabase Storage links are accepted, never arbitrary server content.
    const candidate=new URL(data.url,window.location.origin);
    const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const internal=candidate.origin===window.location.origin && candidate.pathname==='/api/apk-file' && !candidate.search && !candidate.hash;
    const signed=Boolean(base) && candidate.origin===new URL(base!).origin && candidate.pathname.includes('/storage/v1/object/sign/aeromind-apk-releases/');
    if(!internal&&!signed){
      setError('Endereço de download inválido.');return;
    }
    window.location.assign(candidate.toString());
  }catch{setError('Falha de conexão. Tente novamente.');}
  finally{setLoading(false);}
 }
 return <div><button type="button" className="auth-submit device-download" onClick={download} disabled={loading}>
 {loading?'Preparando download...':'Baixar APK seguro →'}</button>
 {error&&<p role="alert" className="device-notice error">{error}</p>}
 </div>;
}
