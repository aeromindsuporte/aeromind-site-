'use client';
import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type ReleaseOption={code:number;version:string;status:string;path:string};
export function ReleaseUploader({releases=[]}:{releases?:ReleaseOption[]}){
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [done,setDone]=useState(false);
  const [replaceCode,setReplaceCode]=useState<number|null>(null);
  const replacing=replaceCode!==null;
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;
    const form=e.currentTarget;
    const fields=new FormData(form);
    const apk=fields.get('apk');
    const name=String(fields.get('versionName')||'').trim();
    const code=Number(fields.get('versionCode'));
    const notes=String(fields.get('notes')||'').trim();
    const confirmed=fields.get('signingConfirmed')==='on';
    setMsg('');setDone(false);
    if(replacing&&code!==replaceCode){setMsg('Código de substituição inválido.');return;}
    if(!(apk instanceof File)||!apk.name.toLowerCase().endsWith('.apk')){
      setMsg('Escolha um arquivo APK.');return;
    }
    if(/debug|unsigned|unaligned/i.test(apk.name)){
      setMsg('Não publique builds debug ou APKs não assinados. Gere um APK release assinado.');return;
    }
    if(apk.size<20000 || apk.size>6*1024*1024){
      setMsg('Este formulário aceita até 6 MB. Para arquivos maiores precisaremos habilitar envio resumível.');return;
    }
    if(!Number.isSafeInteger(code)||code<1||code>2147483647||name.length<1||name.length>40||notes.length>2000||!confirmed){
      setMsg('Confira código, nome e confirmação de assinatura.');return;
    }
    setBusy(true);
    try{
      if(!globalThis.crypto?.subtle)throw new Error('Use uma conexão segura (HTTPS).');
      const digest=await crypto.subtle.digest('SHA-256',await apk.arrayBuffer());
      const sha=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
      const path='releases/aeromind-v'+code+'-'+sha.slice(0,16)+'.apk';
      const supabase=createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      // Identical APKs already in the private bucket must not be uploaded twice.
      const existing=replacing?releases.find(r=>r.code===replaceCode):undefined;
      if(!existing||existing.path!==path){
        setMsg('Enviando APK ao armazenamento privado...');
        const {error:uploadError}=await supabase.storage.from('aeromind-apk-releases')
          .upload(path,apk,{upsert:false,contentType:'application/vnd.android.package-archive',cacheControl:'60'});
        if(uploadError)throw new Error('Upload não concluído: '+uploadError.message);
      }
      setMsg('Validando o SHA-256 no servidor e publicando...');
      const response=await fetch('/api/admin/publish-apk',{
        method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          versionCode:code,versionName:name,path,sha256:sha,sizeBytes:apk.size,
          notes,signingConfirmed:true,replaceExisting:replacing
        })
      });
      const result=await response.json() as {message?:string;ok?:boolean};
      if(!response.ok||!result.ok)throw new Error(result.message||'Publicação não concluída.');
      setDone(true);setMsg('Versão '+name+(replacing?' substituída':' publicada')+' após conferência de integridade. Atualize a página para conferir.');
      form.reset();
    }catch(err){
      setMsg(err instanceof Error?err.message:'Falha ao publicar APK.');
    }finally{setBusy(false);}
  }
  return <form className="admin-release-form" onSubmit={submit}>
    <div className="admin-edit-grid">
      <label className="admin-full">Tipo de publicação
        <select value={replaceCode??''} onChange={e=>{setReplaceCode(e.target.value?Number(e.target.value):null);setMsg('');}}>
          <option value="">Publicar uma versão NOVA (código maior)</option>
          {releases.map(r=><option key={r.code} value={r.code}>
            Substituir versão existente: {r.version} — código {r.code}{r.status==='published'?' (publicada)':' (arquivada)'}
          </option>)}
        </select>
      </label>
      {replacing&&<p className="admin-full admin-card-explain">
        A substituição mantém os registros de download e o código Android. Não apaga a assinatura ou os arquivos anteriores do armazenamento.
        <strong> Atenção:</strong> reenviar o mesmo APK (mesmo SHA-256) não altera seu funcionamento.
      </p>}
      <label>Código da versão Android (versionCode)
        <input key={replaceCode??'new'} name="versionCode" required readOnly={replacing}
          defaultValue={replaceCode??''} type="number" min={1} max={2147483647} step={1} placeholder="Ex.: 53"/></label>
      <label>Nome da versão
        <input key={'name-'+(replaceCode??'new')} name="versionName" required maxLength={40}
          defaultValue={releases.find(r=>r.code===replaceCode)?.version||''}
          placeholder="Ex.: Aurora Pulse v13"/></label>
      <label className="admin-full">APK oficial assinado
        <input type="file" name="apk" required accept=".apk,application/vnd.android.package-archive"/></label>
      <label className="admin-full">Novidades desta atualização
        <textarea name="notes" maxLength={2000} rows={3} placeholder="Melhorias, correções e novidades"/></label>
      <label className="admin-checkbox admin-full">
        <input name="signingConfirmed" type="checkbox" required />
        Confirmo que o APK é uma versão release assinada e verificada, com a mesma identidade de assinatura das versões anteriores.
      </label>
      <div className="admin-form-foot">
        <small>O servidor reconfere o SHA-256. Upload até 6 MB nesta primeira versão. Não publique builds de depuração.</small>
        <button disabled={busy} type="submit">{busy?'Processando...':replacing?'Verificar e substituir →':'Verificar e publicar →'}</button>
      </div>
    </div>
    {msg&&<p className={'admin-feedback '+(done?'good':'bad')} role="status">{msg}</p>}
  </form>;
}
