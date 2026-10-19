'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/browser';
type Props={slug:string;priceCents:number;enabled:boolean};
const money=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function PixCheckout({slug,priceCents,enabled}:Props){
 const [coupon,setCoupon]=useState('');
 const [discount,setDiscount]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [payerName,setName]=useState('');
 const [document,setDocument]=useState('');
 const [orderId,setOrder]=useState('');
 const [pix,setPix]=useState('');
 const [status,setStatus]=useState('');
 async function checkCoupon(){
  setBusy(true);setError('');setMessage('');setDiscount(null);
  try{
   if(!coupon.trim()){setError('Informe um cupom.');return;}
   const sb=createClient();
   const {data,error}=await sb.rpc('aeromind_coupon_preview',{p_code:coupon.trim().toUpperCase(),p_slug:slug});
   const result=data as {valid?:boolean;discount_percent?:number;discounted_cents?:number}|null;
   if(error||!result?.valid||!Number.isInteger(result.discounted_cents)){setError('Cupom inválido, expirado ou esgotado.');return;}
   setDiscount(result.discounted_cents!);setMessage('Cupom válido: '+result.discount_percent+'% de desconto. O valor será confirmado pelo servidor.');
  }catch{setError('Não foi possível validar o cupom.');}finally{setBusy(false);}
 }
 async function createPix(){
  if(!enabled)return;
  setBusy(true);setError('');setMessage('');
  try{
   const res=await fetch('/api/pix/create',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({plan:slug,payerName,document,coupon:coupon.trim().toUpperCase()||undefined})});
   const data=await res.json() as {error?:string;orderId?:string;amountCents?:number;emv?:string;status?:string};
   if(!res.ok||!data.orderId){setError(data.error||'Falha na criação da cobrança.');return;}
   setOrder(data.orderId);setPix(data.emv||'');setStatus(data.status||'pending');
   setMessage('Pedido criado no ambiente de testes. Nenhuma cobrança de produção será realizada.');
  }catch{setError('Erro de conexão. Tente novamente.');}finally{setBusy(false);}
 }
 async function refreshOrder(){
  if(!orderId)return;setBusy(true);setError('');
  try{
   const r=await fetch('/api/pix/status?id='+encodeURIComponent(orderId),{cache:'no-store'});
   const d=await r.json() as {status?:string;error?:string};
   if(!r.ok){setError(d.error||'Não foi possível consultar o pedido.');return;}
   setStatus(d.status||'desconhecido');
  }catch{setError('Falha de conexão.');}finally{setBusy(false);}
 }
 return <div style={{display:'grid',gap:14}}>
  <label>Cupom de desconto (opcional)
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <input style={{flex:'1 1 170px'}} value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setDiscount(null);}} maxLength={24} placeholder="AERO10"/>
    <button type="button" className="auth-secondary" disabled={busy} onClick={checkCoupon}>Validar</button>
   </div>
  </label>
  {discount!==null&&<p><strong>Valor com cupom: {money(discount)}</strong></p>}
  {!enabled&&<p className="account-note" role="status">Checkout Pix em homologação. A compra real ainda não está liberada; o AeroMind não solicita pagamento nesta etapa. Acompanhe a liberação nesta página ou fale com o suporte.</p>}
  {enabled&&<div style={{display:'grid',gap:12}}>
   <p className="account-note">Ambiente SANDBOX: apenas administradores. Não utilize dados pessoais reais em testes.</p>
   <label>Nome de teste<input value={payerName} onChange={e=>setName(e.target.value)} required minLength={3} maxLength={120} placeholder="Nome do pagador"/></label>
   <label>CPF/CNPJ de teste<input value={document} onChange={e=>setDocument(e.target.value)} required inputMode="numeric" placeholder="Documento fornecido pelo sandbox"/></label>
   <button type="button" className="auth-submit" disabled={busy||payerName.trim().length<3||document.replace(/\D/g,'').length<11||!!orderId} onClick={createPix}>{busy?'Processando...':'Gerar Pix de teste'}</button>
  </div>}
  {message&&<p role="status" style={{color:'#8be6c5'}}>{message}</p>}
  {error&&<p role="alert" style={{color:'#ffb2c2'}}>{error}</p>}
  {orderId&&<div style={{padding:16,border:'1px solid #7357b2',borderRadius:12,overflowWrap:'anywhere'}}>
    <p>Pedido: <code>{orderId}</code> · Situação: <strong>{status}</strong></p>
    {pix?<><label>Pix copia e cola (sandbox)<textarea rows={5} readOnly value={pix}/></label>
      <button type="button" className="auth-secondary" onClick={()=>navigator.clipboard.writeText(pix)}>Copiar código Pix</button></>:<p>O provedor não retornou um código copia e cola. Não efetue pagamentos.</p>}
    <button type="button" className="auth-secondary" disabled={busy} onClick={refreshOrder}>Consultar status</button>
  </div>}
 </div>;
}
