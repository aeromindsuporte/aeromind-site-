import {getVisiblePlans,formattedPrice,formattedDuration} from '@/lib/catalog';
import {benefitsOf,descriptionOf,durationLabelOf} from '@/lib/plan-display';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const dynamic='force-dynamic';
const html=(raw:string)=>raw.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]||x));
const fallback={
 Básico:{css:'am-plan-blue',symbol:'♙',description:'Monitoramento essencial',benefits:['Interface e monitor B4','Histórico do aplicativo','Alertas básicos']},
 Pro:{css:'am-plan-purple',symbol:'◈',description:'Experiência ampliada',benefits:['Módulos adicionais','Histórico completo','Previsão Rosa V4','Alertas do monitor']},
 Ultra:{css:'am-plan-gold',symbol:'♜',description:'Recursos avançados',benefits:['Ranking e estatísticas','Análises históricas','Ferramentas do monitor']}
} as const;
const periods=[{slug:'mensal',days:30,label:'Mensal'},{slug:'trimestral',days:90,label:'Trimestral'},{slug:'semestral',days:180,label:'Semestral'},{slug:'anual',days:365,label:'Anual'}] as const;
export default async function Home({searchParams}:{searchParams:Promise<{periodo?:string}>}){
 const {periodo}=await searchParams;
 const selected=periods.find(p=>p.slug===periodo)||periods[0];
 let content=await readFile(path.join(process.cwd(),'app','landing.html'),'utf8');
 const plans=await getVisiblePlans();
 // Os filtros da vitrine inicial mostram o mesmo periodo selecionado no catalogo.
 const periodLinks=periods.map(p=>'<a href="/?periodo='+p.slug+'#planos"'+
  (p.slug===selected.slug?' class="am-active-period" aria-current="page"':'')+'>'+p.label+'</a>').join('');
 content=content.replace(/<div class="am-plan-toggle" aria-label="Período de contratação">[\s\S]*?<\/div>/,
  '<div class="am-plan-toggle" aria-label="Período de contratação">'+periodLinks+'</div>');
 for(const tier of ['Básico','Pro','Ultra'] as const){
  const fallbackCard=fallback[tier];
  const p=plans.find(x=>x.tier===tier&&x.duration_days===selected.days);
  const title=html(p?.marketing_title||tier),desc=html(p?.marketing_description||fallbackCard.description);
  const price=p?html(formattedPrice(p.price_cents)):'Não publicado';
  const features=p?benefitsOf(p).slice(0,8):[...fallbackCard.benefits];
  const badge=p?.marketing_badge?'<span class="am-top-label">'+html(p.marketing_badge)+'</span>':p?.marketing_highlight?'<span class="am-top-label">EM DESTAQUE</span>':'';
  const label=p?.marketing_cta||'Ver planos';
  const destination=p?'/checkout?plano='+encodeURIComponent(p.slug):'/planos?periodo='+selected.slug;
  const replacement='<article class="am-plan '+fallbackCard.css+'">'+badge+'<span class="am-plan-icon">'+fallbackCard.symbol+'</span><h3>'+title+'</h3><strong>'+price+'</strong>'+(p?'<small>'+html(durationLabelOf(p))+'</small>':'<small>Configure no painel administrativo</small>')+'<p>'+desc+'</p><ul>'+features.map(f=>'<li>✓ '+html(f)+'</li>').join('')+'</ul><a href="'+destination+'" class="am-btn '+(p?.marketing_highlight?'am-fill':'am-outline')+'">'+html(label)+' →</a></article>';
  const reg=new RegExp('<article class="am-plan '+fallbackCard.css+'">[\\s\\S]*?<\\/article>');
  content=content.replace(reg,replacement);
 }
 const trialPlans=plans.filter(p=>p.slug==='teste-horas'||p.slug==='teste-dias');
 if(trialPlans.length){
  const trialCards=trialPlans.map(p=>{
   const title=html(p.marketing_title||(p.slug==='teste-horas'?'Teste por horas':'Teste por dias'));
   const desc=html(descriptionOf(p));
   const features=benefitsOf(p).slice(0,8);
   const badge=p.marketing_badge?'<span class="am-top-label">'+html(p.marketing_badge)+'</span>':'';
   return '<article class="am-plan am-plan-blue">'+badge+'<span class="am-plan-icon">◷</span><h3>'+title+'</h3><strong>'+html(formattedPrice(p.price_cents))+'</strong><small>'+html(durationLabelOf(p))+'</small><p>'+desc+'</p><ul>'+features.map(f=>'<li>✓ '+html(f)+'</li>').join('')+'</ul><a href="/checkout?plano='+encodeURIComponent(p.slug)+'" class="am-btn am-outline">'+html(p.marketing_cta||'Experimentar')+' →</a></article>';
  }).join('');
  const trialSection='<div class="am-plans-intro" id="testes"><span class="am-eyebrow">✦ TESTE AEROMIND</span><h2>Planos por horas ou dias</h2><p>Configure e experimente o monitor pelo período escolhido.</p></div><div class="am-plans-cards">'+trialCards+'</div>';
  content=content.replace('<p class="am-price-notice">',trialSection+'<p class="am-price-notice">');
 }
 content=content.replace('Preços podem ser exibidos após configuração pelo administrador. Contratação, pagamentos e ativação de licenças continuam indisponíveis.','As licenças são liberadas somente após o pagamento Pix confirmado pelo servidor. Consulte os planos e preços publicados.');
 content=content.replace('Ainda não. Contas gratuitas já podem ser criadas para testes. Pagamentos, ativação de licenças e download ainda não estão disponíveis.','Sim. Selecione um plano publicado e faça login para pagar por Pix. O acesso é liberado apenas após confirmação da PaggPay.');
 return <><link rel="stylesheet" href="/design-v2.css"/><div dangerouslySetInnerHTML={{__html:content}}/></>;
}
