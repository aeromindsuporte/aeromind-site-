import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {PaymentReturnTracker} from '@/components/checkout/PaymentReturnTracker';
export const dynamic='force-dynamic';
export const metadata={title:'Acompanhar pagamento Pix | AeroMind',robots:{index:false,follow:false}};
export default async function Return({searchParams}:{searchParams:Promise<{pedido?:string}>}){
 const {pedido}=await searchParams;
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next='+encodeURIComponent('/checkout/retorno?pedido='+String(pedido||'')));
 const id=typeof pedido==='string'&&/^[0-9a-f-]{36}$/i.test(pedido)?pedido:'';
 const {data}=id?await sb.from('aeromind_payment_orders')
  .select('status,plan_name,amount_cents').eq('id',id).eq('user_id',user.id).maybeSingle():
  {data:null};
 return <main className="account-root">
  <header className="account-header"><Link href="/pagamentos" className="auth-logo">← AeroMind · Pedidos</Link></header>
  <div className="account-container">
   <span className="auth-eyebrow">ACOMPANHAMENTO PIX</span><h1>Status do seu <em>pagamento</em></h1>
   {data?<PaymentReturnTracker orderId={id} initialStatus={data.status}
     amount={data.amount_cents} planName={data.plan_name}/>:
    <section className="pix-shell"><h2>Pedido não encontrado</h2>
     <p>Esse pedido não está disponível na sua conta. Verifique o histórico de pagamentos.</p>
     <Link className="pix-secondary" href="/pagamentos">Abrir meus pagamentos</Link>
    </section>}
  </div>
 </main>;
}
