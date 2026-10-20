'use client';
import {useEffect,useState} from 'react';
type PixReply={error?:string;message?:string;requiresSupport?:boolean;status?:string;orderId?:string;amountCents?:number;emv?:string|null;expiresAt?:string|null;valid?:boolean;discounted_cents?:number};
export function PixCheckoutForm({slug,baseCents,mode}:{slug:string,baseCents:number,mode:'live'|'sandbox'}){
 const [orderId,setOrderId]=useState('');
 const [coupon,setCoupon]=useState(''),[preview,setPreview]=useState<number|null>(null),
 [error,setError]=useState(''),[loading,setLoading]=useState(false);
 const [payerName,setPayerName]=useState(''),[document,setDocument]=useState(''),
 [emv,setEmv]=useState<string|null>(null),[status,setStatus]=useState(''),
 [warning,setWarning]=useState(''),[failures,setFailures]=useState(0);
 const money=(v:number)=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 useEffect(()=>{
  if(!orderId||status==='paid'||failures>=3)return;
  let active=true;
  const timer=setInterval(async()=>{
   try{
    const r=await fetch('/api/pix/status?pedido='+encodeURIComponent(orderId),{cache:'no-store'});
    if(!r.ok)throw new Error('Status unavailable');
    const j=await r.json() as PixReply;
    if(!active)return;
    setFailures(0);setStatus(j.status||'creating');
    if(j.emv)setEmv(j.emv);
    if(j.requiresSupport)setWarning(j.message||'Confira a cobrança existente com o suporte. Não gere outra.');
    if(j.status==='paid'){setWarning('Pagamento confirmado. Licença processada pelo servidor.');setError('');}
   }catch{if(active)setFailures(n=>n+1);}
  },10_000);
  return ()=>{active=false;clearInterval(timer);};
 },[orderId,status,failures]);
 async function checkCoupon(){
  setError('');setPreview(null);
  if(!coupon.trim())return;
  try{
   const r=await fetch('/api/coupons/preview?plano='+encodeURIComponent(slug)+'&codigo='+encodeURIComponent(coupon.trim()),{cache:'no-store'});
   const j=await r.json() as PixReply;
   if(!r.ok||!j.valid){setError(j.error||'Cupom inválido ou expirado.');return;}
   setPreview(j.discounted_cents??null);
  }catch{setError('Falha ao verificar cupom.');}
 }
 async function pay(){
  if(loading||orderId)return;
  setLoading(true);setError('');setWarning('');
  try{
   const r=await fetch('/api/pix/create',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({plan:slug,payerName,document,coupon:coupon.trim()})});
   const j=await r.json() as PixReply;
   if(j.orderId){
    setOrderId(j.orderId);setStatus(j.status||'creating');
    if(j.emv)setEmv(j.emv);
    if(j.message)setWarning(j.message);
    if(j.requiresSupport)setWarning(j.message||'Solicitação aguardando conciliação. Não gere outra cobrança.');
   }
   if(!r.ok){setError(j.error||'Não foi possível preparar o Pix.');return;}
   if(!j.orderId)setError('O provedor não retornou número do pedido. Consulte o suporte.');
  }catch{setError('Falha de conexão. Não tente um segundo pagamento antes de verificar o pedido.');}
  finally{setLoading(false);}
 }
 return <div className="account-card" style={{maxWidth:630,display:'grid',gap:16}}>
  <h2>{mode==='live'?'Pagamento Pix AeroMind':'Checkout Pix de homologação'}</h2>
  <p>{mode==='live'?'Pague com Pix copia e cola. Sua licença será liberada automaticamente após confirmação pela PaggPay.':'Ambiente exclusivo da equipe de testes.'}</p>
  <label>Nome do pagador<input value={payerName} onChange={e=>setPayerName(e.target.value)} maxLength={120} placeholder="Nome completo"/></label>
  <label>CPF ou CNPJ<input value={document} onChange={e=>setDocument(e.target.value)} placeholder="Somente números" inputMode="numeric"/></label>
  <label>Cupom<input value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setPreview(null)}} maxLength={24} placeholder="Cupom de desconto" disabled={!!orderId}/></label>
  <button className="auth-secondary" type="button" onClick={checkCoupon} disabled={!!orderId}>Verificar cupom</button>
  <strong>Valor do pedido: {money(preview??baseCents)}</strong>
  <button className="auth-submit" type="button" disabled={loading||!!orderId||payerName.trim().length<3||![11,14].includes(document.replace(/\D/g,'').length)} onClick={pay}>{loading?'Preparando cobrança...':mode==='live'?'Gerar Pix para pagamento':'Gerar Pix de teste'}</button>
  {error&&<p role="alert" className="device-notice error">{error}</p>}
  {orderId&&<p>Situação: <strong>{status==='paid'?'Pagamento confirmado':status==='pending'?'Aguardando pagamento':status==='failed'?'Falha na solicitação Pix':'Preparando/conferindo Pix'}</strong></p>}
  {warning&&<p role="status" className="device-notice">{warning}</p>}
  {failures>=3&&<p role="alert">A consulta automática foi interrompida após três falhas. Consulte o pedido em Meus pagamentos e não gere outro Pix.</p>}
  {emv&&status!=='paid'&&<div><strong>Pix copia e cola{mode==='sandbox'?' (sandbox)':''}:</strong><p style={{overflowWrap:'anywhere'}}>{emv}</p>
   <button className="auth-secondary" onClick={()=>navigator.clipboard?.writeText(emv)} type="button">Copiar código</button></div>}
  {orderId&&<p><a href={'/checkout/retorno?pedido='+encodeURIComponent(orderId)}>Consultar situação deste pedido →</a></p>}
  {status==='paid'&&<p><a href="/minha-conta">Abrir minha conta e conferir licença →</a></p>}
  <style>{'.account-card label{display:grid;gap:8px}.account-card input{background:#0b1730;color:#fff;border:1px solid #4a518b;padding:13px;border-radius:10px;max-width:100%}'}</style>
 </div>;
}
