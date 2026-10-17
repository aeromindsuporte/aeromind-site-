import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DownloadButton } from '@/components/account/DownloadButton';

export const dynamic='force-dynamic';
export const metadata={title:'Atualizações e download | AeroMind',robots:{index:false,follow:false}};
type Release={version_code:number;version_name:string;sha256:string;size_bytes:number;
 status:string;published_at:string|null;release_notes:string};
const date=(raw:string|null)=>raw?new Date(raw).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';

export default async function Download(){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(!user||authError)redirect('/entrar?next=%2Fdownload');
 const {data:licensed,error:licenseError}=await supabase.rpc('aeromind_has_active_license');
 const active=licensed===true&&!licenseError;
 const result=active?await supabase.from('aeromind_app_releases')
   .select('version_code,version_name,sha256,size_bytes,status,published_at,release_notes')
   .in('status',['published','retired']).order('version_code',{ascending:false}).limit(10):null;
 const releases=(result?.data??[]) as Release[];
 const current=releases.find(r=>r.status==='published');
 const available=active&&!!current&&!result?.error;
 return <main className="account-root"><header className="account-header">
  <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link>
  <Link className="auth-secondary" href="/minha-conta">Minha conta →</Link>
 </header><section className="account-container">
  <span className="auth-eyebrow">⇩ DISTRIBUIÇÃO OFICIAL</span>
  <h1>Download e <em>atualizações</em></h1>
  <p className="account-lead">Instale novas versões com segurança, mantendo seu login e a licença AeroMind.</p>
  <section className="device-download-card">
   <div className="device-app-symbol"><img src="/images/aeromind-mark.svg" width="66" height="66" alt="Logo AeroMind"/></div>
   <div className="device-app-info"><strong>AeroMind Monitor</strong>
     <p>{current?'Versão '+current.version_name+' disponível':'Nenhuma atualização publicada'}</p>
     <span>{active?'Licença ativa':'Licença inativa ou não confirmada'}</span>
   </div>
   <div className="device-app-cta">{available?<DownloadButton/>:
     <span className="device-notice">{!active?'Ative sua licença para baixar o aplicativo.':'Aguardando APK oficial assinado.'}</span>}
   </div>
  </section>
  {current&&<section className="device-release-info">
    <strong>Versão atual: {current.version_name}</strong>
    <p>Publicada em {date(current.published_at)} · {(current.size_bytes/1048576).toFixed(2)} MB</p>
    {current.release_notes&&<p className="account-release-notes">{current.release_notes}</p>}
    <p>SHA-256: <code>{current.sha256}</code></p>
    <small>O hash permite conferir a integridade do download. A assinatura Android também deve corresponder à versão instalada.</small>
  </section>}
  {releases.filter(r=>r.status==='retired').length>0&&<section className="device-explanation">
    <h2>Histórico de atualizações</h2>
    <div className="account-update-history">{releases.filter(r=>r.status==='retired').map(r=>
       <div className="account-update-item" key={r.version_code}>
        <strong>{r.version_name}</strong><small>{date(r.published_at)}</small>
        {r.release_notes&&<p>{r.release_notes}</p>}
       </div>
    )}</div>
  </section>}
  <section className="device-explanation">
    <h2>Como atualizar sem perder seus dados</h2>
    <p>1. Entre na mesma conta AeroMind utilizada no aplicativo. 2. Baixe a versão oficial disponível. 3. Instale sobre a versão atual, sem desinstalá-la, usando o mesmo identificador e certificado de assinatura. 4. Reabra o aplicativo e confirme sua licença.</p>
    <p>Se o Android informar que a assinatura não corresponde, não desinstale o aplicativo para forçar a instalação: procure o suporte antes.</p>
    <Link href="/dispositivos" className="auth-secondary auth-button-link">Meus dispositivos →</Link>
  </section>
 </section></main>;
}
