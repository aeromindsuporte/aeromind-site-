import Link from 'next/link';
import {redirect} from 'next/navigation';
import {GoldClientHistory,type GoldConfigVersion,type GoldAuditEvent} from './GoldClientHistory';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {saveGoldAccess,saveGoldConfiguration} from './actions';
import {REFINED_DEFAULT,validateGoldSettings,type Settings,type Indicator,type FilterSpec,type TargetRule} from '@/lib/gold/indicators';
import './gold-admin.css';

export const dynamic='force-dynamic';
export const metadata={title:'Gold | Administração AeroMind',robots:{index:false,follow:false}};

type GoldAccess={
 user_id:string;email:string;enabled:boolean;valid_until:string|null;
 updated_at:string;reason:string;config_version:number|null;settings:unknown
};
type AuditItem={email:string;action:string;reason:string;created_at:string};
type SearchClient={id:string;email:string;display_name:string|null;confirmed:boolean};
type SelectedClient={id:string;email:string;display_name:string|null};
type GoldAccessRecord={enabled:boolean;valid_until:string|null;reason:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Overview={global_enabled:boolean;checkout_enabled:boolean;accesses:GoldAccess[];audit:AuditItem[]};
const messages:Record<string,string>={
 granted:'Autorização Gold registrada e auditada. O rollout Gold continua desativado.',
 revoked:'Autorização Gold revogada e registrada no histórico.',
 'config-saved':'Nova versão das configurações Gold salva com auditoria.',
 invalid:'Revise o cliente, a data e a justificativa (mínimo 8 caracteres).',
 expiry:'A data de término precisa estar no futuro.',
 'invalid-config':'Configuração fora das opções permitidas. Confira alvo, filtro e justificativa.',
 permission:'Sua conta não tem autorização para alterar o Gold.',
 error:'Não foi possível salvar no banco. Nenhum dado foi alterado.'
};
const targets:Record<Indicator,{value:TargetRule;label:string}[]>={
 BAIXA:[{value:'low35',label:'P25 • últimas 35 rodadas'},{value:'column7_5_p25',label:'P25 • coluna 7 / 5 amostras'}],
 MEDIANA:[{value:'column7_5_p50',label:'P50 • coluna 7 / 5 amostras'}],
 ALTA:[{value:'column7_5_p75',label:'P75 • coluna 7 / 5 amostras'},
 {value:'column7_6_p75',label:'P75 • coluna 7 / 6 amostras'},
 {value:'column7_7_p75',label:'P75 • coluna 7 / 7 amostras'}]
};
const filters=[
 {value:'continuous',label:'Monitoramento contínuo'},
 {value:'purple_count',label:'Quantidade de roxos'},
 {value:'purple_improving',label:'Roxos em evolução'},
 {value:'paying_counts',label:'Rodadas pagantes'}
];
const dateBR=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Sem validade';

function RuleInputs({name,initial}:{name:Indicator;initial:Settings}){
 const prefix=name.toLowerCase();
 const rule=initial[name],filter=rule.filter;
 const k='k' in filter?filter.k:6;
 const a='a' in filter?filter.a:9;
 const b='b' in filter?filter.b:3;
 return <fieldset className={'gold-rule-fields gold-rule-'+prefix}>
  <legend>{name}</legend>
  <div className="gold-input-grid">
   <label>Alvo
    <select name={prefix+'_target'} defaultValue={rule.target}>
     {targets[name].map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
    </select>
   </label>
   <label>Filtro
    <select name={prefix+'_mode'} defaultValue={filter.mode}>
     {filters.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
    </select>
   </label>
   <label>Quantidade K <small>Roxos</small>
    <select name={prefix+'_k'} defaultValue={String(k)}>
     {[4,5,6,7].map(n=><option key={n} value={n}>{n}</option>)}
    </select>
   </label>
   <label>Pagantes A <small>Últimas 13</small>
    <select name={prefix+'_a'} defaultValue={String(a)}>
     {[8,9,10].map(n=><option key={n} value={n}>{n}</option>)}
    </select>
   </label>
   <label>Pagantes B <small>Últimas 5</small>
    <select name={prefix+'_b'} defaultValue={String(b)}>
     {[2,3,4].map(n=><option key={n} value={n}>{n}</option>)}
    </select>
   </label>
  </div>
  <p className="gold-hint">Somente os parâmetros do filtro selecionado serão utilizados. O servidor valida as combinações.</p>
 </fieldset>;
}
function GoldConfigForm({email='',initial=REFINED_DEFAULT as Settings,returnClient}:{email?:string;initial?:Settings;returnClient?:string}){

 return <form action={saveGoldConfiguration} className="gold-admin-form">
  {returnClient&&<input type="hidden" name="return_client" value={returnClient}/>}
  <label>E-mail do cliente<input name="email" type="email" defaultValue={email} maxLength={320} placeholder="cliente@email.com" required/></label>
  {(['BAIXA','MEDIANA','ALTA'] as const).map(k=><RuleInputs key={k} name={k} initial={initial}/>)}
  <label>Justificativa da configuração
   <textarea name="reason" minLength={8} maxLength={500} rows={2} required placeholder="Ex.: Perfil ajustado a pedido do cliente"/>
  </label>
  <button className="gold-action" type="submit">Salvar nova versão de configuração</button>
 </form>;
}

export default async function AdminGold({searchParams}:{searchParams:Promise<{msg?:string;q?:string;cliente?:string}>}){
 const {sb,role}=await requireAdmin();
 if(role!=='admin'&&role!=='owner')redirect('/admin');
 const {msg,q,cliente}=await searchParams;
 const term=String(q||'').trim().slice(0,100);
 const customerId=cliente&&uuid.test(cliente)?cliente:null;
 const [overviewResponse,searchResponse,customerResponse]=await Promise.all([
  sb.rpc('aeromind_gold_admin_overview'),
  term.length>=2?sb.rpc('aeromind_admin_search_customers',{p_query:term,p_offset:0}):Promise.resolve(null),
  customerId?sb.rpc('aeromind_admin_customer_v3',{p_user_id:customerId}):Promise.resolve(null)
 ]);
 const {data,error}=overviewResponse;
 const overview=data as Overview|null;
 const rows=Array.isArray(overview?.accesses)?overview.accesses:[];
 const audit=Array.isArray(overview?.audit)?overview.audit:[];
 const found=((searchResponse?.data?.users||[]) as SearchClient[]);
 const total=Number(searchResponse?.data?.total||0);
 const selected=customerResponse&&!customerResponse.error?(customerResponse.data as SelectedClient|null):null;
 const [accessResponse,versionResponse,eventResponse]=selected?await Promise.all([
  sb.from('aeromind_gold_access').select('enabled,valid_until,reason').eq('user_id',selected.id).maybeSingle(),
  sb.from('aeromind_gold_config_versions').select('id,version,settings,reason,created_at').eq('user_id',selected.id).order('version',{ascending:false}).limit(50),
  sb.from('aeromind_gold_audit').select('id,action,old_value,new_value,reason,created_at').eq('user_id',selected.id).order('created_at',{ascending:false}).limit(50)
 ]):[null,null,null];
 const access=accessResponse?.data as GoldAccessRecord|null;
 const versions=(versionResponse?.data||[]) as GoldConfigVersion[];
 const events=(eventResponse?.data||[]) as GoldAuditEvent[];
 const selectedSettings=versions.length&&validateGoldSettings(versions[0].settings)?versions[0].settings:REFINED_DEFAULT as Settings;
 const isSuccess=msg==='granted'||msg==='revoked'||msg==='config-saved';
 return <CommercialAdminShell title="Gerenciamento Gold" active="/admin/gold"
  description="Autorizações, versões de parâmetros e auditoria, sem interferir nas licenças Básico, Pro ou Ultra.">
  <div className="gold-admin">
   {msg&&<p className={'admin-feedback '+(isSuccess?'good':'bad')} role={isSuccess?'status':'alert'}>{messages[msg]||messages.error}</p>}
   <section className="admin-card gold-status-card">
    <div><h2>Implantação independente</h2><p>O Gold não substitui nenhuma licença nem altera o checkout Pix existente. O aplicativo será integrado por último.</p></div>
    <div className="gold-statuses">
     <span className={overview?.global_enabled?'gold-state-on':'gold-state-off'}>Acesso Gold no app: {overview?.global_enabled?'Ligado':'Desligado'}</span>
     <span className={overview?.checkout_enabled?'gold-state-on':'gold-state-off'}>Venda Gold: {overview?.checkout_enabled?'Ligada':'Desligada'}</span>
    </div>
    <p className="gold-hint">Conceder autorização aqui não ativa funcionalidades Gold enquanto o rollout geral estiver desligado. Esse bloqueio afeta somente Gold.</p>
    <div className="gold-quick-links"><Link href="/gold">Conhecer página Gold →</Link><Link href="/admin/gold/comparador">Comparador offline →</Link><Link href="/admin/gold/monitoramento">Monitoramento Gold →</Link><Link href="/admin/gold/alertas">Alertas Gold — laboratório →</Link><Link href="/admin/planos">Planos existentes →</Link><Link href="/admin/licencas">Licenças atuais →</Link></div>
   </section>
   {error&&<p className="admin-feedback bad" role="alert">Não foi possível consultar a central Gold. Não execute operações até a conexão estar normal.</p>}
   {!error&&<>
    <section className="admin-card" id="gold-clientes">
     <h2>Localizar cliente para o Gold</h2>
     <p className="admin-card-explain">Busque pelo nome ou e-mail. Você pode preparar Gold mesmo para quem ainda não possui autorização, sem modificar sua licença original.</p>
     <form className="gold-find-form" action="/admin/gold" method="get" role="search">
      <label htmlFor="gold-find">Cliente</label>
      <input id="gold-find" type="search" name="q" defaultValue={term} maxLength={100} minLength={2} placeholder="Digite pelo menos 2 caracteres" required/>
      <button type="submit" className="gold-action">Pesquisar</button>
     </form>
     {searchResponse?.error&&<p className="admin-feedback bad" role="alert">A busca de clientes está indisponível.</p>}
     {term.length>=2&&!searchResponse?.error&&<div className="admin-table-scroll">
      <table><thead><tr><th>Nome</th><th>E-mail</th><th>Gestão Gold</th></tr></thead>
       <tbody>{found.map(c=><tr key={c.id}><td>{c.display_name||'Cliente AeroMind'}</td><td className="admin-email">{c.email}</td>
        <td><Link className="admin-inline-action" href={'/admin/gold?cliente='+encodeURIComponent(c.id)+'&q='+encodeURIComponent(term)+'#gold-cliente'}>Selecionar →</Link></td></tr>)}
        {found.length===0&&<tr><td colSpan={3}>Nenhum cliente encontrado.</td></tr>}</tbody></table>
      <p className="gold-hint">{found.length} de {total} clientes encontrados. Para outros resultados, refine a busca.</p>
     </div>}
    </section>
    {customerId&&!selected&&<p className="admin-feedback bad" role="alert">Cliente não encontrado ou acesso à ficha indisponível.</p>}
    {selected&&<section className="admin-card gold-selected-client" id="gold-cliente">
      <h2>Cliente selecionado: {selected.display_name||'Cliente AeroMind'}</h2>
      <p className="admin-email">{selected.email}</p>
      <div className="gold-client-status"><span>Autorização Gold: <strong>{access?.enabled?(access.valid_until&&new Date(access.valid_until).getTime()>Date.now()?'Válida':'Vencida'):'Não ativa'}</strong></span>
       <span>Versão atual: <strong>{versions[0]?.version||'Refinado padrão'}</strong></span>
       <span>Vencimento: <strong>{access?.valid_until?dateBR(access.valid_until):'Não definido'}</strong></span>
      </div>
      <div className="gold-quick-links"><Link href={'/admin/cliente/'+encodeURIComponent(selected.id)}>Gestão completa do cliente →</Link>
       <Link href="/admin/gold">Limpar seleção</Link>
       <Link href={'/admin/gold/comparador?cliente='+encodeURIComponent(selected.id)}>Comparar parâmetros deste cliente →</Link><Link href={'/admin/gold/monitoramento?cliente='+encodeURIComponent(selected.id)}>Monitorar este cliente →</Link><Link href={'/admin/gold/alertas?cliente='+encodeURIComponent(selected.id)}>Configurar alertas deste cliente →</Link><a href="#gold-historico">Ver histórico Gold ↓</a></div>
      <p className="gold-hint">Os formulários abaixo usam este cliente como padrão. A autorização não ativa o aplicativo Gold enquanto a implantação geral estiver desligada.</p>
     </section>}
    <div className="gold-admin-columns">
     <section className="admin-card">
      <h2>Conceder autorização</h2>
      <p className="admin-card-explain">Cadastre um cliente existente, escolha o vencimento e registre a justificativa. Não afeta a licença base.</p>
      <form className="gold-admin-form" action={saveGoldAccess}>
       <input type="hidden" name="operation" value="grant"/>
       {selected&&<input type="hidden" name="return_client" value={selected.id}/>} 
       <label>E-mail do cliente<input type="email" name="email" maxLength={320} defaultValue={selected?.email||''} required placeholder="cliente@email.com"/></label>
       <label>Validade Gold (horário de Brasília)<input type="date" name="valid_until" required/></label>
       <label>Motivo da concessão<textarea name="reason" minLength={8} maxLength={500} rows={2} required placeholder="Ex.: Teste administrativo autorizado"/></label>
       <button className="gold-action" type="submit">Conceder autorização Gold</button>
      </form>
     </section>
     <section className="admin-card">
      <h2>Revogar autorização</h2>
      <p className="admin-card-explain">Revoga somente o adicional Gold. O Básico, Pro ou Ultra continua independente.</p>
      <form className="gold-admin-form" action={saveGoldAccess}>
       <input type="hidden" name="operation" value="revoke"/>
       {selected&&<input type="hidden" name="return_client" value={selected.id}/>} 
       <label>E-mail do cliente<input type="email" name="email" maxLength={320} defaultValue={selected?.email||''} required placeholder="cliente@email.com"/></label>
       <label>Motivo da revogação<textarea name="reason" minLength={8} maxLength={500} rows={2} required placeholder="Ex.: Revogação solicitada pelo cliente"/></label>
       <button className="gold-action gold-action-danger" type="submit">Revogar somente Gold</button>
      </form>
     </section>
    </div>
    <section className="admin-card">
     <h2>Parâmetros Gold — salvar versão</h2>
     <p className="admin-card-explain">O Gold começa com o padrão Refinado. Aqui você prepara configurações permitidas por indicador e salva versões auditáveis. Não dispara apostas ou sinais ao vivo.</p>
     <GoldConfigForm email={selected?.email||''} initial={selectedSettings} returnClient={selected?.id}/>
    </section>
    {selected&&<GoldClientHistory versions={versions} events={events} loadError={!!(accessResponse?.error||versionResponse?.error||eventResponse?.error)}/>}
    <section className="admin-card">
     <h2>Autorizações registradas <small>({rows.length})</small></h2>
     <div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Autorização</th><th>Validade Gold</th><th>Versão</th><th>Configurações</th></tr></thead>
      <tbody>{rows.map(x=><tr key={x.user_id}>
       <td className="admin-email">{x.email}</td>
       <td>{x.enabled?(x.valid_until&&new Date(x.valid_until).getTime()>Date.now()?'Autorizado':'Vencido'):'Revogado'}</td>
       <td>{dateBR(x.valid_until)}</td>
       <td>{x.config_version??'Padrão'}</td>
       <td><Link className="admin-inline-action" href={'/admin/gold?cliente='+encodeURIComponent(x.user_id)+'#gold-cliente'}>Histórico →</Link> <details className="gold-inline-details"><summary>Editar parâmetros</summary>
        <GoldConfigForm email={x.email} initial={validateGoldSettings(x.settings)?x.settings:REFINED_DEFAULT as Settings}/></details>
       </td>
      </tr>)}{rows.length===0&&<tr><td colSpan={5}>Nenhuma autorização Gold registrada ainda.</td></tr>}</tbody>
     </table></div>
    </section>
    <section className="admin-card"><h2>Histórico de alterações</h2>
     <p className="admin-card-explain">Últimos 40 eventos, com data, cliente e justificativa.</p>
     <div className="admin-table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Operação</th><th>Motivo</th></tr></thead>
      <tbody>{audit.map((e,i)=><tr key={e.created_at+e.email+i}><td>{dateBR(e.created_at)}</td><td className="admin-email">{e.email}</td>
       <td>{e.action==='access_granted'?'Concessão':e.action==='access_revoked'?'Revogação':'Configuração salva'}</td><td>{e.reason}</td></tr>)}
       {audit.length===0&&<tr><td colSpan={4}>Nenhuma operação Gold registrada.</td></tr>}
      </tbody></table></div>
    </section>
   </>}
  </div>
 </CommercialAdminShell>;
}
