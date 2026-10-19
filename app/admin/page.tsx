import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveLicense, saveCatalogPlan, revokeAdminDevice, saveDeviceLimit, saveCoupon } from './actions';
import './admin.css';
import { ReleaseUploader } from '@/components/admin/ReleaseUploader';

export const dynamic='force-dynamic';
export const metadata={title:'Painel Administrativo | AeroMind', robots:{index:false,follow:false}};

type Customer={id:string;email:string;display_name:string|null;created_at:string;confirmed:boolean};
type License={id:string;email:string;plan_name:string;status:string;created_at:string;valid_until:string|null};
type Plan={slug:string;tier:string;duration_days:number;price_cents:number|null;visible:boolean;
 marketing_title:string|null;marketing_description:string|null;marketing_badge:string|null;
 marketing_features:string[]|null;marketing_cta:string|null;marketing_highlight:boolean};
type Coupon={code:string;discount_percent:number;active:boolean;max_uses:number|null;expires_at:string|null};
type Download={requested_at:string;user_id:string;email:string;version_name:string};
type Order={id:string;created_at:string;status:string;amount_cents:number;plan_name:string;plan_slug:string;reference_id:string;email:string};
type Commercial={requests_total:number;download_accounts:number;requests_7d:number;orders_total:number;orders_paid:number;orders_pending:number;revenue_cents:number;tickets_open:number;tickets_progress:number;tickets_resolved:number;coupons_active:number};
type Audit={license_id:string;action:string;new_status:string;old_status:string|null;created_at:string};
type AdminDevice={id:string;email:string;name:string;os_version:string|null;status:'active'|'pending'|'revoked';registered_at:string;last_seen_at:string|null};
type AdminRelease={version:string;code:number;status:string;path:string;published_at:string|null};
type Overview={
 users_total:number;users_confirmed:number;licenses_active:number;licenses_expired:number;
 licenses_pending:number;licenses_suspended:number;licenses_expiring_7d:number;
 users:Customer[];licenses:License[];plans:Plan[];audit:Audit[];
};

