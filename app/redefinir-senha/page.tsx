import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
export const metadata = { title: 'Redefinir senha | AeroMind' };
export default function RedefinirSenha() {
  return <AuthShell title={<>Nova senha <em>AeroMind</em></>} intro="Escolha uma nova senha para continuar usando sua conta."><ResetPasswordForm /></AuthShell>;
}
