import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Download protegido | AeroMind' };
export default async function Download() {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect('/entrar?next=%2Fdownload');
  return <main className="account-root"><header className="account-header"><Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="38" height="38" /> AeroMind</Link><Link href="/minha-conta">Minha conta →</Link></header><section className="account-container"><span className="auth-eyebrow">⇩ DOWNLOAD PROTEGIDO</span><h1>Aplicativo <em>AeroMind</em></h1><div className="account-card"><h2>Download ainda não disponível</h2><p>O APK oficial será publicado quando a validação de licença no servidor e a assinatura do aplicativo estiverem prontas. Nenhum link de instalação será disponibilizado antes disso.</p></div></section></main>;
}
