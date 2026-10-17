import { AuthShell } from '@/components/auth/AuthShell';
import { RecoveryForm } from '@/components/auth/RecoveryForm';
export const metadata = { title: 'Recuperar senha | AeroMind' };
export default async function RecuperarSenha({ searchParams }: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return <AuthShell title={<>Recupere seu acesso <em>AeroMind</em></>} intro="Vamos ajudar você a recuperar sua conta com segurança.">
    {erro === 'link' && <p className="auth-alert error" role="alert">Este link de recuperação expirou, já foi utilizado ou foi aberto sem a sessão necessária. Solicite um novo link.</p>}
    <RecoveryForm />
  </AuthShell>;
}
