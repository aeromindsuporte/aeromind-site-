
'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useFormStatus} from 'react-dom';
import {savePlanEditor,toggleCatalogPlan} from '@/app/admin/actions';
import {benefitsOf,descriptionOf,durationOf,durationLabelOf,noPriceLabelOf,titleOf} from '@/lib/plan-display';

export type Plan = {
 slug:string;tier:string;duration_days:number;trial_quantity:number|null;
 price_cents:number|null;visible:boolean;marketing_title:string|null;
 marketing_description:string|null;marketing_badge:string|null;
 marketing_features:string[]|null;marketing_cta:string|null;marketing_highlight:boolean;
 marketing_duration_caption:string|null;marketing_unpriced_label:string|null;
};
type Tab='general'|'price'|'license'|'marketing'|'status';
type Filter='all'|'trials'|'commercial'|'published'|'hidden'|'featured';
const periods:Record<number,string>={30:'Mensal',90:'Trimestral',180:'Semestral',365:'Anual'};
const money=(cents:number|null)=>cents===null?'Sem preço':cents===0?'Grátis':(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const trial=(p:Plan)=>p.slug.startsWith('teste-');
const name=(p:Plan)=>titleOf(p);
const duration=(p:Plan)=>durationOf(p);
const symbol=(p:Plan)=>p.slug==='teste-horas'?'◷':p.slug==='teste-dias'?'▦':p.tier==='Ultra'?'♜':p.tier==='Pro'?'◈':'✦';
const publicUrl=(p:Plan)=>trial(p)?'/planos#testes':'/planos?periodo='+({30:'mensal',90:'trimestral',180:'semestral',365:'anual'} as Record<number,string>)[p.duration_days];
function SaveButton(){
 const {pending}=useFormStatus();
 return <button className="pv2-save" type="submit" disabled={pending}>{pending?'Salvando…':'Salvar alterações'}</button>;
}
export function PlansCatalogEditor({plans,initialEdit,flash}:{plans:Plan[];initialEdit?:string;flash?:string}){
 const initial=plans.find(p=>p.slug===initialEdit)||null;
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<Filter>('all');
 const [sort,setSort]=useState('group');
 const [draft,setDraft]=useState<Plan|null>(initial);
 const [price,setPrice]=useState(initial?.price_cents===null?'':initial?(initial.price_cents!/100).toFixed(2):'');
 const [freeTrial,setFreeTrial]=useState(Boolean(initial&&trial(initial)&&initial.price_cents===0));
 const [features,setFeatures]=useState(initial?benefitsOf(initial).join('\n'):'');
 const [tab,setTab]=useState<Tab>('general');
 const [newOpen,setNewOpen]=useState(false);
 const [copyOpen,setCopyOpen]=useState(false);
 const [copyTarget,setCopyTarget]=useState('');
 useEffect(()=>{
  if(!draft&&!newOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){setDraft(null);setNewOpen(false);setCopyOpen(false);}
  };
  window.addEventListener('keydown',onKey);
  return ()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey);};
 },[!!draft,newOpen]);
 const visible=plans.filter(p=>p.visible).length;
 const filtered=useMemo(()=>{
  const term=query.trim().toLocaleLowerCase('pt-BR');
  return plans.filter(p=>{
   if(term&&!(name(p)+' '+p.tier+' '+duration(p)+' '+p.slug).toLocaleLowerCase('pt-BR').includes(term))return false;
   if(filter==='trials'&&!trial(p))return false;
   if(filter==='commercial'&&trial(p))return false;
   if(filter==='published'&&!p.visible)return false;
   if(filter==='hidden'&&p.visible)return false;
   if(filter==='featured'&&(!p.marketing_highlight||!p.visible))return false;
   return true;
  }).sort((a,b)=>{
   if(sort==='name')return name(a).localeCompare(name(b),'pt-BR');
   if(sort==='price')return (a.price_cents??Number.MAX_SAFE_INTEGER)-(b.price_cents??Number.MAX_SAFE_INTEGER);
   if(sort==='status')return Number(b.visible)-Number(a.visible)||name(a).localeCompare(name(b),'pt-BR');
   const group=(p:Plan)=>trial(p)?0:p.tier==='Básico'?1:p.tier==='Pro'?2:3;
   return group(a)-group(b)||a.duration_days-b.duration_days;
  });
 },[plans,query,filter,sort]);
 function open(p:Plan,section:Tab='general'){
  setDraft({...p,marketing_features:[...(p.marketing_features||[])]});
  setPrice(p.price_cents===null?'':(p.price_cents/100).toFixed(2));
  setFreeTrial(trial(p)&&p.price_cents===0);
  setFeatures(benefitsOf(p).join('\n'));setTab(section);setNewOpen(false);setCopyOpen(false);
 }
 function close(){setDraft(null);setCopyOpen(false);}
 function update(changes:Partial<Plan>){setDraft(p=>p?{...p,...changes}:null);}
 function copyMarketing(){
  if(!draft)return;
  const target=plans.find(p=>p.slug===copyTarget);
  if(!target)return;
  const source=draft;
  open({...target,marketing_title:source.marketing_title,marketing_description:source.marketing_description,
   marketing_badge:source.marketing_badge,marketing_features:source.marketing_features,
   marketing_cta:source.marketing_cta,marketing_highlight:false},'marketing');
 }
 const filters:[Filter,string][]=[['all','Todos'],['trials','Testes'],['commercial','Comerciais'],
  ['published','Publicados'],['hidden','Ocultos'],['featured','Destaques']];
 const tabs:[Tab,string][]=[['general','Geral'],['price','Preço'],['license','Licença'],['marketing','Divulgação'],['status','Status']];
 const available=plans.filter(p=>!p.visible&&p.price_cents===null);
 return <div className="pv2-root">
  <div className="pv2-header">
   <div><span className="pv2-eyebrow">GESTÃO DE PLANOS</span><h2>Seu catálogo em um só lugar</h2>
    <p>Organize os planos, edite a divulgação e controle o que aparece para seus clientes.</p></div>
   <div className="pv2-header-buttons">
    <Link href="/planos" target="_blank" rel="noreferrer" className="pv2-outline">↗ Ver página de vendas</Link>
    <button className="pv2-primary" type="button" onClick={()=>setNewOpen(true)}>＋ Novo plano</button>
   </div>
  </div>
  <div className="pv2-metrics">
   {[
    ['Modelos disponíveis',plans.length,'purple'],['Publicados',visible,'green'],
    ['Ocultos',plans.length-visible,'pink'],['Planos de teste',plans.filter(trial).length,'blue']
   ].map(([label,value,color])=><div key={label} className={'pv2-metric '+color}><strong>{value}</strong><span>{label}</span></div>)}
  </div>
  <div className="pv2-toolbar">
   <div className="pv2-chips">{filters.map(([key,label])=><button type="button" key={key}
    aria-pressed={filter===key} className={filter===key?'selected':''} onClick={()=>setFilter(key)}>{label}</button>)}</div>
   <div className="pv2-controls">
    <label><span className="sr-only">Buscar planos</span><input type="search" value={query} placeholder="⌕ Buscar plano…"
      onChange={e=>setQuery(e.target.value)}/></label>
    <label className="pv2-sort">Ordenar por <select value={sort} onChange={e=>setSort(e.target.value)}>
     <option value="group">Tipo e duração</option><option value="name">Nome</option>
     <option value="price">Menor preço</option><option value="status">Publicados primeiro</option></select></label>
   </div>
  </div>
  <div className="pv2-grid">
   {filtered.map(p=><article className={'pv2-card '+(p.visible&&p.marketing_highlight?'featured':'')} key={p.slug}>
    <div className="pv2-card-top">
     <span className={'pv2-chip '+(p.visible?'published':'hidden')}>{p.visible?'● Publicado':'○ Oculto'}</span>
     {p.visible&&p.marketing_highlight&&<span className="pv2-chip feature">★ Destaque</span>}
     <form action={toggleCatalogPlan} className="pv2-switch-form">
      <input type="hidden" name="slug" value={p.slug}/><input type="hidden" name="visible" value={String(!p.visible)}/>
      <button type="submit" role="switch" aria-checked={p.visible} aria-label={p.visible?'Ocultar '+name(p):'Publicar '+name(p)}
       className={'pv2-switch '+(p.visible?'on':'')} title={p.visible?'Ocultar':'Publicar'}><span/></button>
     </form>
    </div>
    <div className={'pv2-plan-icon '+(trial(p)?'trial':p.tier.toLowerCase()==='pro'?'pro':p.tier==='Ultra'?'ultra':'basic')}>{symbol(p)}</div>
    <h3>{name(p)}</h3>
    <p className="pv2-card-desc">{descriptionOf(p)}</p>
    <div className="pv2-price"><strong>{p.price_cents===null?noPriceLabelOf(p):money(p.price_cents)}</strong><span>{durationLabelOf(p)}</span></div>
    <div className="pv2-features">
     {benefitsOf(p).slice(0,3).map((f,i)=>
      <span key={i}><b>✓</b>{f}</span>)}
    </div>
    <div className="pv2-card-actions">
     <button type="button" className="pv2-edit" onClick={()=>open(p)}>Editar</button>
     <Link href={publicUrl(p)} target="_blank" rel="noreferrer" className="pv2-icon-btn"
      aria-label={'Visualizar '+name(p)} title="Ver na página pública">↗</Link>
     <button className="pv2-icon-btn" type="button" title="Copiar divulgação para outro modelo"
      aria-label={'Copiar divulgação de '+name(p)} onClick={()=>{open(p,'marketing');setCopyOpen(true);setCopyTarget('');}}>⧉</button>
    </div>
   </article>)}
   {!filtered.length&&<div className="pv2-empty">Não há planos para esse filtro ou busca.</div>}
  </div>
  <div className="pv2-footnote">
   <strong>Novo plano:</strong> selecione um dos modelos pré-configurados que ainda não foram utilizados.
   Os modelos de licença e duração suportados são mantidos para preservar o checkout e compras já realizadas.
  </div>

  {newOpen&&<div className="pv2-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setNewOpen(false);}}>
   <section className="pv2-picker" role="dialog" aria-modal="true" aria-label="Escolher modelo de plano">
    <header><div><span className="pv2-eyebrow">NOVO PLANO</span><h2>Escolha um modelo</h2>
     <p>Selecione uma opção e configure preço, divulgação e publicação.</p></div>
     <button type="button" className="pv2-close" onClick={()=>setNewOpen(false)} aria-label="Fechar">×</button></header>
    <div className="pv2-template-list">
     {available.map(p=><button type="button" key={p.slug} onClick={()=>open(p,'price')}>
      <span className="pv2-template-icon">{symbol(p)}</span><span><strong>{name(p)}</strong>
       <small>{duration(p)} · {p.tier}</small></span><b>Configurar →</b></button>)}
     {!available.length&&<p>Todos os modelos disponíveis já foram configurados. Edite um plano existente.</p>}
    </div>
   </section>
  </div>}

  {draft&&<div className="pv2-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close();}}>
   <aside className="pv2-drawer" role="dialog" aria-modal="true" aria-label={'Editar '+name(draft)}>
    <header className="pv2-drawer-head"><div><span className="pv2-eyebrow">EDITAR PLANO</span>
     <h2>{name(draft)}</h2><p>{duration(draft)} · {draft.tier}</p></div>
     <button type="button" className="pv2-close" onClick={close} aria-label="Fechar editor">×</button></header>
    {flash&&draft.slug===initialEdit&&<div className={'pv2-flash '+(flash==='plan-saved'?'success':'error')} role="status">
     {flash==='plan-saved'?'Plano salvo com sucesso. A vitrine pública já pode mostrar a alteração.':
      flash==='price'?'Para publicar é necessário definir preço de pelo menos R$ 2,00.':
      'Não foi possível salvar. Revise os dados e tente novamente.'}
    </div>}
    {copyOpen?<div className="pv2-copy">
     <h3>Copiar divulgação</h3>
     <p>Escolha outro modelo. Seus preços e publicação serão preservados. Os textos serão copiados no editor, mas só terão efeito após salvar.</p>
     <select value={copyTarget} onChange={e=>setCopyTarget(e.target.value)}><option value="">Selecione o plano de destino…</option>
      {plans.filter(p=>p.slug!==draft.slug).map(p=><option key={p.slug} value={p.slug}>{name(p)} — {duration(p)}</option>)}</select>
     <div className="pv2-drawer-buttons"><button type="button" className="pv2-outline" onClick={()=>setCopyOpen(false)}>Cancelar</button>
      <button type="button" className="pv2-primary" disabled={!copyTarget} onClick={copyMarketing}>Continuar</button></div>
    </div>:<>
     <nav className="pv2-tabs" aria-label="Abas de configuração">
      {tabs.map(([key,label])=><button type="button" key={key} onClick={()=>setTab(key)}
       aria-current={tab===key?'page':undefined} className={tab===key?'current':''}>{label}</button>)}
     </nav>
     <form action={savePlanEditor} className="pv2-form" key={draft.slug}>
      <input type="hidden" name="slug" value={draft.slug}/>
      <div className="pv2-form-body">
       <section hidden={tab!=='general'} className="pv2-panel">
        <h3>Informações gerais</h3><p>Dados do plano utilizados na contratação.</p>
        <label>Categoria<input readOnly value={draft.tier}/></label>
        <label>Identificador do plano<input readOnly value={draft.slug}/></label>
        {trial(draft)?<label>Duração em {draft.slug==='teste-horas'?'horas (1 a 72)':'dias (1 a 30)'}
         <input type="number" name="quantity" min={1} step={1} max={draft.slug==='teste-horas'?72:30}
          required value={draft.trial_quantity??1} onChange={e=>update({trial_quantity:Number(e.target.value)})}/></label>:
         <><input type="hidden" name="quantity" value=""/><label>Duração comercial<input readOnly value={duration(draft)}/></label></>}
        <label>Título comercial<input name="title" value={draft.marketing_title??''} maxLength={65}
         placeholder={name({...draft,marketing_title:null})} onChange={e=>update({marketing_title:e.target.value})}/></label>
        <label>Legenda mostrada abaixo do preço<input name="duration_caption" value={draft.marketing_duration_caption||''} maxLength={80}
         placeholder={'por '+duration(draft)} onChange={e=>update({marketing_duration_caption:e.target.value})}/></label>
        <div className="pv2-info">O texto é personalizado, mas a validade contratada continua sendo {duration(draft)}. Não use uma legenda que prometa prazo diferente.</div>
        <div className="pv2-info">Todas as abas serão salvas juntas quando você tocar em “Salvar alterações”.</div>
       </section>
       <section hidden={tab!=='price'} className="pv2-panel">
        <h3>Preço e cobrança</h3><p>Valor cobrado nos novos pedidos deste plano.</p>
        {trial(draft)&&<label className="pv2-checkbox"><input type="checkbox" name="free_trial" checked={freeTrial}
          onChange={e=>{setFreeTrial(e.target.checked);setPrice(e.target.checked?'0.00':'');}}/>
          <span><strong>Teste gratuito (sem Pix)</strong>
           <small>R$ 0,00 — clientes novos com e-mail confirmado poderão ativar uma única vez. Não cria cobranças.</small></span></label>}
        <label>Preço (R$)<input type="number" name="price" step="0.01" min={0} inputMode="decimal"
         placeholder="Ex.: 29,90" value={price} readOnly={freeTrial} onChange={e=>setPrice(e.target.value)}/></label>
        <label>Texto quando o plano estiver sem preço<input name="unpriced_label" value={draft.marketing_unpriced_label||''}
         maxLength={40} placeholder="Sem preço" onChange={e=>update({marketing_unpriced_label:e.target.value})}/></label>
        <p>Essa mensagem é usada no catálogo administrativo enquanto o plano está sem preço. Não substitui o valor real exigido para publicar ou cobrar.</p>
        <div className="pv2-info"><strong>{freeTrial?'Teste gratuito selecionado — R$ 0,00':'Pix mínimo: R$ 2,00'}</strong> {freeTrial?'Ao salvar, esse teste será configurado por R$ 0,00, sem cobrança ou Pix.':'Marque “Teste gratuito (sem Pix)” para disponibilizar um teste sem pagamento. Planos pagos exigem pelo menos R$ 2,00.'}</div>
        <p>Os preços de pedidos e licenças já contratados não mudam com esta edição.</p>
       </section>
       <section hidden={tab!=='license'} className="pv2-panel">
        <h3>Configuração da licença</h3><p>Como o acesso será liberado quando o pagamento for confirmado.</p>
        <div className="pv2-info"><strong>Prazo contratado:</strong> {duration(draft)}</div>
        <div className="pv2-info"><strong>Ativação:</strong> o prazo é incorporado à licença após confirmação da PaggPay.</div>
        <div className="pv2-info"><strong>Dispositivos:</strong> o limite ainda é gerenciado por cliente na área de Licenças, não individualmente por plano.</div>
        <Link className="pv2-textlink" href="/admin/licencas">Abrir gerenciamento de licenças ↗</Link>
       </section>
       <section hidden={tab!=='marketing'} className="pv2-panel">
        <h3>Divulgação do card</h3><p>Textos que aparecem na página inicial e na página de planos.</p>
        <label>Descrição<input name="description" value={draft.marketing_description??''} maxLength={240}
         onChange={e=>update({marketing_description:e.target.value})} placeholder={descriptionOf({...draft,marketing_description:null})}/></label>
        <label>Selo<input name="badge" maxLength={38} value={draft.marketing_badge||''}
         onChange={e=>update({marketing_badge:e.target.value})} placeholder="Ex.: Mais popular"/></label>
        <label>Benefícios anunciados (até 8, um por linha)<textarea name="features" rows={6} value={features} maxLength={1000}
         onChange={e=>setFeatures(e.target.value)} placeholder="Histórico de resultados&#10;Alertas no aplicativo"/></label>
        <div className="pv2-info">Edite ou apague os textos de exemplo. Estes benefícios são anúncios; as permissões reais das funções do aplicativo precisam de integração técnica própria.</div>
        <label>Texto do botão<input name="cta" maxLength={40} value={draft.marketing_cta||''}
         onChange={e=>update({marketing_cta:e.target.value})} placeholder="Escolher plano"/></label>
        <label className="pv2-checkbox"><input name="highlight" type="checkbox" checked={draft.marketing_highlight}
         onChange={e=>update({marketing_highlight:e.target.checked})}/><span><strong>Destacar card</strong>
          <small>Selo de destaque no site público</small></span></label>
        <div className="pv2-preview"><span>PRÉVIA DO CARD</span><h4>{name(draft)}</h4>
         <strong>{price!==''?money(Math.round(Number(price)*100)):noPriceLabelOf(draft)}</strong>
         <small>{durationLabelOf(draft)}</small>
         <p>{descriptionOf(draft)}</p>
         <ul className="pv2-preview-features">{features.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8).map((x,i)=><li key={i}>✓ {x}</li>)}</ul>
        </div>
       </section>
       <section hidden={tab!=='status'} className="pv2-panel">
        <h3>Publicação</h3><p>Controle a visibilidade do plano no site.</p>
        <label className="pv2-checkbox"><input type="checkbox" name="visible" checked={draft.visible}
         onChange={e=>update({visible:e.target.checked})}/><span><strong>Publicar plano</strong>
          <small>Plano pago gera Pix; teste gratuito exige conta e e-mail confirmado, sem pagamento.</small></span></label>
        <div className="pv2-info">{draft.visible?(trial(draft)&&freeTrial?'Teste grátis: publicado sem Pix após salvar':'Publicado depois de salvar'):'Oculto depois de salvar'}</div>
        {trial(draft)&&draft.visible&&!freeTrial&&!price&&
         <div className="pv2-info" role="alert">Para publicar gratuitamente, abra a aba Preço e marque “Teste gratuito (sem Pix)”.</div>}
        <Link className="pv2-textlink" href={publicUrl(draft)} target="_blank" rel="noreferrer">Ver página de vendas ↗</Link>
       </section>
      </div>
      <footer className="pv2-form-footer"><button type="button" className="pv2-outline" onClick={close}>Cancelar</button>
       <SaveButton/></footer>
     </form>
    </>}
   </aside>
  </div>}
 </div>;
}
