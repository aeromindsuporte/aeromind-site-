import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Direct same-origin download with cryptographic integrity verification.
// Android APKs up to 4 MB use this route; bigger releases use signed Storage
// links to avoid crossing the Vercel Function response payload limit.
const MAX_DIRECT_APK_BYTES=4_000_000;

function failure(status:number,message:string){
  return NextResponse.json({error:message},{
    status,headers:{
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
    }
  });
}

export async function GET(){
  try{
    const supabase=await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(!user||authError)return failure(401,'Entre na sua conta para baixar o aplicativo.');

    const {data:active,error:licenseError}=await supabase.rpc('aeromind_has_active_license');
    if(licenseError||active!==true)
      return failure(403,'É necessária uma licença ativa.');

    const {data:release,error:releaseError}=await supabase.from('aeromind_app_releases')
      .select('version_code,storage_path,sha256,size_bytes')
      .eq('status','published').order('version_code',{ascending:false}).limit(1).maybeSingle();

    if(releaseError||!release)return failure(404,'Nenhuma versão publicada encontrada.');
    if(!Number.isSafeInteger(release.size_bytes)||release.size_bytes<20000
       ||release.size_bytes>MAX_DIRECT_APK_BYTES)
      return failure(409,'Esta versão exige o download por link de armazenamento.');

    const {data:apk,error:storageError}=await supabase.storage
      .from('aeromind-apk-releases').download(release.storage_path);
    if(storageError||!apk)return failure(404,'APK não encontrado no armazenamento.');

    const bytes=Buffer.from(await apk.arrayBuffer());
    const digest=createHash('sha256').update(bytes).digest('hex');
    if(bytes.length!==release.size_bytes||digest!==release.sha256){
      // Never distribute a file that differs from the published release.
      console.error('APK integrity mismatch', {versionCode:release.version_code});
      return failure(502,'Integridade do APK não corresponde ao arquivo publicado. Contate o suporte.');
    }
    if(bytes.subarray(0,2).toString()!=='PK')
      return failure(502,'Arquivo do APK inválido.');

    return new NextResponse(new Uint8Array(bytes),{
      status:200,
      headers:{
        'Content-Type':'application/vnd.android.package-archive',
        'Content-Disposition':'attachment; filename="AeroMind-v'+release.version_code+'.apk"',
        'Content-Length':String(bytes.length),
        'Cache-Control':'private, no-store, max-age=0',
        'X-Content-Type-Options':'nosniff',
        'X-AeroMind-SHA256':digest,
        'X-AeroMind-Integrity':'verified'
      }
    });
  }catch{
    return failure(500,'Falha temporária ao baixar o aplicativo.');
  }
}
