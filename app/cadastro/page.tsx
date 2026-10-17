import { AuthShell } from '@/components/auth/AuthShell';
import { AccessForm } from '@/components/auth/AccessForm';
export const metadata = { title: 'Criar conta | AeroMind' };
export default function Cadastro() {
  return <AuthShell title={<>Crie sua conta <em>AeroMind</em></>} intro="Cadastre-se gratuitamente. O acesso às funcionalidades comerciais depende de uma licença válida."><AccessForm mode="signup" /></AuthShell>;
}
