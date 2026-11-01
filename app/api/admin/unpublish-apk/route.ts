import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const reply=(status:number,message:string)=>NextResponse.json({message},{
  status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
});

export async function POST(request:NextRequest){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)
      return reply(403,'Origem não autorizada.');
    if(Number(request.headers.get('content-length')||0)>2048)
      return reply(413,'Solicitação muito grande.');
    const supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user||!user.email_confirmed_at)
      return reply(401,'Entre em uma conta administradora confirmada.');
    const {data:staff,error:staffError}=await supabase.from('aeromind_staff')
      .select('role').eq('user_id',user.id).maybeSingle();
    if(staffError||!staff||!['owner','admin'].includes(staff.role))
      return reply(403,'Operação exclusiva do administrador.');
    const body=await request.json() as {versionCode?:number;expectedPath?:string};
    if(!Number.isSafeInteger(body.versionCode)||!body.versionCode||body.versionCode<1
       ||typeof body.expectedPath!=='string'
       ||!/^releases\/aeromind-v[0-9]+-[a-f0-9]{16}\.apk$/.test(body.expectedPath))
      return reply(400,'Identificação da versão inválida.');

    const {data,error}=await supabase.rpc('aeromind_admin_unpublish_release',{
      p_version_code:body.versionCode,p_expected_path:body.expectedPath
    });
    if(error||!data?.ok)
      return reply(409,'Não foi possível retirar a versão. Atualize a página e confirme que ela ainda está publicada.');
    return NextResponse.json({ok:true,versionCode:body.versionCode},{
      headers:{'Cache-Control':'private, no-store'}
    });
  }catch{
    return reply(500,'Falha ao retirar versão. Tente novamente.');
  }
}
