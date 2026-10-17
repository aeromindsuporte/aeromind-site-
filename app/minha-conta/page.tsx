import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/auth/SignOutButton';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta | AeroMind' };

export default async function Conta() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect('/entrar?next=%2Fminha-conta');
  const [profileResult, licenseResult] = await Promise.all([
    client.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    client.from('licenses').select('plan_name,status,valid_until').eq('user_id', user.id).order('created_at',{ascending:false}).limit(10)
  ]);
  const licenses = licenseResult.data || [];
  const valid = licenses.find(l => l.status === 'active' && (!l.valid_until || new Date(l.valid_until).getTime() > Date.now()));
  const name = profileResult.data?.display_name || 'Cliente AeroMind';
  return <main className="account-root"><header className="account-header"><Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link><SignOutButton /></header><div className="account-container">
    <span className="auth-eyebrow">♙ ÁREA DO CLIENTE</span>
    <h1>Minha conta <em>AeroMind</em></h1>
    <p className="account-lead">Bem-vindo, {name}. Acompanhe sua situação de acesso.</p>
    <div className="account-grid"><section className="account-card"><h2>Dados da conta</h2><p><b>E-mail</b> <span>{user.email}</span></p><p><b>E-mail confirmado</b> <span>{user.email_confirmed_at ? 'Sim' : 'Pendente'}</span></p></section>
    <section className="account-card"><h2>Minha licença</h2><p><b>Status</b> <span className={valid ? 'account-active' : 'account-inactive'}>{valid ? 'Ativa' : 'Nenhuma licença ativa'}</span></p><p><b>Plano</b><span>{valid?.plan_name || 'Não contratado'}</span></p><p><b>Validade</b><span>{valid?.valid_until ? new Date(valid.valid_until).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '—'}</span></p><p className="account-note">Criar uma conta não concede uma licença. O sistema de contratação ainda está em preparação.</p></section>
    <section className="account-card"><h2>Download do aplicativo</h2><p className="account-note">O APK protegido será disponibilizado após os testes de licença e integridade. Nenhum arquivo está liberado nesta etapa.</p><Link className="auth-secondary auth-button-link" href="/download">Ver disponibilidade →</Link></section>
    <section className="account-card"><h2>Precisa de ajuda?</h2><p className="account-note">Converse com o suporte AeroMind.</p><a className="auth-secondary auth-button-link" href="mailto:aeromindsuporte@gmail.com">Falar com o suporte →</a></section>
    </div>
  </div></main>;
}
