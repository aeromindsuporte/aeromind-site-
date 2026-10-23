import {notFound} from 'next/navigation';
import Link from 'next/link';
import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {CustomerTabs} from '@/components/admin/CustomerTabs';
import {saveLicense,saveDeviceLimit,revokeAdminDevice} from '@/app/admin/actions';
import {saveCustomerContact,addCustomerNote,renewCustomerLicense} from '@/app/admin/customer-actions';
import {dateInputBrazil,labelForLicenseStatus,formatLicenseExpiryBrazil} from '@/lib/license-status';
import {displayWhatsApp} from '@/lib/whatsapp';
import './customer-v3.css';

export const dynamic='force-dynamic';
type License={id:string,plan_name:string,status:string,valid_until:string|null,max_devices:number,created_at:string};
type Device={id:string,device_name:string,status:string,last_seen_at:string|null,registered_at:string};
type Order={id:string,reference_id:string,plan_slug:string,plan_name:string,amount_cents:number,status:string,created_at:string,paid_at:string|null,duration_minutes:number};
type Audit={action:string,old_status:string|null,new_status:string,note:string|null,created_at:string};
type Renewal={duration_days:number,previous_expiry:string|null,new_expiry:string,plan_name:string,note:string|null,created_at:string};
type Note={category:string,body:string,created_at:string};
type Ticket={id:string,subject:string,category:string,status:string,created_at:string,updated_at:string};
type DeviceActivity={id:number;event_type:string;device_name:string|null;device_id:string|null;detail:string|null;ticket_id:string|null;actor_id:string|null;occurred_at:string;reviewed_at:string|null};
const deviceEventLabels:Record<string,string>={registered:'Aparelho solicitado',reactivated:'Novo vínculo solicitado',authorized:'Aparelho autorizado',revoked:'Acesso revogado',support_request:'Pedido de troca / suporte'};
type Customer={id:string,email:string,display_name:string|null,confirmed:boolean,created_at:string,
 last_sign_in_at:string|null,whatsapp:string|null,whatsapp_marketing_opt_in:boolean,
 licenses:License[],devices:Device[],orders:Order[],notes:Note[],license_audit:Audit[],renewals:Renewal[],
 tickets:Ticket[],paid_total_cents:number,paid_count:number,paid_first_at:string|null,paid_last_at:string|null,
 requests_total:number,orders_total:number,tickets_total:number};
