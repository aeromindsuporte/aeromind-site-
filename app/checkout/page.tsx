import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getVisiblePlans,formattedPrice,formattedDuration,isTrialPlan} from '@/lib/catalog';
import {PixCheckoutForm} from '@/components/checkout/PixCheckoutForm';
import {paymentConfigured,paymentEnvironment} from '@/lib/pix/provider';
export const dynamic='force-dynamic';
export const metadata={title:'Checkout | AeroMind'};
export default async function Checkout({searchParams}:{searchParams:Promise<{plano?:string}>}){
 const {plano}=await searchParams,slug=String(plano||'').slice(0,60);
 // Checkout acessado diretamente não deve exibir um aviso legado/desativado.
 if(!slug)redirect('/planos');
 const plans=await getVisiblePlans(),plan=plans.find(p=>p.slug===slug);
 const sb=await createClient(),{data:{user}}=await sb.auth.getUser();
 const staff=user?await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle():null;
 const gatewayReady=paymentConfigured(),gatewayMode=paymentEnvironment();
 return <main className="account-root"><header className="account-header"><Link href="/planos" className="auth-logo">← AeroMind · Planos</Link></header><div className="account-container">
 <span className="auth-eyebrow">PAGAMENTO PROTEGIDO</span><h1>Seu acesso <em>AeroMind</em></h1>
 <div className="pix-progress"><span className="pix-progress-active">1. Plano escolhido</span><span className="pix-progress-active">2. Pagamento Pix</span><span>3. Acesso liberado</span></div>
 {!plan?<section className="account-card"><h2>Plano indisponível</h2><p>Escolha uma opção publicada.</p><Link href="/planos">Ver planos</Link></section>:<>
 <section className="pix-order-summary"><div className="pix-summary-icon">✦</div><div className="pix-summary-info"><span className="pix-mini-label">RESUMO DO PEDIDO</span><h2>{plan.marketing_title||plan.tier}</h2><p>{formattedDuration(plan)} de acesso {isTrialPlan(plan)?'de teste':''} ao AeroMind Monitor</p></div><div className="pix-summary-total"><span>Total</span><strong>{formattedPrice(plan.price_cents)}</strong></div></section>
 {!user?<section className="account-card" style={{maxWidth:630}}><h2>Entre para continuar</h2><p>O checkout precisa estar associado à sua conta AeroMind.</p><Link className="auth-submit auth-button-link" href={'/entrar?next='+encodeURIComponent('/checkout?plano='+slug)}>Entrar na conta →</Link></section>:
 gatewayReady&&(gatewayMode==='live'||!!staff?.data)?<PixCheckoutForm slug={plan.slug} planName={plan.marketing_title||plan.tier} baseCents={plan.price_cents} mode={gatewayMode==='live'?'live':'sandbox'}/>:
 <section className="account-card" style={{maxWidth:630}}><h2>Pagamento em preparação</h2><p>O Pix está temporariamente indisponível. Nenhuma cobrança será gerada até que o sistema esteja habilitado.</p><p>Nenhuma licença será liberada por um pagamento não confirmado.</p><Link href="/suporte" className="auth-secondary auth-button-link">Falar com o suporte →</Link></section>}
 </>}
 </div></main>;
}
