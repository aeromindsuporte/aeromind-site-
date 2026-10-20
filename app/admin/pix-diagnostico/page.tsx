import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {locatePixByReference} from '@/lib/pix/provider';
export const dynamic='force-dynamic';
type Order={id:string;reference_id:string;amount_cents:number;status:string;created_at:string;last_payment_error:string|null};
export default async function PixDiagnostic(){
 const {sb,role}=await requireAdmin();
 if(role!=='owner')redirect('/admin/pagamentos');
 const {data,error}=await sb.from('aeromind_payment_orders')
  .select('id,reference_id,amount_cents,status,created_at,last_payment_error')
  .not('pix_requested_at','is',null).is('provider_transaction_id',null)
  .order('created_at',{ascending:false}).limit(3);
 const orders=(data||[]) as Order[];
 type Lookup=Awaited<ReturnType<typeof locatePixByReference>>;
 const checks=await Promise.all(orders.map(async order=>({
  order,
  result:await locatePixByReference(order.reference_id,order.amount_cents)
    .catch(():Lookup=>({kind:'unavailable',pagesChecked:0}))
 })));
 return <CommercialAdminShell active="/admin/pagamentos" title="Diagnóstico Pix" description="Verificação de transações sem nova cobrança">
  <section className="admin-card">
   <h2>Verificação da tentativa existente</h2>
   <p className="admin-card-explain">Esta página consulta somente as primeiras páginas de transações da PaggPay. Nenhuma cobrança é gerada e nenhum pedido ou licença é modificado.</p>
   {error&&<p className="admin-feedback bad">Não foi possível consultar os pedidos no Supabase.</p>}
   {!error&&!orders.length&&<p>Não há pedidos recentes aguardando conciliação sem identificador de transação.</p>}
   {checks.map(({order,result})=><div key={order.id} style={{padding:'18px 0',borderBottom:'1px solid #374e72'}}>
    <p><strong>Pedido:</strong> {order.reference_id}</p>
    <p><strong>Valor:</strong> {(order.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p>
    <p><strong>Banco:</strong> {order.status==='paid'?'Pago':order.status==='failed'?'Falha confirmada pelo servidor':'Sem confirmação'}</p>
    <p className={'admin-feedback '+(result.kind==='found'?'good':'bad')}>
     {result.kind==='found'?'Cobrança localizada na PaggPay com o mesmo valor e referência. Status do provedor: '+result.status:
      result.kind==='unavailable'?'Consulta ao provedor indisponível'+(result.httpStatus?' (HTTP '+result.httpStatus+')':'')+'. Nenhuma nova cobrança deve ser gerada.':
      'Não localizada nas '+result.pagesChecked+' páginas consultadas. Isso NÃO comprova que a cobrança não existe.'}
    </p>
    {result.kind==='found'&&<p><strong>ID na PaggPay:</strong> {result.transactionId}</p>}
   </div>)}
   <p className="admin-card-explain">Se o pedido não for localizado, confirme sua ausência na área Transações da PaggPay, usando a referência mostrada acima. Evite novas tentativas até essa conferência.</p>
   <p><Link href="/admin/pagamentos" className="admin-inline-action">← Voltar a pagamentos</Link></p>
  </section>
 </CommercialAdminShell>;
}
