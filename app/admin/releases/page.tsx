import {requireAdmin} from '@/lib/admin-access';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import {ReleaseUploader} from '@/components/admin/ReleaseUploader';
export const dynamic='force-dynamic';
type Release={version:string,code:number,status:string,path:string,published_at:string|null};
export default async function AdminReleases(){
 const {sb}=await requireAdmin();
 const {data,error}=await sb.rpc('aeromind_admin_devices');
 const releases=(Array.isArray(data?.releases)?data.releases:[]) as Release[];
 return <CommercialAdminShell active="/admin/releases" title="Atualizações do aplicativo" description="Gerencie as versões do AeroMind Monitor e os arquivos oficiais.">
 {error?<p role="alert" className="admin-feedback bad">Não foi possível consultar as versões. Não publique arquivos até normalizar a conexão.</p>:
 <section className="admin-card"><h2>Versões cadastradas</h2>
 {releases.length?<div className="admin-release-list">{releases.map(r=><article className="admin-release-item" key={r.code}>
 <strong>AeroMind {r.version}</strong><span>{r.status==='published'?'Publicada':r.status==='draft'?'Rascunho':'Arquivada'}</span>
 <small>Código {r.code} · {r.path}</small></article>)}</div>:
 <p className="admin-card-explain">Nenhuma versão cadastrada.</p>}
 </section>}
 <section className="admin-card" style={{marginTop:16}}><h2>Publicar uma atualização</h2>
 <p className="admin-card-explain">Somente APK release assinado, com identidade digital consistente com a versão anterior. O servidor confere SHA-256 e versão. Este formulário aceita arquivos até 6 MB; não use o upload se o seu APK for maior.</p>
 <ReleaseUploader/>
 </section></CommercialAdminShell>;
}
