import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import { AuthShell } from '@/components/auth/AuthShell';
import { AccessForm } from '@/components/auth/AccessForm';
export const metadata = { title: 'Entrar | AeroMind' };
export default async function Login({ searchParams }: { searchParams: Promise<{next?:string, erro?:string}> }) {
  const { next, erro } = await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(user)redirect('/minha-conta');
  return <AuthShell title={<>Acesse sua conta <em>AeroMind</em></>} intro="Entre na sua conta para acompanhar seus dados, sua licença e os recursos do AeroMind.">
    {erro && <p className="auth-alert error" role="alert">Link de confirmação inválido ou expirado. Tente novamente.</p>}
    <AccessForm mode="login" next={next} />
  </AuthShell>;
}
