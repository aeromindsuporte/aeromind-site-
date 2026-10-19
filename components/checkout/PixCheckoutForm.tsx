'use client';
import {useState} from 'react';
export function PixCheckoutForm({slug,baseCents}:{slug:string,baseCents:number}){
 const [coupon,setCoupon]=useState(''),[preview,setPreview]=useState<number|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const [payerName,setPayerName]=useState(''),[document,setDocument]=useState(''),[emv,setEmv]=useState<string|null>(null);
 async function checkCoupon(){
  setError('');setPreview(null);
  if(!coupon.trim())return;
  try{
   const r=await fetch('/api/coupons/preview?plano='+encodeURIComponent(slug)+'&codigo='+encodeURIComponent(coupon.trim()),{cache:'no-store'});
   const json=await r.json() as {valid?:boolean,discounted_cents?:number,error?:string};
   if(!r.ok||!json.valid){setError(json.error||'Cupom inválido ou expirado.');return;}
   setPreview(json.discounted_cents??null);
  }catch{setError('Falha ao verificar cupom.');}
 }
 async function pay(){
  setError('');setLoading(true);
  try{
   const r=await fetch('/api/pix/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:slug,payerName,document,coupon:coupon.trim()})});
   const j=await r.json() as {error?:string,emv?:string|null,orderId?:string};
   if(!r.ok){setError(j.error||'Não foi possível gerar o Pix.');return;}
   if(j.emv)setEmv(j.emv);
   if(j.orderId){window.location.assign('/checkout/retorno?pedido='+encodeURIComponent(j.orderId));return;}
   setError('Pedido criado, mas o código Pix não foi retornado. Consulte o suporte.');
  }catch{setError('Erro de conexão. Não tente pagar sem código confirmado.');}
  finally{setLoading(false);}
 }
 const money=(v:number)=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 return <div className="account-card" style={{maxWidth:630,display:'grid',gap:16}}>
 <h2>Checkout Pix de homologação</h2><p>Este ambiente é reservado à equipe de testes. Nenhuma licença é ativada antes da confirmação do servidor.</p>
 <label>Nome do pagador<input value={payerName} onChange={e=>setPayerName(e.target.value)} maxLength={120} placeholder="Nome completo" /></label>
 <label>CPF ou CNPJ<input value={document} onChange={e=>setDocument(e.target.value)} placeholder="Somente números" inputMode="numeric"/></label>
 <label>Cupom<input value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setPreview(null)}} maxLength={32} placeholder="Cupom de desconto"/></label>
 <button className="auth-secondary" type="button" onClick={checkCoupon}>Verificar cupom</button>
 <strong>Valor do pedido: {money(preview??baseCents)}</strong>
 <button className="auth-submit" type="button" disabled={loading||payerName.trim().length<3||![11,14].includes(document.replace(/\D/g,'').length)} onClick={pay}>{loading?'Preparando cobrança...':'Gerar Pix de teste'}</button>
 {error&&<p role="alert" className="device-notice error">{error}</p>}
 {emv&&<p style={{overflowWrap:'anywhere'}}>{emv}</p>}
 <style>{'.account-card label{display:grid;gap:8px}.account-card input{background:#0b1730;color:#fff;border:1px solid #4a518b;padding:13px;border-radius:10px;max-width:100%}'}</style>
 </div>;
}
