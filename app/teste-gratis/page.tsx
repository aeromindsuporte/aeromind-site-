import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getVisiblePlans} from '@/lib/catalog';
import {benefitsOf,durationLabelOf,titleOf,durationOf} from '@/lib/plan-display';
import {TrialAvailability} from '@/components/trial/TrialAvailability';
import {activateFreeTrial} from './actions';
import './trial-premium.css';

export const dynamic='force-dynamic';
export const metadata={title:'Teste gratuito | AeroMind',robots:{index:false,follow:false}};

const errors:Record<string,string>={
 usado:'Esta conta já utilizou o teste gratuito. Consulte sua licença ou escolha um plano pago.',
 licenca:'Sua conta já possui histórico de licença. O teste gratuito é reservado para contas novas.',
 email:'Confirme seu e-mail antes de ativar seu teste gratuito.',
 indisponivel:'Este teste não está publicado como gratuito no momento.',
 vagas:'As ativações gratuitas deste lote foram preenchidas. Verifique se um novo lote está disponível.',
 falha:'Não foi possível ativar o teste. Atualize a página ou fale com o suporte.'
};

function Aircraft(){
 return <svg className="trial-airplane" viewBox="0 0 290 180" role="img" aria-label="Avião ilustrativo AeroMind">
  <defs><linearGradient id="trial-airplane-glow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff93d7"/><stop offset=".55" stopColor="#ff20a8"/><stop offset="1" stopColor="#c40cff"/></linearGradient></defs>
  <path d="M4 165 Q78 153 125 103 Q165 69 256 25" fill="none" stroke="#ef169c" strokeWidth="3" opacity=".7"/>
  <path d="M55 122 37 110 43 104 84 107 117 91 108 84 61 85 52 78 63 71 139 76 195 49 266 16 278 18 274 31 240 63 167 94 153 119 141 120 140 107 101 120 90 140 80 142 85 117 55 122Z" fill="#670938" stroke="url(#trial-airplane-glow)" strokeWidth="3" strokeLinejoin="round"/>
  <path d="M80 112 204 64 262 25M140 80 153 94M155 72 176 91M108 100 119 110" fill="none" stroke="#ff8cc7" strokeWidth="2" opacity=".8"/>
  <path d="M202 65 226 39 254 27 238 53Z" fill="#350d40" stroke="#ff76b8" strokeWidth="2"/>
  <path d="M240 21 279 12 272 29 242 43" fill="#f3169f" opacity=".45"/>
 </svg>;
}
const fallbackFeatures=['Monitoramento Premium','Histórico do aplicativo','Acesso por tempo definido'];
function Icon({index}:{index:number}){
 return <span className="trial-feature-symbol" aria-hidden="true">{index===0?
 <svg viewBox="0 0 36 36" fill="none"><rect x="6" y="21" width="5" height="10" rx="1" fill="currentColor"/><rect x="15" y="12" width="5" height="19" rx="1" fill="currentColor"/><rect x="24" y="5" width="5" height="26" rx="1" fill="currentColor"/></svg>:
 index===1?<svg viewBox="0 0 36 36" fill="none"><rect x="9" y="5" width="20" height="26" rx="3" stroke="currentColor" strokeWidth="3"/><path d="M14 13h11M14 19h11M14 25h7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>:
 <svg viewBox="0 0 36 36" fill="none"><path d="M18 3 30 8v9c0 8-5 13-12 16C11 30 6 25 6 17V8Z" fill="currentColor"/><path d="m12 17 4 4 8-9" stroke="#150b32" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>;
}

export default async function FreeTrial({searchParams}:{searchParams:Promise<{plano?:string;erro?:string}>}){
 const {plano,erro}=await searchParams;
 const slug=plano==='teste-horas'||plano==='teste-dias'?plano:'';
 if(!slug)redirect('/planos');
 const visiblePlans=await getVisiblePlans();
 const plan=visiblePlans.find(p=>p.slug===slug&&p.price_cents===0);
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 const [active,availability]=await Promise.all([
  user?sb.rpc('aeromind_has_active_license'):Promise.resolve(null),
  plan?sb.rpc('aeromind_public_free_trial_slots',{p_slug:slug}):Promise.resolve(null)
 ]);
 const hasLicense=active?.data===true&&!active?.error;
 const remaining=typeof availability?.data==='number'&&Number.isInteger(availability.data)&&availability.data>=0?availability.data:null;
 const exhausted=remaining===0;
 const claimUrl='/teste-gratis?plano='+encodeURIComponent(slug);
 const premium=plan?.tier==='Pro'||plan?.tier==='Ultra';
 const features=plan?(benefitsOf(plan).length?benefitsOf(plan):premium?fallbackFeatures:[]):[];
 const buttonText='Garantir teste grátis agora';

 return <main className="account-root trial-page">
  <header className="account-header trial-header">
   <Link href="/planos" className="auth-logo">← AeroMind · Planos</Link>
   <Link href="/minha-conta" className="auth-secondary">Minha conta →</Link>
  </header>
  <div className="account-container trial-container">
   <div className="trial-intro">
    <span className="auth-eyebrow trial-eyebrow"><span aria-hidden="true">✦</span> TESTE GRATUITO</span>
    <div className="trial-heading-wrap">
     <h1>Experimente o <em>AeroMind</em></h1>
     <Aircraft/>
    </div>
    <p className="trial-lead">Conheça na prática os recursos do sistema com acesso temporário e sem custo.</p>
   </div>

   {!plan?<section className="trial-premium-card trial-unavailable">
    <h2>Teste não disponível</h2>
    <p>O administrador ainda não publicou esta modalidade gratuita.</p>
    <Link className="trial-action-button" href="/planos">Ver planos disponíveis →</Link>
   </section>:<>
    <TrialAvailability slug={slug} initialRemaining={remaining}/>
    <section className="trial-premium-card" aria-label="Detalhes do teste gratuito AeroMind">
     <div className="trial-no-pix"><span aria-hidden="true">✓</span> Sem Pix e sem cobrança</div>
     <h2>{titleOf(plan)}</h2>
     <p className="trial-description">Experimente os recursos <strong>{premium?'Premium':plan.tier}</strong> pelo período escolhido.</p>

     <div className="trial-price-row">
      <div className="trial-duration"><span className="trial-clock-icon" aria-hidden="true">◷</span><strong>{plan.slug==='teste-horas'?String(plan.trial_quantity||1)+'h':durationLabelOf(plan).replace(/^por /,'')}</strong> de acesso</div>
      <span className="trial-price-zero">GRÁTIS</span>
     </div>
     <ul className="trial-feature-grid">
      {features.map((feature,i)=><li key={i}><Icon index={i}/><span>{feature=== 'Monitoramento Premium'?<>Monitoramento <strong>Premium</strong></>:feature}</span></li>)}
     </ul>
     <p className="trial-terms">A validade será de {durationOf(plan)}, contada a partir da ativação.<br/>
      Disponível uma vez por conta com e-mail confirmado.<br/>
      O benefício não pode ser acumulado com licença já existente.</p>

     {erro&&<p role="alert" className="auth-alert error trial-error">{errors[erro]||errors.falha}</p>}
     <div className={'trial-active-badge'+(exhausted?' trial-inactive':'')} role="status">
      <span className="trial-live-dot" aria-hidden="true"/>
      {exhausted?'LOTE ESGOTADO':remaining===null?'CONSULTE A DISPONIBILIDADE':'LIBERAÇÃO ATIVA'}
     </div>
     <div className="trial-activation">
      {exhausted?<Link className="trial-action-button" href="/planos">Conhecer os planos disponíveis <span aria-hidden="true">→</span></Link>:
       hasLicense?<Link className="trial-action-button" href="/minha-conta">Abrir meu acesso <span aria-hidden="true">→</span></Link>:
       !user?<Link className="trial-action-button" href={'/entrar?next='+encodeURIComponent(claimUrl)}>
        <svg className="trial-gift-icon" width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
 <rect x="4" y="15" width="28" height="17" rx="2" fill="currentColor"/>
 <rect x="3" y="12" width="30" height="7" rx="2" fill="currentColor"/>
 <path d="M18 12V32" stroke="#ec12b3" strokeWidth="3"/>
 <path d="M18 12C16 7 11 4 8 7c-3 4 2 6 10 5Zm0 0c2-5 7-8 10-5 3 4-2 6-10 5Z" stroke="currentColor" strokeWidth="2.5"/>
 </svg>{buttonText}<span className="trial-action-arrow" aria-hidden="true">→</span>
       </Link>:!user.email_confirmed_at?<div className="trial-email-warning">
        <p>Confirme seu e-mail de cadastro para ativar o teste gratuito.</p>
        <Link className="trial-action-button" href="/minha-conta">Confirmar e-mail para continuar <span aria-hidden="true">→</span></Link>
       </div>:<form action={activateFreeTrial}>
        <input type="hidden" name="plan" value={slug}/>
        <button className="trial-action-button" type="submit">
         <svg className="trial-gift-icon" width="38" height="38" viewBox="0 0 36 36" fill="none" aria-hidden="true">
 <rect x="4" y="15" width="28" height="17" rx="2" fill="currentColor"/>
 <rect x="3" y="12" width="30" height="7" rx="2" fill="currentColor"/>
 <path d="M18 12V32" stroke="#ec12b3" strokeWidth="3"/>
 <path d="M18 12C16 7 11 4 8 7c-3 4 2 6 10 5Zm0 0c2-5 7-8 10-5 3 4-2 6-10 5Z" stroke="currentColor" strokeWidth="2.5"/>
 </svg>{buttonText}<span className="trial-action-arrow" aria-hidden="true">→</span>
        </button>
       </form>}
     </div>
     <p className="trial-safe-note"><span aria-hidden="true">♙</span> Nenhum Pix é gerado nesta modalidade. Não pedimos CPF, cartão ou senha bancária para ativar o teste.</p>
    </section>
    <p className="trial-download-note"><span aria-hidden="true">⇩</span> Após a ativação, acesse <Link href="/download">Download</Link> e entre no AeroMind Monitor.</p>
   </>}
  </div>
 </main>;
}
