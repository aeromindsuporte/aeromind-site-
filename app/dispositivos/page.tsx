import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { revokeMyDevice, approveMyDevice } from './actions';

export const dynamic='force-dynamic';
export const metadata={title:'Meus dispositivos | AeroMind',robots:{index:false,follow:false}};

type Device={
 id:string;device_name:string;os_version:string|null;status:'pending'|'active'|'revoked';
 registered_at:string;last_seen_at:string|null;revoked_at:string|null;
};
const fmt=(x:string|null)=> x?new Date(x).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
export default async function Devices({searchParams}:{searchParams:Promise<{status?:string}>}){
 const supabase=await createClient();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(!user||userError)redirect('/entrar?next=%2Fdispositivos');
 const [devicesResult,licenseResult,limitResult]=await Promise.all([
   supabase.from('aeromind_devices')
     .select('id,device_name,os_version,status,registered_at,last_seen_at,revoked_at')
     .eq('user_id',user.id).order('registered_at',{ascending:false}),
   supabase.rpc('aeromind_has_active_license'),
   supabase.from('licenses').select('max_devices').eq('user_id',user.id).eq('status','active').gt('valid_until',new Date().toISOString()).order('valid_until',{ascending:false}).limit(1).maybeSingle()
 ]);
 const devices=(devicesResult.data??[]) as Device[];
 const active=devices.filter(d=>d.status==='active');
 const reserved=devices.filter(d=>d.status==='active'||d.status==='pending');
 const license=licenseResult.data===true&&!licenseResult.error;
 const maxDevices=Math.max(1,Math.min(20,Number(limitResult.data?.max_devices)||2));
 const {status}=await searchParams;
 return <main className="account-root"><header className="account-header">
   <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="40" height="40"/> AeroMind</Link>
   <Link className="auth-secondary" href="/minha-conta">Minha conta →</Link>
  </header><section className="account-container">
   <span className="auth-eyebrow">▣ CONTROLE DE ACESSO</span>
   <h1>Meus <em>dispositivos</em></h1>
   <p className="account-lead">Veja e revogue os aparelhos vinculados à sua licença.</p><p><Link className="auth-secondary auth-button-link" href="/suporte?categoria=dispositivo&assunto=Solicita%C3%A7%C3%A3o%20de%20troca%20de%20aparelho">Solicitar troca ou ajuda com aparelho →</Link></p>
   <div className="device-capacity">
     <div className="device-capacity-top"><strong>{active.length} ativo(s) · {reserved.length} de {maxDevices} vagas</strong><span>{license?'Licença ativa':'Licença não ativa'}</span></div>
     <div className="device-bar" role="progressbar" aria-label="Dispositivos ativos" aria-valuemax={maxDevices} aria-valuemin={0} aria-valuenow={Math.min(maxDevices,reserved.length)}>
       <div style={{width:Math.min(100,reserved.length/maxDevices*100)+'%'}}/>
     </div>
     <p>Sua licença permite até {maxDevices} aparelho(s). O Android solicitará autorização, e você confirmará aqui antes de liberar o aparelho.</p>
   </div>
   {status==='approved'&&<p role="status" className="device-notice good">Dispositivo autorizado.</p>}
   {status==='approve-failed'&&<p role="alert" className="device-notice error">Não foi possível autorizar. Verifique sua licença e o limite de aparelhos.</p>}
   {status==='revoked'&&<p role="status" className="device-notice good">O dispositivo foi revogado com sucesso.</p>}
   {status==='failed'&&<p role="alert" className="device-notice error">Não foi possível revogar o dispositivo. Tente novamente.</p>}
   {devicesResult.error&&<p role="alert" className="device-notice error">Não foi possível carregar a lista de dispositivos.</p>}
   <div className="device-items">
    {devices.length ? devices.map(d=><article className="device-item" key={d.id}>
      <div className="device-symbol" aria-hidden="true">▯</div>
      <div className="device-info"><strong>{d.device_name}</strong><span>{d.os_version||'Android'} · Registrado em {fmt(d.registered_at)}</span><span>Último acesso: {fmt(d.last_seen_at)}</span></div>
      <div className="device-actions">
        <span className={'device-state '+(d.status==='active'?'on':d.status==='pending'?'pending':'off')}>{d.status==='active'?'Ativo':d.status==='pending'?'Pendente':'Revogado'}</span>
        
        {d.status==='pending'&&<form action={approveMyDevice}>
          <input type="hidden" name="device_id" value={d.id}/>
          <button type="submit" className="device-approve" disabled={!license}>Autorizar aparelho</button>
        </form>}
        {d.status!=='revoked'&&<form action={revokeMyDevice}>
          <input type="hidden" name="device_id" value={d.id}/>
          <button type="submit" className="device-revoke">Revogar acesso</button>
        </form>}
      </div>
    </article>) :<div className="device-empty"><span aria-hidden="true">▣</span><strong>Nenhum dispositivo vinculado</strong><p>Quando o aplicativo Android solicitar o vínculo, o aparelho aparecerá aqui como pendente. Não existem dados simulados.</p></div>}
   </div>
   <div className="device-explanation"><h2>Como funcionará</h2><p>1. Uma licença válida autoriza o acesso ao aplicativo. 2. O aplicativo solicita o vínculo e você aprova o aparelho nesta tela. 3. Você pode revogar aparelhos antigos por esta página.</p><p>O mecanismo de verificação de integridade do aplicativo ainda será integrado antes do lançamento.</p><Link href="/download" className="auth-secondary auth-button-link">Ver download do AeroMind →</Link></div>
  </section></main>;
}
