import { AuthShell } from '@/components/auth/AuthShell';
import { RecoveryForm } from '@/components/auth/RecoveryForm';
export const metadata = { title: 'Recuperar senha | AeroMind' };
export default function RecuperarSenha() {
  return <AuthShell title={<>Recupere seu acesso <em>AeroMind</em></>} intro="Vamos ajudar você a recuperar sua conta com segurança."><RecoveryForm /></AuthShell>;
}