const currency=(cents:number)=> (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateTime=(s:string|null|undefined)=>s?new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const tiers=['Básico','Pro','Ultra'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messages:Record<string,string>={
 'license-saved':'Licença atualizada e registrada no histórico.',
 'limit-saved':'Limite de aparelhos atualizado.',
 'device-revoked':'Aparelho revogado no servidor.',
 'contact-saved':'Dados de contato atualizados.',
 'contact-invalid':'Confira o nome e o WhatsApp com DDD brasileiro.',
 'contact-error':'Não foi possível salvar o contato.',
 'note-saved':'Observação interna registrada.',
 'note-invalid':'Digite uma observação válida de até 2.000 caracteres.',
 'note-error':'Não foi possível salvar a observação.',
 'renew-saved':'Licença renovada e auditoria registrada.',
 'renew-invalid':'Informe plano, período válido e confirme a concessão antes de renovar.',
 'renew-error':'O servidor não confirmou a renovação. Nenhuma concessão foi registrada.'
};
export default async function CustomerPage({params,searchParams}:{
 params:Promise<{id:string}>,searchParams:Promise<{msg?:string}>}){
 const {id}=await params;if(!uuid.test(id))notFound();
 const {sb}=await requireAdmin();
 const {data,error}=await sb.rpc('aeromind_admin_customer_v3',{p_user_id:id});
 if(error||!data)notFound();
 const c=data as Customer;
 const activityResult=await sb.from('aeromind_device_activity')
   .select('id,event_type,device_name,device_id,detail,ticket_id,actor_id,occurred_at,reviewed_at')
   .eq('user_id',id).order('occurred_at',{ascending:false}).limit(100);
 const deviceActivity=(activityResult.data||[]) as DeviceActivity[];
 const licenses=c.licenses||[],devices=c.devices||[],orders=c.orders||[],notes=c.notes||[];
 const audit=c.license_audit||[],renewals=c.renewals||[],tickets=c.tickets||[];
 const now=Date.now();
 const active=licenses.find(l=>l.status==='active'&&!!l.valid_until&&new Date(l.valid_until).getTime()>now);
 const current=active||licenses[0];
 const confirmedPaid=orders.filter(o=>o.status==='paid'&&!!o.paid_at);
 const paidTotal=Number(c.paid_total_cents||0),paidCount=Number(c.paid_count||0);
 const phone=c.whatsapp&&/^\+55[1-9][0-9]{9,10}$/.test(c.whatsapp)?c.whatsapp:null;
 const waLink=phone?'https://wa.me/'+phone.replace(/\D/g,''):null;
 const {msg}=await searchParams;
 const tabs=[
  {id:'overview',label:'Resumo',content:<div className="cv3-grid">
   <section className="cv3-card">
    <h2>Dados do cliente</h2>
    <dl className="cv3-detail">
     <div><dt>Nome</dt><dd>{c.display_name||'Não informado'}</dd></div>
     <div><dt>E-mail</dt><dd>{c.email}</dd></div>
     <div><dt>E-mail confirmado</dt><dd>{c.confirmed?'Sim':'Pendente'}</dd></div>
     <div><dt>WhatsApp</dt><dd>{displayWhatsApp(phone)}{waLink&&<a href={waLink} target="_blank" rel="noopener noreferrer" className="cv3-textlink">Abrir conversa ↗</a>}</dd></div>
     <div><dt>Cadastro</dt><dd>{dateTime(c.created_at)}</dd></div>
     <div><dt>Última entrada</dt><dd>{dateTime(c.last_sign_in_at)}</dd></div>
     <div><dt>Ofertas por WhatsApp</dt><dd>{c.whatsapp_marketing_opt_in?'Autorizadas':'Sem autorização'}</dd></div>
    </dl>
    <p className="cv3-muted">O número informado não é verificado por código. Use-o para contato, não como comprovante de identidade.</p>
   </section>
   <section className="cv3-card"><h2>Editar contato</h2>
    <form action={saveCustomerContact} className="cv3-form"><input type="hidden" name="customer_id" value={id}/>
     <label>Nome<input name="display_name" required minLength={2} maxLength={120} defaultValue={c.display_name||''}/></label>
     <label>WhatsApp com DDD<input type="tel" inputMode="tel" name="whatsapp" placeholder="(11) 99999-9999" defaultValue={displayWhatsApp(phone)==='Não cadastrado'?'':displayWhatsApp(phone)}/></label>
     <button>Salvar contato</button>
    </form>
   </section>
   <section className="cv3-card"><h2>Licença atual</h2>
    <p><span className={'cv3-status '+(active?'good':'warning')}>{labelForLicenseStatus(current?.status,current?.valid_until,now)}</span></p>
    <dl className="cv3-detail">
     <div><dt>Plano</dt><dd>{current?.plan_name||'Não contratado'}</dd></div>
     <div><dt>Contratação / registro</dt><dd>{dateTime(current?.created_at)}</dd></div>
     <div><dt>Vencimento</dt><dd>{formatLicenseExpiryBrazil(current?.valid_until)}</dd></div>
     <div><dt>Aparelhos permitidos</dt><dd>{current?.max_devices??'—'}</dd></div>
    </dl>
    <p className="cv3-muted">A data do registro da licença não substitui a data da compra. Consulte a aba Pagamentos para transações comprovadas.</p>
   </section>
   <section className="cv3-card"><h2>Resumo financeiro</h2>
    <div className="cv3-big">{currency(paidTotal)}</div><p className="cv3-muted">Total de pagamentos confirmados ({paidCount} operação/ões).</p>
    <dl className="cv3-detail">
     <div><dt>Primeiro pagamento</dt><dd>{dateTime(c.paid_first_at)}</dd></div>
     <div><dt>Último pagamento</dt><dd>{dateTime(c.paid_last_at)}</dd></div>
     <div><dt>Pedidos registrados</dt><dd>{c.orders_total||0}</dd></div>
     <div><dt>Downloads solicitados</dt><dd>{c.requests_total||0}</dd></div>
     <div><dt>Chamados</dt><dd>{c.tickets_total||0}</dd></div>
    </dl>
   </section>
  </div>},
  {id:'licenses',label:'Licenças e renovação',content:<div className="cv3-stack">
   <section className="cv3-card"><h2>Renovar ou estender acesso</h2>
    <p className="cv3-muted">Esta ação concede dias diretamente no servidor, sem cobrança. Se a licença ainda estiver válida, os novos dias serão acrescentados ao vencimento atual.</p>
    <form action={renewCustomerLicense} className="cv3-form cv3-form-grid">
     <input type="hidden" name="customer_id" value={id}/>
     <label>Plano<select name="tier" defaultValue={current?.plan_name||'Básico'}>{tiers.map(t=><option key={t}>{t}</option>)}</select></label>
     <label>Dias para acrescentar<input name="days" type="number" min={1} max={365} defaultValue={30} required/></label>
     <label className="cv3-full">Motivo da concessão<textarea name="note" rows={2} maxLength={500} required placeholder="Ex.: extensão aprovada pelo suporte"/></label>
     <label className="cv3-confirm cv3-full"><input type="checkbox" name="confirmation" value="yes" required/><span>Confirmo a renovação administrativa, sem gerar cobrança Pix.</span></label>
     <button className="cv3-full">Confirmar renovação e registrar auditoria</button>
    </form>
    <p className="cv3-muted">Para renovação paga, envie ao cliente o <Link href="/planos" target="_blank" rel="noopener noreferrer" className="cv3-textlink">link dos planos ↗</Link>. A licença será liberada pelo fluxo existente após a confirmação segura da PaggPay.</p>
   </section>
   <section className="cv3-card"><h2>Alterar licença manualmente</h2>
    <form action={saveLicense} className="cv3-form cv3-form-grid">
     <input type="hidden" name="customer_id" value={id}/><input type="hidden" name="email" value={c.email}/>
     <label>Plano<select name="tier" defaultValue={current?.plan_name||'Básico'}>{tiers.map(t=><option key={t}>{t}</option>)}</select></label>
     <label>Situação<select name="status" defaultValue={current?.status||'pending'}>
      <option value="pending">Pendente</option><option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="expired">Expirada</option><option value="revoked">Revogada</option>
     </select></label>
     <label>Validade (Brasília)<input type="date" name="valid_until" defaultValue={dateInputBrazil(current?.valid_until)}/></label>
     <label className="cv3-full">Motivo<textarea name="note" maxLength={500} rows={2} placeholder="Alteração manual auditada"/></label>
     <button className="cv3-full">Salvar alteração</button>
    </form>
   </section>
   <section className="cv3-card"><h2>Histórico de licenças</h2>
    <div className="cv3-table"><table><thead><tr><th>Plano</th><th>Cadastrada</th><th>Vencimento</th><th>Estado</th></tr></thead>
    <tbody>{licenses.map(l=><tr key={l.id}><td>{l.plan_name}</td><td>{dateTime(l.created_at)}</td><td>{formatLicenseExpiryBrazil(l.valid_until)}</td><td>{labelForLicenseStatus(l.status,l.valid_until)}</td></tr>)}
    {!licenses.length&&<tr><td colSpan={4}>Nenhuma licença registrada.</td></tr>}</tbody></table></div>
   </section>
  </div>},
  {id:'payments',label:'Pagamentos',content:<section className="cv3-card">
   <h2>Histórico financeiro</h2>
   <div className="cv3-finance"><strong>{currency(paidTotal)}</strong><span>{paidCount} pagamentos confirmados</span></div>
   <p className="cv3-muted">A receita inclui somente pedidos com status pago e data de confirmação. Cobranças pendentes não entram no total. Exibindo os últimos 100 pedidos.</p>
   <div className="cv3-table"><table><thead><tr><th>Data do pedido</th><th>Plano</th><th>Valor</th><th>Estado</th><th>Pago em</th></tr></thead>
    <tbody>{orders.map(o=><tr key={o.id}><td>{dateTime(o.created_at)}</td><td>{o.plan_name}</td><td>{currency(o.amount_cents)}</td>
     <td>{o.status==='paid'?'Confirmado':o.status==='pending'?'Pendente':o.status}</td><td>{dateTime(o.paid_at)}</td></tr>)}
     {!orders.length&&<tr><td colSpan={5}>Ainda não há pedidos registrados para este cliente.</td></tr>}</tbody>
   </table></div>
   {confirmedPaid.length===0&&<p className="cv3-muted">Nenhuma compra confirmada encontrada. Isso não exclui concessões administrativas ou dados anteriores ao histórico financeiro.</p>}
  </section>},
  {id:'devices',label:'Dispositivos',content:<div className="cv3-stack">
   <section className="cv3-card"><h2>Limite de aparelhos</h2>
    <form action={saveDeviceLimit} className="cv3-form cv3-form-grid">
     <input type="hidden" name="email" value={c.email}/><input type="hidden" name="customer_id" value={id}/>
     <label>Quantidade permitida<input name="max_devices" type="number" min={1} max={20} defaultValue={current?.max_devices||2} required/></label>
     <button>Salvar limite</button>
    </form>
   </section>
   <section className="cv3-card"><h2>Aparelhos vinculados</h2><div className="cv3-table"><table><thead><tr><th>Nome</th><th>Cadastro</th><th>Último acesso</th><th>Situação</th><th>Ação</th></tr></thead>
    <tbody>{devices.map(d=><tr key={d.id}><td>{d.device_name}</td><td>{dateTime(d.registered_at)}</td><td>{dateTime(d.last_seen_at)}</td>
     <td>{d.status}</td><td>{d.status!=='revoked'?<form action={revokeAdminDevice}><input type="hidden" name="device_id" value={d.id}/><input type="hidden" name="customer_id" value={id}/><button className="cv3-danger">Revogar</button></form>:'—'}</td></tr>)}
     {!devices.length&&<tr><td colSpan={5}>Nenhum aparelho vinculado.</td></tr>}</tbody></table></div></section>
   <section className="cv3-card"><h2>Histórico de movimentações dos aparelhos</h2>
    <p className="cv3-muted">Autorizações, revogações e solicitações de troca vinculadas a este cliente. Cada movimentação é registrada automaticamente.</p>
    {activityResult.error&&<p role="alert" className="admin-feedback bad">Não foi possível consultar o histórico de aparelhos.</p>}
    {!activityResult.error&&deviceActivity.length?deviceActivity.map(a=><div className="cv3-timeline" key={a.id}>
      <small>{dateTime(a.occurred_at)} · {a.actor_id===id?'Cliente':a.actor_id?'Equipe AeroMind':'Sistema'} · {a.reviewed_at?'Verificado':'Não verificado'}</small>
      <strong>{deviceEventLabels[a.event_type]||'Movimentação registrada'}</strong>
      <p>{a.device_name||a.detail||'Solicitação sobre dispositivo'}{a.device_name&&a.detail?' · '+a.detail:''}</p>
      {a.ticket_id&&<Link href={'/admin/suporte?ticket='+a.ticket_id} className="cv3-textlink">Abrir chamado relacionado →</Link>}
    </div>):!activityResult.error?<p className="cv3-muted">Ainda não foram registradas movimentações para este cliente.</p>:null}
    <Link href="/admin/movimentacoes" className="cv3-textlink">Ver central de movimentações →</Link>
   </section>
  </div>},
  {id:'history',label:'Histórico e notas',content:<div className="cv3-stack">
   <section className="cv3-card"><h2>Adicionar observação interna</h2>
    <form action={addCustomerNote} className="cv3-form"><input type="hidden" name="customer_id" value={id}/>
     <label>Observação<textarea name="note" rows={3} maxLength={2000} required placeholder="Informação interna para o atendimento"/></label>
     <button>Registrar observação</button>
    </form><p className="cv3-muted">Notas são visíveis somente para a equipe administrativa, não para o cliente.</p>
   </section>
   <section className="cv3-card"><h2>Observações</h2>
    {notes.length?notes.map((n,i)=><div className="cv3-timeline" key={i}>
     <small>{dateTime(n.created_at)} · {n.category==='contact'?'Atualização de contato':'Nota interna'}</small><p>{n.body}</p>
    </div>):<p className="cv3-muted">Sem observações internas.</p>}
   </section>
   <section className="cv3-card"><h2>Renovações administrativas</h2>
    {renewals.length?renewals.map((r,i)=><div className="cv3-timeline" key={i}><small>{dateTime(r.created_at)}</small>
     <strong>{r.plan_name} · +{r.duration_days} dias</strong>
     <p>Vencimento anterior: {dateTime(r.previous_expiry)} → novo: {dateTime(r.new_expiry)}.</p>
     {r.note&&<p>{r.note}</p>}</div>):<p className="cv3-muted">Sem renovações administrativas registradas nesta nova modalidade.</p>}
   </section>
   <section className="cv3-card"><h2>Auditoria anterior de licenças</h2>
    {audit.length?audit.map((a,i)=><div className="cv3-timeline" key={i}><small>{dateTime(a.created_at)}</small>
     <p>{a.action==='create'?'Criação':'Alteração'}: {a.old_status||'—'} → {a.new_status}. {a.note||''}</p>
    </div>):<p className="cv3-muted">Sem eventos de auditoria registrados.</p>}
   </section>
  </div>},
  {id:'support',label:'Suporte',content:<section className="cv3-card"><h2>Chamados do cliente</h2>
   <p className="cv3-muted">Exibindo até 50 chamados. Respostas completas ficam na área de suporte.</p>
   <div className="cv3-table"><table><thead><tr><th>Data</th><th>Assunto</th><th>Categoria</th><th>Situação</th></tr></thead>
    <tbody>{tickets.map(t=><tr key={t.id}><td>{dateTime(t.created_at)}</td><td>{t.subject}</td><td>{t.category}</td><td>{t.status}</td></tr>)}
    {!tickets.length&&<tr><td colSpan={4}>O cliente ainda não abriu chamados.</td></tr>}</tbody>
   </table></div><Link className="cv3-textlink" href="/admin/suporte">Abrir painel de suporte →</Link>
  </section>}
 ];
 return <CommercialAdminShell active="/admin/clientes" title={c.display_name||'Gerenciar cliente'}
  description={'Ficha completa de cliente · '+c.email}>
  <div className="cv3-root">
   <p><Link href="/admin/clientes" className="cv3-textlink">← Voltar aos clientes</Link></p>
   {msg&&<p role="status" className={'admin-feedback '+(msg.endsWith('-saved')||msg==='device-revoked'?'good':'bad')}>
    {messages[msg]||'Confira os dados e tente novamente.'}</p>}
   <div className="cv3-hero">
    <div><span className="cv3-eyebrow">PERFIL DO CLIENTE</span><h2>{c.display_name||'Cliente AeroMind'}</h2>
     <p>{c.email}</p><span className={'cv3-status '+(active?'good':'warning')}>{labelForLicenseStatus(current?.status,current?.valid_until,now)}</span></div>
    <div className="cv3-hero-actions">
     {waLink&&<a href={waLink} target="_blank" rel="noopener noreferrer" className="cv3-action">Conversar no WhatsApp ↗</a>}
     <Link href="/planos" className="cv3-action" target="_blank" rel="noopener noreferrer">Planos para renovação ↗</Link>
    </div>
   </div>
   <div className="cv3-metrics">
    <div><span>Total pago</span><strong>{currency(paidTotal)}</strong></div>
    <div><span>Pagamentos</span><strong>{paidCount}</strong></div>
    <div><span>Plano</span><strong>{current?.plan_name||'Sem plano'}</strong></div>
    <div><span>Dispositivos</span><strong>{devices.length}</strong></div>
   </div>
   <CustomerTabs tabs={tabs}/>
  </div>
 </CommercialAdminShell>;
}
