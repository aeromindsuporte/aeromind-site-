import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getVisiblePlans,formattedPrice} from '@/lib/catalog';
import {PixCheckout} from '@/components/checkout/PixCheckout';
export const dynamic='force-dynamic';
export const metadata={title:'Checkout seguro | AeroMind',description:'Selecione um plano e acompanhe a disponibilidade do Pix AeroMind'};
const periods:{[key:number]:string}={30:'Mensal',90:'Trimestral',180:'Semestral',365:'Anual'};
export default async function Checkout({searchParams}:{searchParams:Promise<{plano?:string}>}){
 const {plano}=await searchParams;
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect('/entrar?next='+encodeURIComponent('/checkout'+(plano?'?plano='+encodeURIComponent(plano):'')));
 const plans=await getVisiblePlans();
 const current=plans.find(p=>p.slug===plano)||plans[0];
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 const sandbox=process.env.PAGGPAY_MODE==='sandbox'&&!!process.env.PAGGPAY_API_KEY&&!!process.env.PAGGPAY_WEBHOOK_SECRET&&!!process.env.SUPABASE_SERVICE_ROLE_KEY;
 const canTest=Boolean(staff)&&sandbox;
 return <main className="account-root"><header className="account-header">
  <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" width="40" height="40" alt=""/> AeroMind</Link>
  <Link href="/minha-conta" className="auth-secondary">Minha conta →</Link></header>
  <section className="account-container">
   <span className="auth-eyebrow">CONTRATAÇÃO · AEROMIND</span>
   <h1>Escolha sua <em>licença</em></h1>
   <p className="account-lead">Confira o plano e acompanhe a disponibilidade do Pix. A licença é ativada somente após confirmação do provedor.</p>
   <div className="account-grid">
    <section className="account-card">
      <h2>Planos disponíveis</h2>
      {plans.length?plans.map(p=><p key={p.slug}>
        <Link href={'/checkout?plano='+encodeURIComponent(p.slug)} style={{fontWeight:p.slug===current?.slug?750:400}}>
          {p.marketing_title||p.tier} · {periods[p.duration_days]||p.duration_days+' dias'} · {formattedPrice(p.price_cents)} {p.slug===current?.slug?'✓':''}
        </Link>
      </p>):<p>Nenhum plano com preço publicado no momento.</p>}
      <Link href="/planos" className="auth-secondary auth-button-link">Comparar benefícios →</Link>
    </section>
    <section className="account-card">
     <h2>{current?'Checkout: '+(current.marketing_title||current.tier):'Checkout indisponível'}</h2>
     {current?<><p><b>Preço</b><span>{formattedPrice(current.price_cents)}</span></p>
       <p><b>Período</b><span>{current.duration_days} dias</span></p>
       <p className="account-note">Identificado como {user.email}. Sem cobranças automáticas. O pagamento só será disponibilizado após homologação.</p>
       <PixCheckout key={current.slug} slug={current.slug} priceCents={current.price_cents} enabled={canTest}/>
      </>:<p className="account-note">O administrador ainda não ativou preços para venda.</p>}
    </section>
   </div>
   <div style={{marginTop:24}}><Link className="auth-secondary auth-button-link" href="/pagamentos">Meus pedidos →</Link> <Link className="auth-secondary auth-button-link" href="/suporte">Preciso de ajuda →</Link></div>
  </section></main>;
}
