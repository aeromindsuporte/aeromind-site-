'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Release={version:string;code:number;path:string;status:string};
export function ReleaseAdminActions({release}:{release:Release}){
  const router=useRouter();
  const [expanded,setExpanded]=useState(false);
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  if(release.status!=='published')return null;

  const confirmation='RETIRAR '+release.code;
  async function withdraw(){
    if(busy||confirm.trim()!==confirmation)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/unpublish-apk',{
        method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({versionCode:release.code,expectedPath:release.path})
      });
      const data=await response.json() as {ok?:boolean;message?:string};
      if(!response.ok||!data.ok)throw new Error(data.message||'Não foi possível retirar a publicação.');
      setExpanded(false);setConfirm('');
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:'Erro ao retirar versão.');
    }finally{setBusy(false);}
  }
  return <div style={{marginTop:10}}>
    <button type="button" className="admin-inline-action" onClick={()=>{setExpanded(!expanded);setConfirm('');setMessage('');}}>
      {expanded?'Cancelar':'Retirar do site'}
    </button>
    {expanded&&<div style={{marginTop:10,padding:12,border:'1px solid var(--border, #696a77)',borderRadius:10}}>
      <p style={{margin:'0 0 8px'}}>O download desta versão será interrompido. O APK e o histórico permanecerão guardados para auditoria e substituição futura.</p>
      <label style={{display:'block',fontSize:13}}>Digite <strong>{confirmation}</strong> para confirmar.
        <input style={{display:'block',marginTop:6,width:'100%',maxWidth:260}}
          value={confirm} onChange={e=>setConfirm(e.target.value)}
          autoComplete="off" aria-label="Confirmar retirada da versão"/>
      </label>
      <button type="button" style={{marginTop:10}} disabled={busy||confirm.trim()!==confirmation}
        onClick={withdraw}>{busy?'Retirando...':'Confirmar retirada do site'}</button>
    </div>}
    {message&&<p role="alert" className="admin-feedback bad">{message}</p>}
  </div>;
}
