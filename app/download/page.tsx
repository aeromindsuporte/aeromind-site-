import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DownloadButton } from '@/components/account/DownloadButton';

export const dynamic='force-dynamic';
export const metadata={title:'Download protegido | AeroMind',robots:{index:false,follow:false}};

export default async function Download(){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(!user||authError)redirect('/entrar?next=%2Fdownload');
 const {data:licensed,error:licenseError}=await supabase.rpc('aeromind_has_active_license');
 const active=licensed===true&&!licenseError;
 const release=active ? await supabase.from('aeromind_app_releases')
   .select('version_name,sha256,size_bytes,status').eq('status','published')
   .order('version_code',{ascending:false}).limit(1).maybeSingle() : null;
 const version=release?.data;
 const available=active&&!!version&&!release?.error;
 return <main className="account-root"><header className="account-header">
  <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link>
  <Link className="auth-secondary" href="/minha-conta">Minha conta →</Link>
 </header><section className="account-container">
  <span className="auth-eyebrow">⇩ DOWNLOAD PROTEGIDO</span><h1>Aplicativo <em>AeroMind</em></h1>
  <p className="account-lead">O download é autorizado pelo servidor e protegido por link temporário.</p>
  <section className="device-download-card">
    <div className="device-app-symbol" aria-hidden="true"><img src="/images/aeromind-mark.svg" width="66" height="66" alt=""/></div>
    <div className="device-app-info"><strong>AeroMind Monitor</strong><p>{version?'Versão '+version.version_name:'Versão aguardando publicação'}</p><span>{active?'Licença validada':'Licença não ativa'}</span></div>
    <div className="device-app-cta">{available?<DownloadButton/>:<span className="device-notice">Download indisponível nesta etapa</span>}</div>
  </section>
  {version&&<div className="device-release-info"><strong>Arquivo verificado pela equipe</strong><p>SHA-256 declarado: <code>{version.sha256}</code></p><p>Tamanho registrado: {(Number(version.size_bytes)/1024/1024).toFixed(1)} MB</p><small>Confira a procedência do arquivo antes de instalar. O registro do hash não substitui a verificação de assinatura do Android.</small></div>}
  <section className="device-explanation">
    <h2>Como instalar</h2>
    <p>1. Baixe o APK apenas neste site, após a publicação oficial. 2. Confirme a origem e assinatura. 3. Instale seguindo as orientações do Android. 4. Entre com sua conta e vincule seu aparelho quando a integração estiver habilitada.</p>
    <p>Não desative proteções de segurança do Android sem entender os riscos. Antes do lançamento, o APK passará por validação de assinatura e integridade.</p>
    <Link className="auth-secondary auth-button-link" href="/dispositivos">Gerenciar meus dispositivos →</Link>
  </section>
 </section></main>;
}
