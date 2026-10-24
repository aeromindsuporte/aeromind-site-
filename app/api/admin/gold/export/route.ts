import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {goldProspectiveCsv,goldProspectiveReport,type GoldRound,type GoldSignal} from '@/lib/gold/prospective';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const failure=(status:number,msg:string)=>NextResponse.json({error:msg},{status,headers:noStore});

export async function GET(request:Request){
 const sb=await createClient();
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError||!user)return failure(401,'Autenticação necessária');
 const {data:staff,error:staffError}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
 if(staffError||!staff||!['admin','owner'].includes(staff.role))return failure(403,'Acesso não autorizado');
 const client=new URL(request.url).searchParams.get('cliente');
 if(!client||!uuid.test(client))return failure(400,'Cliente inválido');
 const {data:subject,error:customerError}=await sb.rpc('aeromind_admin_customer_v3',{p_user_id:client});
 if(customerError||!subject?.id)return failure(404,'Cliente não encontrado');
 const [r,s]=await Promise.all([
  sb.from('aeromind_gold_round_observations').select('id,subject_id,stream_key,round_key,multiplier,source_kind,observed_at')
   .eq('subject_id',client).order('observed_at',{ascending:false}).limit(200),
  sb.from('aeromind_gold_prospective_signals').select('id,subject_id,stream_key,next_round_key,anchor_round_id,profile,indicator,target_x,rule_version,evidence_type,emitted_at')
   .eq('subject_id',client).order('emitted_at',{ascending:false}).limit(200)
 ]);
 if(r.error||s.error)return failure(503,'Consulta de registros indisponível');
 const report=goldProspectiveReport((s.data||[]) as GoldSignal[],(r.data||[]) as GoldRound[]);
 // Auditoria deve ser confirmada ANTES de enviar dados ao cliente.
 const audit=await sb.rpc('aeromind_gold_admin_log_export',{p_subject_id:client,p_count:report.signals.length});
 if(audit.error||audit.data?.ok!==true)return failure(503,'Não foi possível registrar a auditoria da exportação');
 return new Response(goldProspectiveCsv(report),{
  status:200,headers:{...noStore,
   'Content-Type':'text/csv; charset=utf-8',
   'Content-Disposition':'attachment; filename="aeromind_gold_relatorio_manual.csv"'}
 });
}
