import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {getVisiblePlans,formattedPrice} from '@/lib/catalog';
import {PixCheckoutForm} from '@/components/checkout/PixCheckoutForm';
export const dynamic='force-dynamic';
export const metadata={title:'Checkout | AeroMind'};
export default async function Checkout({searchParams}:{searchParams:Promise<{plano?:string}>}){
 const {plano}=await searchParams,slug=String(plano||'').slice(0,60),plans=await getVisiblePlans(),plan=plans.find(p=>p.slug===slug);
 const sb=await createClient(),{data:{user}}=await sb.auth.getUser();
 const staff=user?await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle():null;
 const sandbox=process.env.PAGGPAY_MODE==='sandbox'&&!!process.env.PAGGPAY_API_KEY&&!!process.env.PAGGPAY_WEBHOOK_SECRET&&!!process.env.PAGGPAY_WEBHOOK_URL&&!!process.env.SUPABASE_SERVICE_ROLE_KEY;
 return <main className="account-root"><header className="account-header"><Link href="/planos" className="auth-logo">← AeroMind · Planos</Link></header><div className="account-container">
 <span className="auth-eyebrow">CONTRATAÇÃO</span><h1>Seu plano <em>AeroMind</em></h1>
 {!plan?<section className="account-card"><h2>Plano indisponível</h2><p>Escolha uma opção publicada.</p><Link href="/planos">Ver planos</Link></section>:<>
 <section className="account-card" style={{maxWidth:630,marginBottom:18}}><h2>{plan.marketing_title||plan.tier}</h2><p>Prazo: {plan.duration_days} dias</p><strong style={{fontSize:29}}>{formattedPrice(plan.price_cents)}</strong><p>O aplicativo só é liberado após pagamento confirmado e licença válida.</p></section>
 {!user?<section className="account-card" style={{maxWidth:630}}><h2>Entre para continuar</h2><p>O checkout precisa estar associado à sua conta AeroMind.</p><Link className="auth-submit auth-button-link" href={'/entrar?next='+encodeURIComponent('/checkout?plano='+slug)}>Entrar na conta →</Link></section>:
 sandbox&&staff?.data?<PixCheckoutForm slug={plan.slug} baseCents={plan.price_cents}/>:
 <section className="account-card" style={{maxWidth:630}}><h2>Pagamento em preparação</h2><p>Estamos finalizando a homologação do Pix. Ainda não é possível gerar uma cobrança real neste site.</p><p>Nenhuma licença será liberada por um pagamento não confirmado.</p><Link href="/suporte" className="auth-secondary auth-button-link">Falar com o suporte →</Link></section>}
 </>}
 </div></main>;
}
