import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const sb=await createClient(),{data:{user}}=await sb.auth.getUser();
 if(!user)return NextResponse.json({error:'Faça login.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const url=new URL(req.url),plan=url.searchParams.get('plano')||'',code=(url.searchParams.get('codigo')||'').trim();
 if(!/^(basico|pro|ultra)-(mensal|trimestral|semestral|anual)$/.test(plan)||!/^[a-zA-Z0-9_-]{4,32}$/.test(code))return NextResponse.json({valid:false},{status:400});
 const {data,error}=await sb.rpc('aeromind_coupon_preview',{p_code:code,p_slug:plan});
 if(error)return NextResponse.json({error:'Falha ao verificar cupom.'},{status:400});
 return NextResponse.json(data||{valid:false},{headers:{'Cache-Control':'no-store'}});
}
