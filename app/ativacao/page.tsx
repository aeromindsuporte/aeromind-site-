import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export const metadata={title:'Acesso liberado | AeroMind',robots:{index:false,follow:false}};
type Order={status:string;plan_name:string;amount_cents:number;paid_at:string|null};
export default async function Activation({searchParams}:{searchParams:Promise<{pedido?:string}>}){
 const {pedido}=await searchParams;
 const id=typeof pedido==='string'&&/^[0-9a-f-]{36}$/i.test(pedido)?pedido:'';
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)redirect('/entrar?next='+encodeURIComponent('/ativacao?pedido='+id));
 const [orderResult,licenseResult]=await Promise.all([
  id?client.from('aeromind_payment_orders')
   .select('status,plan_name,amount_cents,paid_at').eq('id',id).eq('user_id',user.id).maybeSingle():
   Promise.resolve({data:null,error:null}),
  client.rpc('aeromind_has_active_license'),
 ]);
 const order=orderResult.data as Order|null;
 if(!order)return <main className="account-root"><div className="account-container">
  <section className="pix-shell"><h2>Pedido não localizado</h2>
   <p>Não encontramos esse pedido na sua conta AeroMind.</p>
   <Link className="pix-secondary" href="/pagamentos">Consultar meus pedidos →</Link>
  </section>
 </div></main>;
 const isPaid=order.status==='paid';
 const licenseActive=licenseResult.data===true&&!licenseResult.error;
 const [licenses,downloads]=await Promise.all([
  isPaid&&licenseActive?client.from('licenses').select('valid_until')
    .eq('user_id',user.id).eq('status','active').gt('valid_until',new Date().toISOString())
    .order('valid_until',{ascending:false}).limit(1):Promise.resolve({data:[]}),
  isPaid&&licenseActive?client.from('aeromind_app_releases').select('version_name')
    .eq('status','published').limit(1):Promise.resolve({data:[]})
 ]);
 const until=licenses.data?.[0]?.valid_until||null;
 const hasApp=(downloads.data?.length||0)>0;
 const amount=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(order.amount_cents/100);
 return <main className="account-root">
  <header className="account-header"><Link href="/" className="auth-logo">✦ AeroMind</Link>
   <Link className="auth-secondary" href="/minha-conta">Minha conta →</Link></header>
  <div className="account-container">
   <span className="auth-eyebrow">PRÓXIMA ETAPA</span>
   <h1>Seu acesso <em>AeroMind</em></h1>
   <section className="pix-shell">
    {isPaid&&licenseActive?<div className="pix-success">
      <span className="pix-success-mark" aria-hidden="true">✓</span>
      <span className="pix-state-pill done">✓ Pagamento e licença confirmados</span>
      <h2>Seu AeroMind está liberado!</h2>
      <p>Pagamento aprovado. Sua licença está ativa no servidor e vinculada à conta usada na compra.</p>
      <div className="pix-success-amount"><span>{order.plan_name} · Pagamento realizado</span>
       <strong>{amount}</strong>
       {until&&<small>Licença válida até {new Date(until).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})}</small>}
      </div>
      <div className="pix-activation-steps">
       <div className="pix-activation-step"><span className="pix-activation-number">1</span><div>
        <strong>{hasApp?'Baixe o aplicativo oficial':'Aguarde a publicação do aplicativo'}</strong>
        <p>{hasApp?'Instale o AeroMind Monitor pelo link protegido da sua conta.':'Sua licença já está ativa. Avisaremos na área de downloads quando o APK oficial estiver disponível.'}</p>
       </div></div>
       <div className="pix-activation-step"><span className="pix-activation-number">2</span><div>
        <strong>Entre no AeroMind Monitor</strong>
        <p>Use o mesmo e-mail e senha da conta AeroMind com a qual realizou a compra.</p>
       </div></div>
       <div className="pix-activation-step"><span className="pix-activation-number">3</span><div>
        <strong>Acesso validado</strong>
        <p>O aplicativo consultará sua licença ativa. Se necessário, confira seus dispositivos na área do cliente.</p>
       </div></div>
      </div>
      <div className="pix-actions">
       <Link className="pix-primary" href="/download">{hasApp?'Baixar o AeroMind Monitor →':'Ver download e atualizações →'}</Link>
       <Link className="pix-secondary" href="/minha-conta">Ver minha licença e meus dispositivos</Link>
      </div>
     </div>:
     <div className="pix-success">
      <span className="pix-state-pill waiting">{isPaid?'Pagamento confirmado; verificando a licença':'Aguardando confirmação do pagamento'}</span>
      <h2>{isPaid?'Licença em processamento':'Seu pedido ainda não foi confirmado'}</h2>
      <p>{isPaid?'O pagamento está registrado, mas o acesso ativo ainda não foi verificado. Não faça um segundo Pix; consulte o pedido ou o suporte.':'Apenas o pagamento confirmado pela PaggPay pode liberar o aplicativo.'}</p>
      <div className="pix-actions"><Link className="pix-secondary" href={'/checkout/retorno?pedido='+id}>Consultar pedido →</Link>
       <Link className="pix-secondary" href="/suporte">Falar com o suporte →</Link>
      </div>
     </div>}
   </section>
  </div>
 </main>;
}
