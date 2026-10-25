import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import './presenca.css';

export const dynamic='force-dynamic';
export const metadata={title:'Presença no aplicativo | AeroMind',robots:{index:false,follow:false}};
type Session={session_id:string;user_id:string;email:string;app_version:string;
 first_seen_at:string;last_seen_at:string;background_at:string|null;exited_at:string|null;
 state:string;online:boolean;plan:string};
const fmt=(v:string|null)=>v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
export default async function AppPresence(){
 const {sb,role}=await requireAdmin();
 if(!['admin','owner'].includes(role))redirect('/admin');
 const {data,error}=await sb.rpc('aeromind_admin_pulse_presence');
 const sessions=(data?.ok&&Array.isArray(data.sessions)?data.sessions:[]) as Session[];
 const online=sessions.filter(x=>x.online).length;
 const customers=new Set(sessions.map(x=>x.user_id)).size;
 return <CommercialAdminShell title="Presença dos clientes" active="/admin/presenca"
  description="Sessões reais reportadas pelo aplicativo Aurora Pulse. Presença ONLINE expira automaticamente sem heartbeat recente.">
  <div className="pulse-admin">
   <div className="pulse-stats">
    <section className="admin-card"><small>Online agora</small><strong>{error?'—':online}</strong><span>Ativos nos últimos 110 segundos</span></section>
    <section className="admin-card"><small>Contas observadas</small><strong>{error?'—':customers}</strong><span>Nas sessões mais recentes</span></section>
    <section className="admin-card"><small>Sessões registradas</small><strong>{error?'—':sessions.length}</strong><span>Últimos 250 registros</span></section>
   </div>
   <section className="admin-card">
    <h2>Clientes e últimas atividades</h2>
    <p>A saída registrada corresponde ao aplicativo passando para segundo plano ou ao encerramento informado. Fechamentos abruptos podem não avisar o servidor; nesses casos o status muda para offline automaticamente após 110 segundos.</p>
    <p>Somente a versão Aurora Pulse comunica presença. A tela não acessa apostas, jogo, mensagens pessoais nem localização.</p>
    <p><Link href="/admin/clientes">Abrir gerenciamento de clientes ↗</Link> · <Link href="/admin/notificacoes">Notificações administrativas ↗</Link> · <a href="/admin/presenca">Atualizar status ↻</a></p>
    {error||!data?.ok?<p role="alert" className="admin-feedback bad">O banco não confirmou a leitura das sessões; não exibiremos estados supostos.</p>:
     <div className="pulse-table-scroll"><table>
      <thead><tr><th>Cliente</th><th>Plano</th><th>Status</th><th>Entrou</th><th>Última atividade</th><th>Saiu/segundo plano</th><th>App</th></tr></thead>
      <tbody>{sessions.map(s=><tr key={s.session_id}>
       <td><Link href={'/admin/cliente/'+encodeURIComponent(s.user_id)}>{s.email||'Conta '+s.user_id.slice(0,8)}</Link></td>
       <td>{s.plan}</td><td><span className={s.online?'pulse-online':'pulse-offline'}>{s.online?'● ONLINE':s.state==='background'?'◌ Em segundo plano':'○ Offline'}</span></td>
       <td>{fmt(s.first_seen_at)}</td><td>{fmt(s.last_seen_at)}</td>
       <td>{fmt(s.exited_at||s.background_at)}</td><td>{s.app_version}</td>
      </tr>)}
      {sessions.length===0&&<tr><td colSpan={7}>Nenhuma sessão Aurora Pulse foi registrada ainda.</td></tr>}
      </tbody></table></div>}
   </section>
  </div>
 </CommercialAdminShell>;
}
