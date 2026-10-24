import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';
import {AccountWhatsApp} from '@/components/account/AccountWhatsApp';
import {formatLicenseExpiryBrazil,isLicenseCurrentlyValid,labelForLicenseStatus} from '@/lib/license-status';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta | AeroMind' };

type License = {
  id:string;
  plan_name:string;
  status:'pending'|'active'|'expired'|'suspended'|'revoked';
  valid_until:string|null;
  created_at:string;
};
function formatDate(value:string|null) {
  return value ? new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '—';
}
export default async function Conta() {
  const client = await createClient();
  const {data:{user},error} = await client.auth.getUser();
  if (error || !user) redirect('/entrar?next=%2Fminha-conta');

  const [profileResult,licenseResult,validResult,staffResult,notificationsResult,goldResult] = await Promise.all([
    client.from('profiles').select('display_name,whatsapp_e164,whatsapp_marketing_opt_in').eq('id',user.id).maybeSingle(),
    client.from('licenses').select('id,plan_name,status,valid_until,created_at')
      .eq('user_id',user.id).order('created_at',{ascending:false}).limit(10),
    client.rpc('aeromind_has_active_license'),
    client.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle(),
    client.from('aeromind_notification_deliveries').select('id,expires_at').eq('user_id',user.id).is('read_at',null).limit(1000),
    client.rpc('aeromind_gold_my_entitlement')
  ]);
  const gold=(!goldResult.error&&goldResult.data&&typeof goldResult.data==='object')?goldResult.data as {
    app_access?:boolean;gold_access?:boolean;gold_rollout_enabled?:boolean;gold_expires_at?:string|null;can_use_gold?:boolean;
  }:null;
  const licenses=(licenseResult.data||[]) as License[];
  const serverNow=Date.now();
  const isActive=validResult.data===true && !validResult.error;
  const valid=isActive?licenses.find(l=>isLicenseCurrentlyValid(l.status,l.valid_until,serverNow)):undefined;
  const current=valid || licenses[0];
  const published=isActive?await client.from('aeromind_app_releases').select('version_name').eq('status','published').order('version_code',{ascending:false}).limit(1).maybeSingle():null;
  const releaseName=published?.data?.version_name?.split('-')[0]||'';
  const appReady=!!releaseName && !published?.error;
  const displayStatus=valid ? 'Ativa' : labelForLicenseStatus(current?.status,current?.valid_until,serverNow);
  const name=profileResult.data?.display_name || 'Cliente AeroMind';
  const isStaff=Boolean(staffResult.data?.role) && !staffResult.error;
  const unreadNotifications=(notificationsResult.data||[]).filter(
    x=>!x.expires_at||new Date(x.expires_at).getTime()>serverNow).length;

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
          <h3>WhatsApp para contato</h3>
          <AccountWhatsApp initial={profileResult.data?.whatsapp_e164||null}
            marketing={profileResult.data?.whatsapp_marketing_opt_in===true}
            loadError={Boolean(profileResult.error)}/>
          <p className="account-note">Seus dados são protegidos. Cada cliente visualiza somente a própria conta.</p>
        </section>
        <section className="account-card">
          <h2>Minha licença</h2>
          <div className={isActive?'account-license-state is-active':'account-license-state'} role="status">
            <span aria-hidden="true">{isActive?'✓':'◷'}</span> {displayStatus}
          </div>
          <p><b>Plano</b><span>{current?.plan_name || 'Não contratado'}</span></p>
          <p><b>Vencimento</b><span>{formatLicenseExpiryBrazil(current?.valid_until)}</span></p>
          <p className="account-note">A licença expira automaticamente no horário indicado. O servidor verifica a validade antes de liberar o aplicativo e os downloads.</p>
          <p className="account-note">{isActive?(appReady?'Licença válida. AeroMind Monitor '+releaseName+' disponível para download.':'Licença válida. Aguarde a publicação da próxima versão do aplicativo.'):displayStatus==='Vencida'?'Seu prazo terminou. Renove sua licença para continuar utilizando o AeroMind Monitor.':'Consulte as opções de contratação para habilitar seu acesso.'}</p>
          {isActive&&<Link className="auth-submit auth-button-link" href="/download" style={{marginTop:16}}>Acessar aplicativo →</Link>}
        </section>
        <section className="account-card">
          <h2>✦ AeroMind Gold</h2>
          <p className="account-note">{gold?.gold_rollout_enabled
            ? 'O adicional Gold está disponível conforme autorização e licença válida.'
            : 'O Gold está em preparação. Seus recursos atuais permanecem disponíveis conforme sua licença.'}</p>
          <p><b>Gold</b><span>{gold?.can_use_gold===true?'Ativo':gold?.gold_access===true?'Autorização cadastrada':'Em preparação'}</span></p>
          {gold?.gold_access===true&&<p><b>Validade do adicional</b><span>{formatLicenseExpiryBrazil(gold.gold_expires_at)}</span></p>}
          <p className="account-note">Acesso Gold é independente do plano Básico, Pro ou Ultra. Nenhuma assinatura é alterada aqui.</p>
          <Link href="/gold" className="auth-secondary auth-button-link">Conhecer Gold →</Link>
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
      <section className="account-card account-notification-entry" style={{margin:'18px 0',borderColor:'#7845be'}}>
        <h2>♧ Notificações AeroMind {unreadNotifications>0?'· '+unreadNotifications+' nova(s)':''}</h2>
        <p className="account-note">Confira avisos importantes, atualizações e mensagens do Radar Ao Vivo.</p>
        <Link className="auth-submit auth-button-link" href="/notificacoes">
          Abrir minhas notificações →
        </Link>
      </section>
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
            <span>{labelForLicenseStatus(l.status,l.valid_until,serverNow)}</span>
            <small>Cadastro: {formatDate(l.created_at)} · Validade: {formatDate(l.valid_until)}</small>
          </div>)}
        </div>
      </section>}
    </div>
  </main>;
}
