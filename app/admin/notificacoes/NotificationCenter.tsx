'use client';
import {useEffect,useMemo,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {DEFAULT_NOTIFICATION,NOTIFICATION_CATEGORIES,NOTIFICATION_STATUS} from '@/lib/notification-types';
import type {NotificationCampaign,NotificationInput} from '@/lib/notification-types';
import {saveNotification,sendSavedNotification,cancelScheduledNotification} from './actions';
type Stats={drafts:number;scheduled:number;sentToday:number;reads:number};
type CustomerChoice={id:string;label:string};
const date=(s:string|null)=>s?new Date(s).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}):'—';
const todayLocal=(iso:string|null)=>{if(!iso)return '';const d=new Date(iso);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const LOCAL_DRAFT_KEY='aeromind-admin-notification-edit-v1';
const validityChoices=[{value:'5',label:'5 minutos'},{value:'15',label:'15 minutos'},{value:'30',label:'30 minutos'},{value:'60',label:'1 hora'},{value:'1440',label:'24 horas'},{value:'none',label:'Sem expiração'}];
const targets=[{key:'active',label:'Todos com licença ativa'},{key:'all',label:'Todos os cadastrados'},{key:'tier',label:'Por plano'},{key:'user',label:'Cliente específico'}];
export function NotificationCenter({campaigns,stats,customers,readCounts}:{
 campaigns:NotificationCampaign[];stats:Stats;customers:CustomerChoice[];readCounts:Record<string,number>
}){
 const router=useRouter();
 const [form,setForm]=useState<NotificationInput>({...DEFAULT_NOTIFICATION});
 const [editingId,setEditingId]=useState<string|null>(null);
 const [filter,setFilter]=useState('all');
 const [search,setSearch]=useState('');
 const [preview,setPreview]=useState<'site'|'app'|'push'>('site');
 const [feedback,setFeedback]=useState<{ok:boolean;text:string}|null>(null);
 const [pending,startTransition]=useTransition();
 const [showAdvanced,setShowAdvanced]=useState(false);
 const [draftRestored,setDraftRestored]=useState(false);
 // Evita perder o que foi digitado em refresh de sessão, retorno de aba ou teclado móvel.
 useEffect(()=>{
  try{
   const raw=window.sessionStorage.getItem(LOCAL_DRAFT_KEY);
   if(raw){
    const data=JSON.parse(raw) as {form:NotificationInput;editingId:string|null;updatedAt:number};
    if(data&&data.form&&typeof data.form.title==='string'&&typeof data.form.body==='string'
     &&Number.isFinite(data.updatedAt)&&Date.now()-data.updatedAt<12*60*60*1000){
      setForm({...DEFAULT_NOTIFICATION,...data.form});
      setEditingId(data.editingId||null);
    }else window.sessionStorage.removeItem(LOCAL_DRAFT_KEY);
   }
  }catch{/* Armazenamento local bloqueado: editor continua funcionando. */}
  setDraftRestored(true);
 },[]);
 useEffect(()=>{
  if(!draftRestored)return;
  const timeout=window.setTimeout(()=>{
   try{
    if(!form.title.trim()&&!form.body.trim()&&!editingId){
     window.sessionStorage.removeItem(LOCAL_DRAFT_KEY);
    }else{
     window.sessionStorage.setItem(LOCAL_DRAFT_KEY,JSON.stringify({form,editingId,updatedAt:Date.now()}));
    }
   }catch{/* Sem espaço local: salvamento no servidor não é afetado. */}
  },300);
  return ()=>window.clearTimeout(timeout);
 },[draftRestored,form,editingId]);
 const update=<K extends keyof NotificationInput>(key:K,value:NotificationInput[K])=>
   setForm(current=>({...current,[key]:value}));
 const filtered=useMemo(()=>campaigns.filter(c=>{
  const inGroup=filter==='all'||(filter==='draft'&&c.status==='draft')||
   (filter==='scheduled'&&c.status==='scheduled')||(filter==='template'&&c.status==='template')||
   (filter==='sent'&&c.status==='sent');
  const term=search.trim().toLocaleLowerCase('pt-BR');
  return inGroup&&(!term||[c.title,c.body,NOTIFICATION_CATEGORIES[c.category]].some(v=>v.toLocaleLowerCase('pt-BR').includes(term)));
 }),[campaigns,filter,search]);
 const reset=()=>{
   setForm({...DEFAULT_NOTIFICATION});setEditingId(null);setFeedback(null);
   try{window.sessionStorage.removeItem(LOCAL_DRAFT_KEY);}catch{}
   document.getElementById('notification-editor')?.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'});
 };
 const openCampaign=(c:NotificationCampaign)=>{
   if(c.status==='sent'||c.status==='cancelled'){
    setEditingId(null);setFeedback({ok:true,text:'Mensagem já enviada: carregada como nova cópia editável.'});
   }else{setEditingId(c.id);setFeedback(null);}
   setForm({id:c.status==='sent'||c.status==='cancelled'?undefined:c.id,
    title:c.title,body:c.body,category:c.category,audience_type:c.audience_type,
    audience_tier:c.audience_tier,audience_user_id:c.audience_user_id,
    priority:c.priority,validity_minutes:c.validity_minutes,
    cta_label:c.cta_label,cta_path:c.cta_path,status:c.status==='sent'||c.status==='cancelled'?'draft':c.status,
    scheduled_at:c.status==='scheduled'?c.scheduled_at:null,
    channel_site:true,channel_app:false,channel_push:false
   });
   document.getElementById('notification-editor')?.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'});
 };
 const runSafely=(action:()=>Promise<void>)=>{
  startTransition(async()=>{
   try{await action();}
   catch{
    setFeedback({ok:false,text:'Não foi possível concluir a operação. Sua mensagem foi mantida no editor; verifique a conexão ou entre novamente.'});
   }
  });
 };
 const persist=(mode:'draft'|'template'|'scheduled',sendImmediately=false)=>{
  if(sendImmediately&&!window.confirm('Enviar esta notificação agora para o público selecionado? Essa ação não pode ser desfeita.'))return;
  setFeedback(null);
  runSafely(async()=>{
   const data:NotificationInput={...form,id:editingId||undefined,status:mode,scheduled_at:mode==='scheduled'?form.scheduled_at:null};
   const saved=await saveNotification(data);
   if(!saved.ok||!saved.id){setFeedback({ok:false,text:saved.message});return;}
   setEditingId(saved.id);
   setForm({...data,id:saved.id});
   if(sendImmediately){
    const published=await sendSavedNotification(saved.id);
    setFeedback({ok:published.ok,text:published.message});
    if(published.ok){setEditingId(null);setForm({...DEFAULT_NOTIFICATION});try{window.sessionStorage.removeItem(LOCAL_DRAFT_KEY);}catch{}}
   }else setFeedback({ok:true,text:saved.message});
   router.refresh();
  });
 };
 const sendRow=(c:NotificationCampaign)=>{
   if(!window.confirm('Enviar agora: '+c.title+'? Destinatários elegíveis receberão esta mensagem no site.'))return;
   setFeedback(null);
   runSafely(async()=>{
    const result=await sendSavedNotification(c.id);
    setFeedback({ok:result.ok,text:result.message});
    router.refresh();
   });
 };
 const duplicateRow=(c:NotificationCampaign)=>{
  runSafely(async()=>{
   const copy:NotificationInput={title:c.title+' (cópia)',body:c.body,category:c.category,
    audience_type:c.audience_type,audience_tier:c.audience_tier,audience_user_id:c.audience_user_id,
    priority:c.priority,validity_minutes:c.validity_minutes,cta_label:c.cta_label,cta_path:c.cta_path,
    channel_site:true,channel_app:false,channel_push:false,status:'draft',scheduled_at:null};
   const result=await saveNotification(copy);
   setFeedback({ok:result.ok,text:result.ok?'Cópia salva como rascunho.':result.message});
   if(result.ok){setEditingId(result.id||null);setForm({...copy,id:result.id});}
   router.refresh();
  });
 };
 const cancelRow=(c:NotificationCampaign)=>{
  if(!window.confirm('Cancelar o agendamento desta notificação? Ela voltará aos rascunhos.'))return;
  runSafely(async()=>{
   const result=await cancelScheduledNotification(c.id);
   setFeedback({ok:result.ok,text:result.message});router.refresh();
  });
 };
 const publicName=form.audience_type==='active'?'Todos os usuários ativos':
  form.audience_type==='all'?'Todos os cadastrados':
  form.audience_type==='tier'?'Plano '+(form.audience_tier||'—'):'Cliente selecionado';
 return <div className="nc-root">
  <section className="nc-stats" aria-label="Indicadores da central">
    {[
     {icon:'▤',title:'Rascunhos e modelos',value:stats.drafts,tone:'purple'},
     {icon:'◷',title:'Agendadas',value:stats.scheduled,tone:'cyan'},
     {icon:'➤',title:'Enviadas hoje',value:stats.sentToday,tone:'mint'},
     {icon:'▥',title:'Notificações lidas',value:stats.reads,tone:'violet'}
    ].map(s=><div className={'nc-stat '+s.tone} key={s.title}>
      <span className="nc-stat-icon" aria-hidden="true">{s.icon}</span>
      <span className="nc-stat-label">{s.title}<strong>{s.value.toLocaleString('pt-BR')}</strong></span>
    </div>)}
  </section>
  {feedback&&<p className={'nc-feedback '+(feedback.ok?'success':'error')} role={feedback.ok?'status':'alert'}>{feedback.text}</p>}
  <div className="nc-workspace">
   <section className="nc-panel nc-editor" id="notification-editor">
    <div className="nc-panel-heading">
      <span className="nc-heading-icon" aria-hidden="true">✎</span>
      <h2>{editingId?'Editar notificação':'Nova notificação'}</h2>
      {editingId&&<button className="nc-text-action" type="button" onClick={reset}>Limpar</button>}
    </div>
    <p className="nc-editor-hint">Seu texto é preservado nesta aba enquanto você edita. O envio só ocorre ao confirmar.</p>
    <label className="nc-field"><span>Título da notificação <small>{form.title.length}/100</small></span>
      <input type="text" maxLength={100} placeholder="Ex.: Radar Ao Vivo — condição observada" value={form.title} onChange={e=>update('title',e.target.value)}/>
    </label>
    <div className="nc-form-grid">
      <label className="nc-field"><span>Categoria</span>
        <select value={form.category} onChange={e=>update('category',e.target.value as NotificationInput['category'])}>
          {Object.entries(NOTIFICATION_CATEGORIES).map(([key,name])=><option value={key} key={key}>{name}</option>)}
        </select>
      </label>
      <label className="nc-field"><span>Público-alvo</span>
        <select value={form.audience_type} onChange={e=>update('audience_type',e.target.value as NotificationInput['audience_type'])}>
          {targets.map(t=><option value={t.key} key={t.key}>{t.label}</option>)}
        </select>
      </label>
    </div>
    {form.audience_type==='tier'&&<label className="nc-field"><span>Plano de destino</span>
      <select value={form.audience_tier||''} onChange={e=>update('audience_tier',e.target.value||null)}>
       <option value="">Selecione um plano</option><option>Básico</option><option>Pro</option><option>Ultra</option>
      </select>
    </label>}
    {form.audience_type==='user'&&<label className="nc-field"><span>Destinatário</span>
      <select value={form.audience_user_id||''} onChange={e=>update('audience_user_id',e.target.value||null)}>
       <option value="">Selecione um cliente</option>{customers.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <em>A lista apresenta até 100 cadastros recentes.</em>
    </label>}
    <div className="nc-field">
      <span>Canais de envio</span>
      <div className="nc-channels" role="group" aria-label="Canais de entrega">
        <label className="nc-channel enabled"><input type="checkbox" checked readOnly aria-label="Site, canal ativo"/><span>◎ Site</span><b>✓</b></label>
        <label className="nc-channel future" title="Exige atualização do aplicativo Android"><input type="checkbox" disabled/><span>▯ App</span><small>Em breve</small></label>
        <label className="nc-channel future" title="Notificações remotas dependem do Android"><input type="checkbox" disabled/><span>♧ Push</span><small>Em breve</small></label>
      </div>
      <em>O envio atual funciona na caixa de mensagens do site. App e push serão ativados após a integração Android.</em>
    </div>
    <label className="nc-field"><span>Mensagem <small>{form.body.length}/500</small></span>
      <textarea rows={4} maxLength={500} placeholder="Descreva a condição observada. Evite promessas de resultado." value={form.body}
       onChange={e=>update('body',e.target.value)}/>
    </label>
    <div className="nc-form-grid">
      <label className="nc-field"><span>Validade</span>
        <select value={form.validity_minutes===null?'none':String(form.validity_minutes)}
          onChange={e=>update('validity_minutes',e.target.value==='none'?null:Number(e.target.value))}>
         {validityChoices.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="nc-field"><span>Prioridade</span>
        <select value={form.priority} onChange={e=>update('priority',e.target.value as NotificationInput['priority'])}>
          <option value="normal">Normal</option><option value="high">Alta</option>
        </select>
      </label>
    </div>
    <button type="button" className="nc-advanced-trigger" onClick={()=>setShowAdvanced(!showAdvanced)}
      aria-expanded={showAdvanced}>{showAdvanced?'⌄ Ocultar destino':'› Configurar botão de abertura'}</button>
    {showAdvanced&&<div className="nc-form-grid">
      <label className="nc-field"><span>Texto do botão</span>
        <input maxLength={40} value={form.cta_label} onChange={e=>update('cta_label',e.target.value)}/>
      </label>
      <label className="nc-field"><span>Destino do botão</span>
        <select value={form.cta_path} onChange={e=>update('cta_path',e.target.value)}>
          <option value="/minha-conta">Minha conta</option>
          <option value="/notificacoes">Notificações</option>
          <option value="/download">Baixar AeroMind</option>
          <option value="/funcionalidades">Funcionalidades</option>
          <option value="/suporte">Suporte</option>
        </select>
      </label>
    </div>}
    <label className="nc-field"><span>Agendar envio (opcional)</span>
      <input type="datetime-local" value={todayLocal(form.scheduled_at)}
       onChange={e=>update('scheduled_at',e.target.value?new Date(e.target.value).toISOString():null)}/>
      <em>O agendamento usa a hora do seu celular/computador e será executado automaticamente pelo servidor.</em>
    </label>
    <div className="nc-secondary-tools">
      <button type="button" className="nc-button nc-ghost" disabled={pending}
       onClick={()=>persist('template')}>☆ Salvar como modelo</button>
      <button type="button" className="nc-button nc-ghost" disabled={pending||!form.scheduled_at}
       onClick={()=>persist('scheduled')}>◷ Agendar envio</button>
    </div>
    <div className="nc-toolbar">
      <button type="button" className="nc-button nc-save" disabled={pending}
       onClick={()=>persist('draft')}>▣ Salvar</button>
      <button type="button" className="nc-button nc-ghost" onClick={()=>document.getElementById('nc-live-preview')?.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'})}>◉ Pré-visualizar</button>
      <button type="button" className="nc-button nc-send" disabled={pending}
       onClick={()=>persist('draft',true)}>{pending?'Processando...':'➤ Enviar agora'}</button>
    </div>
   </section>
   <div className="nc-right">
    <section className="nc-panel nc-library">
      <div className="nc-panel-heading"><span className="nc-heading-icon" aria-hidden="true">▤</span><h2>Notificações salvas</h2>
        <button type="button" className="nc-button nc-new" onClick={reset}>＋ Nova notificação</button>
      </div>
      <div className="nc-library-tools">
        <input aria-label="Buscar notificações" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="⌕  Buscar notificações..."/>
        <div className="nc-filters" role="group" aria-label="Filtrar notificações">
          {[['all','Todas'],['draft','Rascunhos'],['scheduled','Agendadas'],['template','Modelos'],['sent','Enviadas']].map(([key,label])=>
           <button type="button" key={key} onClick={()=>setFilter(key)} className={filter===key?'selected':''}>{label}</button>)}
        </div>
      </div>
      <div className="nc-list">
       {filtered.map(c=><article className="nc-list-item" key={c.id}>
        <div className={'nc-item-icon '+c.category} aria-hidden="true">
         {c.category==='radar'?'◉':c.category==='comunicado'?'♧':c.category==='atualizacao'?'⬆':'◇'}
        </div>
        <div className="nc-item-body">
          <strong>{c.title}</strong>
          <p>{c.body}</p>
          <div className="nc-tags">
            <span>{NOTIFICATION_CATEGORIES[c.category]}</span>
            <span>{c.audience_type==='tier'?'Plano '+c.audience_tier:
              c.audience_type==='active'?'Todos ativos':c.audience_type==='all'?'Todos os cadastrados':'Cliente específico'}</span>
          </div>
          <small>{c.status==='sent'?'Enviada em '+date(c.sent_at):
           c.status==='scheduled'?'Programada para '+date(c.scheduled_at):
           'Alterada em '+date(c.updated_at)}
           {c.status==='sent'?' · '+c.recipient_count+' destinatário(s) · '+(readCounts[c.id]||0)+' leitura(s)':''}</small>
        </div>
        <div className="nc-item-actions">
          <span className={'nc-status '+c.status}>{NOTIFICATION_STATUS[c.status]}</span>
          <div>
            <button type="button" disabled={pending} onClick={()=>openCampaign(c)}>✎ {c.status==='sent'?'Reutilizar':'Editar'}</button>
            <button type="button" disabled={pending} onClick={()=>duplicateRow(c)}>▢ Duplicar</button>
            {c.status!=='sent'&&c.status!=='cancelled'&&<button type="button" className="nc-send-small" disabled={pending}
              onClick={()=>sendRow(c)}>➤ Enviar</button>}
            {c.status==='scheduled'&&<button type="button" disabled={pending} onClick={()=>cancelRow(c)}>Cancelar agenda</button>}
          </div>
        </div>
       </article>)}
       {!filtered.length&&<div className="nc-empty">
        <span>▤</span><strong>{search?'Nenhuma notificação encontrada.':'Nenhuma notificação nesta categoria.'}</strong>
        <p>Crie a primeira mensagem e salve como rascunho ou modelo.</p>
       </div>}
      </div>
    </section>
    <section className="nc-panel nc-preview" id="nc-live-preview">
      <div className="nc-panel-heading"><span className="nc-heading-icon" aria-hidden="true">◉</span><h2>Pré-visualização da notificação</h2>
        <button type="button" className="nc-return-editor" onClick={()=>document.getElementById('notification-editor')?.scrollIntoView({behavior:'smooth',block:'start',inline:'nearest'})}>↑ Voltar ao editor</button>
      </div>
      <div className="nc-preview-tabs" role="group" aria-label="Visualização da mensagem">
        {(['site','app','push'] as const).map(t=><button key={t} type="button" className={preview===t?'active':''}
         onClick={()=>setPreview(t)}>{t==='site'?'No site':t==='app'?'No app':'Push'}</button>)}
      </div>
      <div className="nc-preview-row">
       <div className="nc-phone">
        <div className="nc-phone-notch"/>
        <div className="nc-phone-clock">9:41</div>
        <div className="nc-phone-date">AeroMind • Prévia</div>
        <div className="nc-phone-push">
          <div className="nc-notice-logo">◈</div>
          <div><small>Agora · AeroMind</small><b>{form.title||'Título da notificação'}</b>
            <p>{form.body||'Sua mensagem aparecerá aqui.'}</p></div>
        </div>
       </div>
       <div className="nc-site-sample">
        <small>{preview==='site'?'Exibição na caixa de notificações do site':
         preview==='app'?'Simulação visual — app ainda não integrado':'Simulação visual — push ainda não integrado'}</small>
        <div className="nc-site-banner">
          <span className="nc-banner-badge">{NOTIFICATION_CATEGORIES[form.category]}</span>
          {form.priority==='high'&&<span className="nc-priority">PRIORIDADE ALTA</span>}
          <strong>{form.title||'Título da notificação'}</strong>
          <p>{form.body||'A mensagem de exemplo será exibida aqui, com o conteúdo criado no editor.'}</p>
          <span className="nc-demo-link">{form.cta_label||'Abrir AeroMind'} ↗</span>
          <small>{publicName} · {form.validity_minutes===null?'Sem expiração':'Validade de '+form.validity_minutes+' minuto(s)'}</small>
        </div>
        {form.category==='radar'&&<p className="nc-disclaimer">Leitura informativa do monitor. Não representa garantia de resultado.</p>}
       </div>
      </div>
    </section>
   </div>
  </div>
 </div>;
}