const sections=[
  {href:'/admin',icon:'▦',label:'Visão geral'},
  {href:'/admin/clientes',icon:'♙',label:'Clientes'},
  {href:'/admin/licencas',icon:'⚿',label:'Licenças'},
  {href:'/admin/planos',icon:'◈',label:'Planos'},
  {href:'/admin/dispositivos',icon:'▯',label:'Dispositivos'},
  {href:'/admin/releases',icon:'⇧',label:'Atualizações'},
  {href:'/admin/downloads',icon:'⇩',label:'Downloads'},
  {href:'/admin/cupons',icon:'◇',label:'Cupons'},
  {href:'/admin/pagamentos',icon:'▣',label:'Pagamentos'},
  {href:'/admin/relatorios',icon:'▥',label:'Relatórios'},
  {href:'/admin/suporte',icon:'✉',label:'Suporte'},
];
const messages:Record<string,string>={
 'license-saved':'Licença registrada. O histórico de alterações foi atualizado.',
 'plan-saved':'Dados do plano salvos no catálogo interno.',
 'limit-saved':'Limite de dispositivos alterado e registrado na auditoria.',
 'device-revoked':'Dispositivo revogado com sucesso.',
 'device-error':'Falha ao revogar dispositivo.',
 'invalid':'Revise os dados informados.',
 'expiry':'Licença ativa exige data de validade futura.',
 'license-error':'Não foi possível atualizar a licença. Confirme o e-mail cadastrado e os campos.',
 'plan-error':'Não foi possível salvar o plano.',
 'price':'Defina um preço maior que zero para exibir um plano.',
 'coupon-saved':'Cupom registrado com sucesso.', 'coupon-error':'Não foi possível salvar o cupom.'
};
const asDate=(s?:string|null)=>s?new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const displayMoney=(n:number|null)=>n===null?'Em definição':(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const statusLabel=(s:string,expires:string|null)=>s==='active' && expires && new Date(expires).getTime()<=Date.now()?'Vencida':({
 active:'Ativa',pending:'Pendente',expired:'Expirada',suspended:'Suspensa',revoked:'Revogada'
} as Record<string,string>)[s]||s;
const period=(days:number)=>({30:'Mensal',90:'Trimestral',180:'Semestral',365:'Anual'} as Record<number,string>)[days] || days+' dias';
function MiniStat({icon,label,value,tone,sub}:{icon:string;label:string;value:string|number;tone:string;sub:string}) {
 return <div className={'admin-stat '+tone}>
   <div className="admin-stat-icon" aria-hidden="true">{icon}</div>
   <div className="admin-stat-body"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>
 </div>;
}
function SectionHead({title,note}:{title:string;note?:string}){
 return <div className="admin-section-head"><h2>{title}</h2>{note&&<small>{note}</small>}</div>;
}
export default async function Admin({searchParams,activeSection='visao'}:{searchParams:Promise<{msg?:string}>,activeSection?:string}){
 const supabase=await createClient();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError||!user)redirect('/entrar?next=%2Fadmin');
 const {data:staff,error:staffError}=await supabase.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(staffError||!staff) redirect('/minha-conta');
 const [result,deviceResult,planResult,couponResult,snapshotResult,downloadsResult,ordersResult]=await Promise.all([
  supabase.rpc('aeromind_admin_overview'),supabase.rpc('aeromind_admin_devices'),
  supabase.from('aeromind_plan_catalog').select('slug,tier,duration_days,price_cents,visible,marketing_title,marketing_description,marketing_badge,marketing_features,marketing_cta,marketing_highlight').order('duration_days'),
  supabase.from('aeromind_coupons').select('code,discount_percent,active,max_uses,expires_at').order('created_at',{ascending:false}),
  supabase.rpc('aeromind_admin_commercial_snapshot'),
  supabase.rpc('aeromind_admin_downloads'),
  supabase.rpc('aeromind_admin_orders')
 ]);
 const coupons=(couponResult.data||[]) as Coupon[];
 const commercial=(snapshotResult.data||{}) as Partial<Commercial>;
 const downloads=(Array.isArray(downloadsResult.data)?downloadsResult.data:[]) as Download[];
 const orders=(Array.isArray(ordersResult.data)?ordersResult.data:[]) as Order[];
 const count=(key:keyof Commercial)=>Number(commercial[key]||0);
 const inventory=(deviceResult.data??{}) as {devices?:AdminDevice[];releases?:AdminRelease[]};
 const devices=Array.isArray(inventory.devices)?inventory.devices:[];
 const releases=Array.isArray(inventory.releases)?inventory.releases:[];
 const raw=(result.data || {}) as Partial<Overview>;
 const data:Overview={
   users_total:Number(raw.users_total)||0,
   users_confirmed:Number(raw.users_confirmed)||0,
   licenses_active:Number(raw.licenses_active)||0,
   licenses_expired:Number(raw.licenses_expired)||0,
   licenses_pending:Number(raw.licenses_pending)||0,
   licenses_suspended:Number(raw.licenses_suspended)||0,
   licenses_expiring_7d:Number(raw.licenses_expiring_7d)||0,
   users:Array.isArray(raw.users)?raw.users:[],
   licenses:Array.isArray(raw.licenses)?raw.licenses:[],
   plans:Array.isArray(planResult.data)?planResult.data as Plan[]:Array.isArray(raw.plans)?raw.plans:[],
   audit:Array.isArray(raw.audit)?raw.audit:[]
 };
 const {msg}=await searchParams;
 const canDisplay=!result.error;
 const allLicenses=data.licenses.length;
 const countByTier=['Básico','Pro','Ultra'].map(tier=>({
   tier,count:data.licenses.filter(l=>l.plan_name===tier).length
 }));
 const sum=countByTier.reduce((total,p)=>total+p.count,0);
 const color=['#9e37f3','#03cbb4','#ef4bc1'];
 const chartColors=countByTier.map((p,i)=>{
   const prev=countByTier.slice(0,i).reduce((a,b)=>a+b.count,0);
   const from=sum?prev/sum*100:0;
   const to=sum?(prev+p.count)/sum*100:0;
   return color[i]+' '+from+'% '+to+'%';
 });
 const chartGradient=sum?'conic-gradient('+chartColors.join(',')+')':'conic-gradient(#2d3458 0% 100%)';
 return <div className={'admin-root area-'+activeSection}>
  <header className="admin-top">
    <Link href="/" className="admin-top-brand"><img src="/images/aeromind-mark.svg" width="42" height="42" alt=""/>AeroMind <span>ADMIN</span></Link>
    <div className="admin-top-right"><span className="admin-live"><i/>Dados reais</span><div className="admin-user"><span className="admin-avatar">A</span><div><strong>AeroMind Suporte</strong><small>{staff.role==='owner'?'Proprietário':'Administrador'}</small></div></div><Link href="/minha-conta" className="admin-account-link">Minha conta ↗</Link></div>
  </header>
  <div className="admin-shell">
    <aside className="admin-sidebar" aria-label="Menu administrativo"><p>PAINEL ADMINISTRATIVO</p><nav>
    {sections.map((x,i)=><a key={x.href} href={x.href} className={x.href===(activeSection==='visao'?'/admin':'/admin/'+activeSection)?'current':''}><span>{x.icon}</span>{x.label}</a>)}
    </nav><div className="admin-sidebar-foot"><span>Site e suporte</span><Link href="/">↗ Ver site</Link><a href="mailto:aeromindsuporte@gmail.com">✉ Contato</a><Link href="/minha-conta">◀ Voltar à conta</Link></div></aside>
    <main className="admin-content">
      <section id="visao" className="admin-overview">
        <div className="admin-title-row"><div><span className="admin-eyebrow">PAINEL ADMINISTRATIVO · AEROMIND</span><h1>Visão geral</h1><p>Acompanhe clientes, planos e licenças em um só lugar.</p></div><div className="admin-no-revenue">◎ Informações atuais do Supabase</div></div>
        {msg&&messages[msg]&&<p className={'admin-feedback '+(msg.includes('saved')?'good':'bad')} role="status">{messages[msg]}</p>}
        {result.error&&<p className="admin-feedback bad" role="alert">Não foi possível consultar os indicadores. Atualize a página antes de realizar alterações.</p>}
        <div className="admin-stats">
          <MiniStat icon="♙" label="Total de clientes" value={canDisplay?data.users_total:'—'} tone="purple" sub={canDisplay?data.users_confirmed+' confirmados':'Indisponível'} />
          <MiniStat icon="⚿" label="Licenças ativas" value={canDisplay?data.licenses_active:'—'} tone="green" sub="Validade verificada"/>
          <MiniStat icon="◷" label="Licenças expiradas" value={canDisplay?data.licenses_expired:'—'} tone="yellow" sub={data.licenses_expiring_7d+' vencem em 7 dias'}/>
          <MiniStat icon="▥" label="Receita confirmada" value={displayMoney(count('revenue_cents'))} tone="blue" sub="Somente pedidos pagos"/>
        </div>
      </section>
      <div className="admin-main-grid">
        <section id="licencas" className="admin-card admin-wide">
          <SectionHead title="Últimas licenças" note="Dados reais · até 100 registros"/>
          <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Status</th><th>Cadastro</th><th>Validade</th><th>Ação</th></tr></thead><tbody>
          {data.licenses.length?data.licenses.slice(0,10).map(l=><tr key={l.id}><td className="admin-email">{l.email}</td><td>{l.plan_name}</td><td><span className={'admin-pill status-'+l.status}>{statusLabel(l.status,l.valid_until)}</span></td><td>{asDate(l.created_at)}</td><td>{asDate(l.valid_until)}</td><td><Link className="admin-inline-action" href={data.users.find(u=>u.email===l.email)?'/admin/cliente/'+data.users.find(u=>u.email===l.email)!.id:'/admin/licencas#editar-licenca'}>Gerenciar cliente ↗</Link></td></tr>):<tr><td colSpan={6} className="admin-empty">Nenhuma licença criada até agora.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="admin-card admin-side"><SectionHead title="Resumo de planos" note="Licenças registradas"/>
        <div className="admin-donut-area"><div className="admin-donut" style={{background:chartGradient}}><div><strong>{sum}</strong><small>licenças listadas</small></div></div>
        <div className="admin-plan-legend">{countByTier.map((p,i)=><div key={p.tier}><i style={{backgroundColor:color[i]}}/><span>{p.tier}</span><strong>{p.count}</strong></div>)}</div></div>
        <div className="admin-note">Estatísticas calculadas com até 100 licenças recentes, sem valores fictícios.</div>
        </section>
        <section id="clientes" className="admin-card admin-wide">
          <SectionHead title="Clientes recentes" note="Até 100 cadastros recentes"/>
          <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>E-mail</th><th>Cadastro</th><th>Situação</th><th>Ação</th></tr></thead><tbody>
          {data.users.length?data.users.slice(0,12).map(u=><tr key={u.id}><td>{u.display_name||'Cliente AeroMind'}</td><td className="admin-email">{u.email}</td><td>{asDate(u.created_at)}</td><td><span className={'admin-pill '+(u.confirmed?'status-active':'status-pending')}>{u.confirmed?'Confirmado':'Pendente'}</span></td><td><Link className="admin-inline-action" href={'/admin/cliente/'+u.id}>Gerenciar →</Link></td></tr>):<tr><td colSpan={5} className="admin-empty">Nenhum cliente cadastrado.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="admin-card admin-side"><SectionHead title="Status de licenças"/>
          <div className="admin-status-summary">{[
            {label:'Ativas',count:data.licenses_active,color:'#09bd9b'},
            {label:'Expiradas',count:data.licenses_expired,color:'#fd6676'},
            {label:'Pendentes',count:data.licenses_pending,color:'#ffbe3e'},
            {label:'Suspensas',count:data.licenses_suspended,color:'#a7b4dc'}
          ].map(x=><div key={x.label}><span>{x.label}</span><strong>{x.count}</strong><div className="admin-progress"><i style={{width:(x.count>0?(x.count/Math.max(1,data.licenses_active+data.licenses_expired+data.licenses_pending+data.licenses_suspended)*100):0)+'%',background:x.color}}/></div></div>)}</div>
        </section>
        <section id="editar-licenca" className="admin-card admin-wide">
          <SectionHead title="Gerenciar licença" note="Ações registradas na auditoria"/>
          <p className="admin-card-explain">Informe o e-mail de um cliente já confirmado. O sistema atualiza a licença mais recente desse cliente. Uma licença ativa exige data futura.</p>
          <form className="admin-edit-grid" action={saveLicense}>
            <label>E-mail do cliente <input name="email" type="email" required maxLength={320} placeholder="cliente@email.com"/></label>
            <label>Plano <select name="tier" defaultValue="Pro" required><option>Básico</option><option>Pro</option><option>Ultra</option></select></label>
            <label>Situação <select name="status" defaultValue="pending" required><option value="pending">Pendente</option><option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="expired">Expirada</option><option value="revoked">Revogada</option></select></label>
            <label>Validade <input name="valid_until" type="date"/></label>
            <label className="admin-full">Observação interna <textarea name="note" maxLength={500} rows={2} placeholder="Motivo da atualização (opcional)"/></label>
            <div className="admin-form-foot"><small>A ativação é manual. Nenhuma cobrança será realizada.</small><button type="submit" disabled={!canDisplay}>Salvar licença ↗</button></div>
          </form>
          <div style={{marginTop:25,borderTop:'1px solid #37447f',paddingTop:18}}>
           <h3 style={{marginTop:0}}>Aparelhos permitidos por licença</h3>
           <p className="admin-card-explain">Configure de 1 a 20 aparelhos para a licença mais recente do cliente. Aparelhos já autorizados não são desligados automaticamente quando o limite diminui.</p>
           <form className="admin-edit-grid" action={saveDeviceLimit}>
            <label>E-mail do cliente <input type="email" name="email" required placeholder="cliente@email.com" /></label>
            <label>Quantidade permitida <input type="number" name="max_devices" min="1" max="20" defaultValue="2" required /></label>
            <div className="admin-form-foot"><small>O limite também é aplicado pelo servidor Android.</small><button type="submit">Salvar limite →</button></div>
           </form>
          </div>
        </section>
        <section className="admin-card admin-side admin-quick"><SectionHead title="Acessos rápidos"/>
          <div className="admin-quick-grid">
            <a href="/admin/licencas#editar-licenca" className="admin-quick-link purple"><span>⚿</span><b>Gerenciar licença</b><small>Ativar ou suspender</small></a>
            <a href="/admin/planos" className="admin-quick-link green"><span>◈</span><b>Configurar planos</b><small>Preços e visibilidade</small></a>
            <a href="/admin/relatorios" className="admin-quick-link blue"><span>▤</span><b>Ver auditoria</b><small>Histórico de alterações</small></a>
            <div className="admin-quick-link inactive"><span>♙</span><b>Convidar clientes</b><small>Aguardando SMTP</small></div>
          </div>
        </section>
      </div>
      <section id="planos" className="admin-card admin-catalog"><SectionHead title="Planos e cards de divulgação" note="Preços e apresentação na página de vendas"/>
        <p className="admin-card-explain">Personalize os textos, benefícios e destaque de cada card. As alterações refletem na tela de planos e no site. Cobranças reais só após homologação.</p>
        <div className="admin-catalog-grid">{data.plans.map(p=><form action={saveCatalogPlan} className="admin-plan-item" key={p.slug}>
          <input name="slug" type="hidden" value={p.slug}/><div className="admin-plan-heading"><strong>{p.tier}</strong><span>{period(p.duration_days)}</span></div>
          <label>Preço (R$) <input type="number" inputMode="decimal" name="price" min="0" max="1000000" step="0.01" defaultValue={p.price_cents===null?'':(p.price_cents/100).toFixed(2)} placeholder="Em definição"/></label>
          <label className="admin-checkbox"><input type="checkbox" name="visible" defaultChecked={p.visible}/>Exibir na página de planos</label>
          <label>Título de divulgação<input name="marketing_title" maxLength={65} defaultValue={p.marketing_title||''} placeholder={p.tier}/></label>
          <label>Descrição do card<textarea name="marketing_description" maxLength={240} rows={2} defaultValue={p.marketing_description||''} placeholder="Descreva o benefício do plano"/></label>
          <label>Selo de destaque<input name="marketing_badge" maxLength={38} defaultValue={p.marketing_badge||''} placeholder="Mais escolhido"/></label>
          <label>Benefícios (um por linha)<textarea name="marketing_features" rows={5} defaultValue={(p.marketing_features||[]).join('\n')} placeholder="Benefício 1&#10;Benefício 2"/></label>
          <label>Texto do botão<input name="marketing_cta" maxLength={40} defaultValue={p.marketing_cta||''} placeholder="Conhecer plano"/></label>
          <label className="admin-checkbox"><input type="checkbox" name="marketing_highlight" defaultChecked={p.marketing_highlight}/>Destacar este card</label>
          <button type="submit" disabled={!canDisplay}>Salvar plano</button>
        </form>)}</div>
      </section>
      <section id="dispositivos" className="admin-card admin-catalog">
        <SectionHead title="Dispositivos autorizados" note="Até 100 aparelhos recentes"/>
        <p className="admin-card-explain">Revogue o acesso de um aparelho quando necessário. O vínculo inicial será feito pelo aplicativo Android após sua integração.</p>
        {deviceResult.error&&<p role="alert" className="admin-feedback bad">Não foi possível consultar os dispositivos.</p>}
        <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Aparelho</th><th>Status</th><th>Último acesso</th><th>Ação</th></tr></thead><tbody>
        {devices.length?devices.map(d=><tr key={d.id}>
          <td className="admin-email">{d.email}</td>
          <td>{d.name}<small className="admin-device-os">{d.os_version||'Android'}</small></td>
          <td><span className={'admin-pill status-'+d.status}>{d.status==='active'?'Ativo':d.status==='pending'?'Pendente':'Revogado'}</span></td>
          <td>{d.last_seen_at?asDate(d.last_seen_at):'—'}</td>
          <td>{d.status!=='revoked'?<form action={revokeAdminDevice}><input type="hidden" name="device_id" value={d.id}/><button className="admin-inline-action admin-danger-action" type="submit">Revogar</button></form>:'—'}</td>
        </tr>):<tr><td colSpan={5} className="admin-empty">Nenhum aparelho cadastrado.</td></tr>}
        </tbody></table></div>
      </section>
      <section id="releases" className="admin-card admin-catalog">
        <SectionHead title="Versões do aplicativo" note="Armazenamento privado"/>
        {releases.length?<div className="admin-release-list">{releases.map(r=><div key={r.code} className="admin-release-item">
          <strong>AeroMind {r.version}</strong><span>{r.status==='published'?'Publicado':r.status==='draft'?'Rascunho':'Arquivado'}</span>
          <small>{r.path}</small>
        </div>)}</div>:<p className="admin-empty">Nenhum APK publicado. Assim que o arquivo Android assinado estiver disponível, registraremos a versão e verificaremos sua integridade.</p>}
        <p className="admin-card-explain">Envie apenas APK assinado. O arquivo é guardado em bucket privado e conferido pelo servidor antes de substituir a versão publicada.</p>
        <ReleaseUploader/>
        <p className="admin-card-explain">Os clientes com licença ativa receberão o download por link temporário. As versões anteriores permanecem no histórico.</p>
      </section>
      <section id="relatorios" className="admin-card admin-audit"><SectionHead title="Relatório comercial" note="Dados confirmados e eventos reais"/>
       {snapshotResult.error&&<p role="alert" className="admin-feedback bad">Relatório temporariamente indisponível.</p>}
       <div className="admin-report-tiles">
         <div><small>Receita recebida</small><strong>{displayMoney(count('revenue_cents'))}</strong></div>
         <div><small>Pedidos pagos</small><strong>{count('orders_paid')}</strong></div>
         <div><small>Pedidos pendentes</small><strong>{count('orders_pending')}</strong></div>
         <div><small>Solicitações de download</small><strong>{count('requests_total')}</strong></div>
         <div><small>Contas que solicitaram</small><strong>{count('download_accounts')}</strong></div>
         <div><small>Solicitações em 7 dias</small><strong>{count('requests_7d')}</strong></div>
         <div><small>Chamados em aberto</small><strong>{count('tickets_open')}</strong></div>
         <div><small>Em atendimento</small><strong>{count('tickets_progress')}</strong></div>
         <div><small>Cupons ativos</small><strong>{count('coupons_active')}</strong></div>
       </div>
       <h3>Auditoria de licenças</h3>
       {data.audit.length?<div className="admin-audit-list">{data.audit.map((x,i)=><p key={x.license_id+x.created_at+i}><span>{asDate(x.created_at)}</span><strong>{x.action==='create'?'Licença criada':'Licença alterada'}</strong><span>{x.old_status?x.old_status+' → ':''}{x.new_status}</span></p>)}</div>:<p className="admin-empty">Ainda não existem alterações de licenças.</p>}
      </section>
      <div className="admin-bottom-grid">
        <section id="downloads" className="admin-card admin-muted">
         <h2>⇩ Solicitações de download</h2>
         <p>São contabilizados pedidos de link seguro feitos por contas autenticadas; isso <strong>não comprova conclusão do download</strong>. O registro começa a partir desta atualização.</p>
         <p><strong>{count('requests_total')}</strong> solicitações totais · <strong>{count('download_accounts')}</strong> contas distintas</p>
         {downloadsResult.error&&<p className="admin-feedback bad">Falha ao consultar os registros.</p>}
         <div className="admin-table-scroll"><table><thead><tr><th>Conta</th><th>Versão</th><th>Data</th></tr></thead><tbody>
          {downloads.length?downloads.map((x,i)=><tr key={x.user_id+x.requested_at+i}><td className="admin-email">{x.email}</td><td>{x.version_name}</td><td>{new Date(x.requested_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</td></tr>):<tr><td colSpan={3}>Nenhuma solicitação registrada até o momento.</td></tr>}
         </tbody></table></div>
        </section>
        <section id="cupons" className="admin-card admin-muted">
         <h2>◇ Cupons promocionais</h2>
         <p>Crie códigos percentuais de desconto. Aplicação em pedidos Pix está preparada para o ambiente de homologação.</p>
         <form className="admin-edit-grid" action={saveCoupon}>
          <label>Código<input name="code" placeholder="AERO10" minLength={4} maxLength={24} pattern="[A-Za-z0-9_-]{4,24}" required/></label>
          <label>Desconto (%)<input name="discount_percent" type="number" min="1" max="90" required/></label>
          <label>Máximo de usos (opcional)<input name="max_uses" type="number" min="1" max="100000"/></label>
          <label>Vencimento (opcional)<input name="expires_at" type="date"/></label>
          <label className="admin-checkbox"><input type="checkbox" name="active" defaultChecked/>Cupom ativo</label>
          <div className="admin-form-foot"><small>Use o mesmo código para editar um cupom existente.</small><button type="submit">Salvar cupom</button></div>
         </form>
         <h3>Cupons cadastrados</h3>
         {couponResult.error&&<p className="admin-feedback bad">Não foi possível carregar os cupons.</p>}
         <div className="admin-coupon-list">{coupons.length?coupons.map(c=><form key={c.code} action={saveCoupon} className="admin-plan-item">
          <input type="hidden" name="code" value={c.code}/>
          <strong>{c.code}</strong>
          <label>Desconto (%)<input name="discount_percent" type="number" min="1" max="90" defaultValue={c.discount_percent} required/></label>
          <label>Máximo de usos<input name="max_uses" type="number" min="1" max="100000" defaultValue={c.max_uses??''}/></label>
          <label>Validade<input name="expires_at" type="date" defaultValue={c.expires_at?new Date(c.expires_at).toISOString().slice(0,10):''}/></label>
          <label className="admin-checkbox"><input type="checkbox" name="active" defaultChecked={c.active}/>Ativo</label>
          <button>Atualizar cupom</button>
         </form>):<p>Nenhum cupom cadastrado.</p>}</div>
        </section>
        <section id="pagamentos" className="admin-card admin-muted">
         <h2>▣ Pagamentos e pedidos</h2>
         <p>Acompanhamento de pedidos reais do banco. A criação de Pix continua restrita ao sandbox até a validação oficial do provedor.</p>
         <p><strong>{count('orders_paid')}</strong> pagos · <strong>{count('orders_pending')}</strong> pendentes · <strong>{displayMoney(count('revenue_cents'))}</strong> recebidos</p>
         <Link href="/checkout" className="admin-inline-action">Ver checkout →</Link>
         <div className="admin-table-scroll"><table><thead><tr><th>Conta</th><th>Plano</th><th>Total</th><th>Status</th><th>Data</th></tr></thead><tbody>
         {orders.length?orders.map(o=><tr key={o.id}><td className="admin-email">{o.email}</td><td>{o.plan_name}</td><td>{displayMoney(o.amount_cents)}</td><td>{o.status}</td><td>{asDate(o.created_at)}</td></tr>):<tr><td colSpan={5}>Nenhum pedido registrado.</td></tr>}
         </tbody></table></div>
        </section>
      </div>
      <footer className="admin-footer">AeroMind Admin · Dados protegidos · <Link href="/">Voltar ao site</Link></footer>
    </main>
  </div>
 </div>;
}
