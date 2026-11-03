import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
const cookieName='am_trial_visit';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Records a genuine navigation through a Test CTA, even before signup.
 * Prefetch must remain disabled on links pointing here. */
export async function GET(request:NextRequest){
 const slug=request.nextUrl.searchParams.get('plano');
 if(slug!=='teste-horas'&&slug!=='teste-dias'){
  return NextResponse.redirect(new URL('/planos',request.url));
 }
 const stored=request.cookies.get(cookieName)?.value||'';
 const visitKey=uuid.test(stored)?stored:randomUUID();
 // This is an anonymous-safe, narrowly scoped RPC. A failed metric never blocks the visit.
 try{
  const sb=await createClient();
  const {error}=await sb.rpc('aeromind_record_trial_click',{
   p_slug:slug,p_visit_key:visitKey
  });
  if(error)console.error('aeromind_trial_click_metric_failed',{code:error.code||'RPC_ERROR'});
 }catch{
  console.error('aeromind_trial_click_metric_unavailable');
 }
 const response=NextResponse.redirect(
  new URL('/teste-gratis?plano='+encodeURIComponent(slug),request.url)
 );
 response.headers.set('Cache-Control','private, no-store');
 response.cookies.set(cookieName,visitKey,{
  path:'/',maxAge:60*60*24*30,httpOnly:true,sameSite:'lax',
  secure:process.env.NODE_ENV==='production'
 });
 return response;
}