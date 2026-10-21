import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getVisiblePlans} from '@/lib/catalog';
import {benefitsOf,durationLabelOf,titleOf,descriptionOf,durationOf} from '@/lib/plan-display';
import {activateFreeTrial} from './actions';
export const dynamic='force-dynamic';
export const metadata={title:'Teste gratuito | AeroMind',robots:{index:false,follow:false}};

const errors:Record<string,string>={
 usado:'Esta conta já utilizou o teste gratuito. Consulte sua licença ou escolha um plano pago.',
 licenca:'Sua conta já possui histórico de licença. O teste gratuito é reservado para contas novas.',
 email:'Confirme seu e-mail antes de ativar seu teste gratuito.',
 indisponivel:'Este teste não está publicado como gratuito no momento.',
 falha:'Não foi possível ativar o teste. Tente atualizar a página ou fale com o suporte.'
};
export default async function FreeTrial({searchParams}:{searchParams:Promise<{plano?:string;erro?:string}>}){
 const {plano,erro}=await searchParams;
 const slug=plano==='teste-horas'||plano==='teste-dias'?plano:'';
 if(!slug)redirect('/planos');
 const available=await getVisiblePlans();
 const plan=available.find(p=>p.slug===slug&&p.price_cents===0);
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 const active=user?await sb.rpc('aeromind_has_active_license'):null;
 const hasLicense=active?.data===true&&!active?.error;
 const claimUrl='/teste-gratis?plano='+encodeURIComponent(slug);
 return <main className="account-root">
  <header className="account-header"><Link href="/planos" className="auth-logo">← AeroMind · Planos</Link>
   <Link href="/minha-conta" className="auth-secondary">Minha conta →</Link></header>
  <div className="account-container" style={{maxWidth:740}}>
   <span className="auth-eyebrow">✦ TESTE GRATUITO</span>
   <h1>Experimente o <em>AeroMind</em></h1>
   {!plan?<section className="account-card"><h2>Teste não disponível</h2>
    <p>O administrador ainda não publicou esta modalidade gratuita.</p>
    <Link className="auth-submit auth-button-link" href="/planos">Ver planos disponíveis →</Link>
   </section>:<>
    <section className="account-card" style={{borderColor:'#8548c5',display:'grid',gap:16,background:'linear-gradient(140deg,#1e133d,#0a1930)'}}>
     <span style={{fontSize:13,fontWeight:750,color:'#abffdb'}}>✓ Sem Pix e sem cobrança</span>
     <h2 style={{fontSize:28,margin:0}}>{titleOf(plan)}</h2>
     <p>{descriptionOf(plan)}</p>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,padding:'15px 0',borderTop:'1px solid #43406b',borderBottom:'1px solid #43406b'}}>
      <span style={{fontSize:14,color:'#c5d1ee'}}>{durationLabelOf(plan)} de acesso</span>
      <strong style={{fontSize:27,color:'#9df8d1'}}>GRÁTIS</strong>
     </div>
     <ul style={{display:'grid',gap:9,paddingLeft:22,color:'#d5dff4',fontSize:14}}>
      {benefitsOf(plan).map((benefit,i)=><li key={i}>{benefit}</li>)}
     </ul>
     <p style={{fontSize:13,color:'#b7c5dc'}}>
      A validade será de {durationOf(plan)}, contada a partir da ativação.
      Disponível uma vez por conta com e-mail confirmado. O benefício não pode ser acumulado com licença já existente.
     </p>
     {erro&&<p role="alert" className="auth-alert error">{errors[erro]||errors.falha}</p>}
     {hasLicense?<div style={{display:'grid',gap:10}}>
       <p>Sua conta já possui acesso ativo. Acesse o aplicativo com a sua licença atual.</p>
       <Link className="auth-submit auth-button-link" href="/minha-conta">Abrir meu acesso →</Link>
      </div>:!user?<Link className="auth-submit auth-button-link" href={'/entrar?next='+encodeURIComponent(claimUrl)}>
       Entrar ou criar conta para ativar →
      </Link>:!user.email_confirmed_at?<div style={{display:'grid',gap:10}}>
       <p>Para ativar, confirme primeiro seu e-mail de cadastro.</p>
       <Link className="auth-secondary auth-button-link" href="/minha-conta">Ver minha conta →</Link>
      </div>:<form action={activateFreeTrial}>
        <input type="hidden" name="plan" value={slug}/>
        <button className="auth-submit" type="submit">Ativar meu teste grátis de {durationOf(plan)} →</button>
       </form>}
     <p style={{fontSize:12,color:'#99a9ce'}}>Nenhum Pix é gerado nesta modalidade. Não pedimos CPF, cartão ou senha bancária para ativar o teste.</p>
    </section>
    <p style={{fontSize:13,marginTop:22,color:'#b1c2dc'}}>Após a ativação, acesse <Link href="/download">Download</Link> e entre no AeroMind Monitor com a mesma conta.</p>
   </>}
  </div>
 </main>;
}
