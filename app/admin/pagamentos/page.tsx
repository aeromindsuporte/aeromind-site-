import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {isSandboxKeyCompatible} from '@/lib/pix/provider';
import {createClient as createServiceClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
type Order={id:string,created_at:string,status:string,amount_cents:number,plan_name:string,email:string};
export default async function AdminPayments(){
 const {sb,role}=await requireAdmin();const [orders,summary]=await Promise.all([sb.rpc('aeromind_admin_orders'),sb.rpc('aeromind_admin_commercial_snapshot')]);
 const testPreview=role==='owner'
  ? await sb.from('aeromind_payment_orders').select('status,amount_cents')
    .eq('is_homologation',true).limit(1).maybeSingle()
  : null;
 const list=(Array.isArray(orders.data)?orders.data:[]) as Order[],s=summary.data||{};
 const checks=[
  ['Modo sandbox habilitado',process.env.PAGGPAY_MODE==='sandbox'],
  ['Credencial compatível com sandbox (não usar chave live)',isSandboxKeyCompatible(process.env.PAGGPAY_API_KEY)],
  ['Segredo de assinatura do webhook',!!process.env.PAGGPAY_WEBHOOK_SECRET],
  ['Endereço de retorno do webhook',!!process.env.PAGGPAY_WEBHOOK_URL],
  ['Credencial privada de conciliação',!!process.env.SUPABASE_SERVICE_ROLE_KEY],
 ] as const;
 // Consulta somente de leitura com a credencial de servidor real da implantação.
 // Esta tabela não permite leitura pelo papel anon/authenticated. Não mostramos
 // valores, IDs ou detalhes da credencial ao navegador.
 let serverCredentialStatus:'verified'|'missing'|'failed'='missing';
 if(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL){
  try {
   const service=createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,
    {auth:{persistSession:false,autoRefreshToken:false}}
   );
   const probe=await service.from('aeromind_payment_events').select('id',{head:true,count:'exact'});
   serverCredentialStatus=probe.error?'failed':'verified';
  }catch{serverCredentialStatus='failed';}
 }
 // Teste apenas GET, executado no servidor após o login administrativo.
 // Nem os dados retornados, nem o token, nem erros brutos são expostos.
 type GatewayStatus='verified'|'forbidden'|'unauthorized'|'unavailable'|'not-configured';
 let gatewayStatus:GatewayStatus='not-configured';
 if(process.env.PAGGPAY_API_KEY?.startsWith('pp_live_')){
  try{
   const response=await fetch('https://api.paggpay.com/v1/transactions?page=1&per_page=1',{
    method:'GET',headers:{Authorization:'Bearer '+process.env.PAGGPAY_API_KEY,Accept:'application/json'},
    cache:'no-store',signal:AbortSignal.timeout(4500),
   });
   gatewayStatus=response.ok?'verified':response.status===401?'unauthorized':
    response.status===403?'forbidden':'unavailable';
  }catch{gatewayStatus='unavailable';}
 }
 const sandboxReady=checks.every(([,ready])=>ready);
 const liveKeyPresent=process.env.PAGGPAY_API_KEY?.startsWith('pp_live_')===true;
 return <CommercialAdminShell active="/admin/pagamentos" title="Pagamentos e pedidos" description="Movimentações reais do servidor. Pedidos não confirmados nunca entram na receita.">
 <section className="admin-stats"><div className="admin-stat"><div className="admin-stat-body"><span>Receita confirmada</span><strong>{(Number(s.revenue_cents||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div></div><div className="admin-stat"><div className="admin-stat-body"><span>Pedidos pagos</span><strong>{s.orders_paid??0}</strong></div></div><div className="admin-stat"><div className="admin-stat-body"><span>Pendentes</span><strong>{s.orders_pending??0}</strong></div></div></section>
 <section className="admin-card" style={{marginBottom:16}}><h2>Verificação da credencial Supabase</h2>
 <p className={'admin-feedback '+(serverCredentialStatus==='verified'?'good':'bad')}>
  {serverCredentialStatus==='verified'?'Autenticada: o servidor acessou a tabela de conciliação usando a credencial privada.':
   serverCredentialStatus==='missing'?'Pendente: credencial de servidor ausente.':
   'Falha de autenticação ou autorização: confira a chave privada e as permissões do Supabase.'}
 </p>
 <p className="admin-card-explain">Verificação de leitura realizada no servidor. Nenhuma licença, cobrança, pedido ou evento é criado por este diagnóstico. Não é um teste de pagamento na PaggPay.</p>
 </section>
 <section className="admin-card" style={{marginBottom:16}}><h2>Conexão PaggPay — somente leitura</h2>
 <p className={'admin-feedback '+(gatewayStatus==='verified'?'good':'bad')}>
 {gatewayStatus==='verified'?'Conectada: a PaggPay aceitou a credencial de produção em uma consulta de leitura.':
 gatewayStatus==='forbidden'?'Credencial sem permissão de consultar transações (HTTP 403). Confira as permissões da chave na PaggPay.':
 gatewayStatus==='unauthorized'?'PaggPay rejeitou a autenticação (HTTP 401). Confira se a chave continua válida.':
 gatewayStatus==='unavailable'?'Não foi possível verificar a API da PaggPay agora. Nenhuma cobrança foi criada.':
 'Chave PaggPay de produção não configurada.'}
 </p>
 <p className="admin-card-explain">Esta verificação usa GET /transactions com apenas um registro solicitado e descarta a resposta. Não cria cobranças, não consulta ou altera licenças e não habilita o checkout. Caso ambas as marcas usem a mesma conta PaggPay, os recebimentos continuam na mesma conta financeira.</p>
 </section>
 {role==='owner'&&<section className="admin-card" style={{marginBottom:16}}><h2>Preparação do teste real — teto R$ 1,00</h2>
 <p className="admin-card-explain">Esta área é visível somente ao proprietário. É uma prévia de segurança; abrir ou atualizar a página nunca emite um Pix.</p>
 <div style={{display:'grid',gap:10,marginTop:16}}>
 <div><strong>Valor máximo autorizado:</strong> R$ 1,00 (100 centavos)</div>
 <div><strong>Quantidade permitida:</strong> uma única cobrança</div>
 <div><strong>Pagador:</strong> proprietário do AeroMind</div>
 <div><strong>Licença de teste:</strong> 1 dia do plano Básico, somente após pagamento verificado</div>
 <div><strong>Pedido no banco:</strong> {testPreview?.error?'Consulta indisponível':testPreview?.data?
   testPreview.data.status==='paid'?'Pagamento confirmado':testPreview.data.amount_cents>100?
   'Inconsistência: valor acima do teto':'Já existe uma reserva — não criar outra':'Nenhuma cobrança reservada'}</div>
 </div>
 <p role="status" className="admin-feedback bad" style={{marginTop:16}}>Emissão ainda bloqueada. O código de pagamento real está em revisão separada e o checkout público permanece desativado.</p>
 <p className="admin-card-explain">O valor pago por você não poderá ultrapassar R$ 1,00. Se houver taxa adicional para o pagador ou se o valor mínimo aceito pela PaggPay for superior, o teste deve ser cancelado.</p>
 </section>}
 <section className="admin-card" style={{marginBottom:16}}><h2>Homologação Pix</h2>
 <p className={'admin-feedback '+(sandboxReady?'good':'bad')}>{sandboxReady?'Variáveis do sandbox preenchidas. Ainda falta testar o provedor.':'Sandbox não configurado. Nenhuma cobrança Pix está disponível no site.'}</p>
 {liveKeyPresent&&<p className="admin-feedback bad">Há uma chave PaggPay de produção cadastrada. Ela não pode ser usada para testar o sandbox; o checkout permanece desativado até a configuração e homologação corretas.</p>}
 <p className="admin-card-explain">Este painel mostra somente se cada configuração está presente, nunca seus valores. Um item preenchido não significa que a credencial foi validada. Somente administradores autenticados podem gerar pedidos de teste.</p>
 <div style={{display:'grid',gap:10,marginTop:16}}>{checks.map(([label,ready])=><div key={label}><strong aria-label={ready?'Configurado':'Pendente'}>{ready?'✓':'○'}</strong> {label} — {ready?'Preenchido':'Pendente'}</div>)}</div>
 <p className="admin-card-explain" style={{marginTop:16}}>Próximas validações: cobrança aprovada e expirada, assinatura HMAC, repetição de webhook, divergência de valores e renovação de licença. O Pix real continua bloqueado no código.</p>
 </section>
 <section className="admin-card"><p className="admin-card-explain">A receita soma somente pagamentos confirmados pelo servidor. Não habilite cobranças reais até concluir a homologação da PaggPay.</p>
 {orders.error||summary.error?<p className="admin-feedback bad">Não foi possível consultar os pagamentos.</p>:<div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Plano</th><th>Valor</th><th>Status</th></tr></thead><tbody>
 {list.map(o=><tr key={o.id}><td>{new Date(o.created_at).toLocaleString('pt-BR')}</td><td className="admin-email">{o.email}</td><td>{o.plan_name}</td><td>{(o.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>{o.status}</td></tr>)}
 {!list.length&&<tr><td colSpan={5}>Nenhuma transação registrada.</td></tr>}</tbody></table></div>}</section></CommercialAdminShell>;
}
