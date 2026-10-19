import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';
const response=(body:Record<string,string>,status:number)=>NextResponse.json(body,{
 status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}
});

// A short-lived, licensed signed URL is created on demand; no service-role key.
export async function POST(){
 try{
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(!user||authError)return response({error:'Entre na sua conta para continuar.'},401);
  const {data:active,error:licenseError}=await supabase.rpc('aeromind_has_active_license');
  if(licenseError||active!==true)return response({error:'É necessária uma licença ativa.'},403);
  const {data:release,error:releaseError}=await supabase.from('aeromind_app_releases')
   .select('id,version_name,storage_path,sha256,size_bytes,status')
   .eq('status','published')
   .order('version_code',{ascending:false}).limit(1).maybeSingle();
  if(releaseError||!release)return response({error:'Nenhuma versão do APK foi publicada.'},404);
  const {data:signed,error:storageError}=await supabase.storage
   .from('aeromind-apk-releases').createSignedUrl(release.storage_path,60,{download:'AeroMind.apk'});
  if(storageError||!signed?.signedUrl)return response({error:'Arquivo não disponível. Contate o suporte.'},404);
  // The record represents a signed-link request, not a proven completed file transfer.
  const {error:auditError}=await supabase.from('aeromind_download_events')
    .insert({user_id:user.id,release_id:release.id});
  if(auditError)return response({error:'Não foi possível registrar a solicitação de download. Tente novamente.'},503);
  return response({url:signed.signedUrl,version:release.version_name,sha256:release.sha256,size_bytes:String(release.size_bytes)},200);
 }catch{return response({error:'Falha temporária ao gerar link.'},500);}
}
