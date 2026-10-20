import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta | AeroMind' };

type License = {
  id:string;
  plan_name:string;
  status:'pending'|'active'|'expired'|'suspended'|'revoked';
  valid_until:string|null;
  created_at:string;
};
const labels: Record<License['status'],string> = {
  pending:'Aguardando ativação',active:'Ativa',expired:'Expirada',
  suspended:'Suspensa',revoked:'Revogada'
};
function formatDate(value:string|null) {
  return value ? new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '—';
}
export default async function Conta() {
  const client = await createClient();
  const {data:{user},error} = await client.auth.getUser();
  if (error || !user) redirect('/entrar?next=%2Fminha-conta');

  const [profileResult,licenseResult,validResult,staffResult] = await Promise.all([
    client.from('profiles').select('display_name').eq('id',user.id).maybeSingle(),
    client.from('licenses').select('id,plan_name,status,valid_until,created_at')
      .eq('user_id',user.id).order('created_at',{ascending:false}).limit(10),
    client.rpc('aeromind_has_active_license'),
    client.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle()
  ]);
  const licenses=(licenseResult.data||[]) as License[];
  const isActive=validResult.data===true && !validResult.error;
  const valid=isActive?licenses.find(l=>l.status==='active' && !!l.valid_until && new Date(l.valid_until).getTime()>Date.now()):undefined;
  const current=valid || licenses[0];
  const published=isActive?await client.from('aeromind_app_releases').select('version_name').eq('status','published').order('version_code',{ascending:false}).limit(1).maybeSingle():null;
  const releaseName=published?.data?.version_name?.split('-')[0]||'';
  const appReady=!!releaseName && !published?.error;
  const displayStatus=valid ? 'Ativa' : current?.status==='active' ? 'Vencida'
    : current ? labels[current.status] : 'Nenhuma licença ativa';
  const name=profileResult.data?.display_name || 'Cliente AeroMind';
  const isStaff=Boolean(staffResult.data?.role) && !staffResult.error;

  return <main className="account-root">
    <header className="account-header">
      <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link>
      <SignOutButton/>
    </header>
    <div className="account-container">
      <span className="auth-eyebrow">♙ ÁREA DO CLIENTE</span>
      <h1>Minha conta <em>AeroMind</em></h1>
      <p className="account-lead">Bem-vindo, {name}. Consulte seus dados e sua licença.</p>

      <div className="account-grid">
        <section className="account-card">
          <h2>Dados da conta</h2>
          <p><b>E-mail</b> <span>{user.email}</span></p>
          <p><b>E-mail confirmado</b><span>{user.email_confirmed_at?'Sim':'Pendente'}</span></p>
          <p className="account-note">Seus dados são protegidos. Cada cliente visualiza somente a própria conta.</p>
        </section>
        <section className="account-card">
          <h2>Minha licença</h2>
          <div className={isActive?'account-license-state is-active':'account-license-state'} role="status">
            <span aria-hidden="true">{isActive?'✓':'◷'}</span> {displayStatus}
          </div>
          <p><b>Plano</b><span>{current?.plan_name || 'Não contratado'}</span></p>
          <p><b>Validade</b><span>{formatDate(current?.valid_until||null)}</span></p>
          <p className="account-note">{isActive?(appReady?'Licença válida. AeroMind Monitor '+releaseName+' disponível para download.':'Licença válida. Aguarde a publicação da próxima versão do aplicativo.'):'Criar conta não ativa uma licença. Consulte as opções de contratação.'}</p>
          {isActive&&<Link className="auth-submit auth-button-link" href="/download" style={{marginTop:16}}>Acessar aplicativo →</Link>}
        </section>
        <section className="account-card">
          <h2>Download do aplicativo</h2>
          <p className="account-note">{appReady?'O aplicativo já está disponível. Acesse a versão oficial e as instruções de instalação.':'Veja as informações sobre o aplicativo e atualizações.'}</p>
          <Link href="/download" className="auth-secondary auth-button-link">Ver downloads e atualizações →</Link>
        </section>
        <section className="account-card">
          <h2>Meus dispositivos</h2>
          <p className="account-note">Consulte seus aparelhos e a quantidade permitida para sua licença.</p>
          <Link href="/dispositivos" className="auth-secondary auth-button-link">Gerenciar dispositivos →</Link>
        </section>
        <section className="account-card">
          <h2>Suporte</h2>
          <p className="account-note">Envie sua dúvida e acompanhe as respostas sem sair do site.</p>
          <Link href="/suporte" className="auth-secondary auth-button-link">Abrir central de atendimento →</Link>
        </section>
      </div>
      {isStaff && <section className="account-card account-admin-entry">
        <div className="account-admin-eyebrow">ACESSO ADMINISTRATIVO</div>
        <h2>Painel de gestão AeroMind</h2>
        <p className="account-note">Acompanhe clientes, licenças e planos com acesso protegido e auditoria.</p>
        <Link className="auth-submit auth-button-link" href="/admin">Abrir painel administrativo →</Link>
      </section>}
      {licenses.length>0 && <section className="account-card account-history">
        <h2>Histórico de licenças</h2>
        <div className="account-history-rows">
          {licenses.map((l)=><div className="account-history-row" key={l.id}>
            <strong>{l.plan_name}</strong>
            <span>{l.status==='active' && !!l.valid_until && new Date(l.valid_until).getTime()<=Date.now()?'Vencida':labels[l.status]}</span>
            <small>Cadastro: {formatDate(l.created_at)} · Validade: {formatDate(l.valid_until)}</small>
          </div>)}
        </div>
      </section>}
    </div>
  </main>;
}
