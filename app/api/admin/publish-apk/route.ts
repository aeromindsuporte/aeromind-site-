import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function reply(status:number,message:string){
  return NextResponse.json({message},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
type ReleasePayload={
 versionCode?:number;versionName?:string;path?:string;sha256?:string;
 sizeBytes?:number;notes?:string;signingConfirmed?:boolean;
};
// Only the verified staff member can publish. The APK is re-read from the private
// bucket and SHA-256 is computed by the SERVER, not trusted from client metadata.
export async function POST(request:NextRequest){
 try{
   if(request.headers.get('origin')!==new URL(request.url).origin) return reply(403,'Origem não autorizada.');
   if(Number(request.headers.get('content-length')||0)>8192) return reply(413,'Solicitação muito grande.');
   const supabase=await createClient();
   const {data:{user},error:userError}=await supabase.auth.getUser();
   if(userError||!user) return reply(401,'Entre na conta administradora.');
   const {data:staff,error:staffError}=await supabase.from('aeromind_staff').select('role')
      .eq('user_id',user.id).maybeSingle();
   if(staffError||!staff) return reply(403,'Área restrita ao administrador.');
   const input=(await request.json()) as ReleasePayload;
   const code=input.versionCode;
   const name=(input.versionName||'').trim();
   const path=input.path||'';
   const sha=input.sha256||'';
   const bytes=input.sizeBytes;
   const notes=(input.notes||'').trim();
   if(input.signingConfirmed!==true
     ||!Number.isInteger(code)||!code||code<1||code>2147483647
     ||name.length<1||name.length>40
     ||!/^[0-9a-f]{64}$/.test(sha)
     ||path!==('releases/aeromind-v'+code+'-'+sha.slice(0,16)+'.apk')
     ||!Number.isInteger(bytes)||!bytes||bytes<20000||bytes>6291456
     ||notes.length>2000) return reply(400,'Dados ou confirmação da versão inválidos.');
   const {data:apk,error:downloadError}=await supabase.storage
      .from('aeromind-apk-releases').download(path);
   if(downloadError||!apk) return reply(404,'APK não encontrado no armazenamento privado.');
   if(apk.size!==bytes) return reply(422,'Tamanho do APK não corresponde ao upload.');
   const content=Buffer.from(await apk.arrayBuffer());
   const actual=createHash('sha256').update(content).digest('hex');
   if(actual!==sha) return reply(422,'Falha na conferência SHA-256 do APK.');
   if(content.subarray(0,2).toString()!=='PK'
     ||!content.includes(Buffer.from('AndroidManifest.xml'))
     ||!content.includes(Buffer.from('classes.dex')))
       return reply(422,'O arquivo não parece ser um APK Android válido.');
   const {data:id,error:publishError}=await supabase.rpc('aeromind_publish_release',{
     p_version_code:code,p_version_name:name,p_storage_path:path,
     p_sha256:actual,p_size_bytes:bytes,p_release_notes:notes
   });
   if(publishError||!id)return reply(422,'Não foi possível publicar: confira se o código da versão é maior que os anteriores.');
   return NextResponse.json({ok:true,version:name},{headers:{'Cache-Control':'no-store'}});
 }catch{
   return reply(500,'Não foi possível validar ou publicar a versão.');
 }
}
