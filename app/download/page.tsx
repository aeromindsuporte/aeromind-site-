import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata={title:'Download protegido | AeroMind'};

export default async function Download() {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if (error||!user) redirect('/entrar?next=%2Fdownload');

  // Real server-side authorization; client UI cannot grant access.
  const {data:active,error:licError}=await supabase.rpc('aeromind_has_active_license');
  const valid=active===true&&!licError;
  return <main className="account-root">
    <header className="account-header">
      <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link>
      <Link className="auth-secondary" href="/minha-conta">Minha conta →</Link>
    </header>
    <section className="account-container">
      <span className="auth-eyebrow">⇩ DOWNLOAD PROTEGIDO</span>
      <h1>Aplicativo <em>AeroMind</em></h1>
      <div className="account-card">
        <h2>{valid?'Licença reconhecida':'Acesso ao download indisponível'}</h2>
        <p className="account-note">{valid
         ?'Sua licença foi validada pelo servidor. O APK oficial ainda não foi publicado: estamos concluindo assinatura e controles de dispositivo.'
         :'Não há licença ativa e válida nesta conta, ou não foi possível confirmar o acesso. O aplicativo ainda não está disponível para download.'}</p>
        <p className="account-note">Nunca instale cópias recebidas por fontes não oficiais.</p>
        <Link className="auth-secondary auth-button-link" href="/minha-conta">Voltar à minha conta →</Link>
      </div>
    </section>
  </main>;
}
