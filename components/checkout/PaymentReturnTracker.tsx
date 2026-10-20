'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Reply={status?:string;emv?:string;amountCents?:number};
export function PaymentReturnTracker({orderId,initialStatus,amount,planName}:{orderId:string;initialStatus:string;amount:number;planName:string}){
 const [status,setStatus]=useState(initialStatus);
 const [retry,setRetry]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(status==='paid'||status==='failed'||status==='expired'||status==='canceled')return;
  let alive=true;
  async function refresh(){
   try{
    const r=await fetch('/api/pix/status?pedido='+encodeURIComponent(orderId),{cache:'no-store'});
    if(!r.ok)throw new Error('Falha');
    const data=await r.json() as Reply;
    if(alive){setStatus(data.status||'creating');setError('');}
   }catch{if(alive)setError('Não foi possível atualizar automaticamente. Você pode consultar novamente.');}
  }
  if(retry)void refresh();
  const timer=setInterval(()=>void refresh(),8000);
  return ()=>{alive=false;clearInterval(timer);};
 },[orderId,status,retry]);
 useEffect(()=>{
  if(status!=='paid')return;
  const timer=setTimeout(()=>window.location.assign('/ativacao?pedido='+encodeURIComponent(orderId)),6000);
  return ()=>clearTimeout(timer);
 },[status,orderId]);
 const paid=status==='paid';
 return <section className="pix-shell">
  {paid?<div className="pix-success">
   <span className="pix-success-mark" aria-hidden="true">✓</span>
   <span className="pix-state-pill done">✓ Pix confirmado pelo servidor</span>
   <h2>Pagamento realizado!</h2>
   <p>Recebemos o pagamento do seu pedido. Estamos encaminhando você para consultar a licença e instalar o AeroMind Monitor.</p>
   <div className="pix-success-amount"><span>{planName} · Valor pago</span><strong>{(amount/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
   <div className="pix-actions"><Link className="pix-primary" href={'/ativacao?pedido='+orderId}>Continuar para o aplicativo →</Link>
    <Link className="pix-secondary" href="/minha-conta">Abrir minha conta</Link></div>
   <p className="pix-muted">Redirecionamento automático em alguns segundos.</p>
  </div>:
  <div className="pix-success">
   <span className="pix-state-pill waiting">◷ {status==='pending'?'Aguardando pagamento':'Aguardando confirmação'}</span>
   <h2>{status==='failed'?'Esse pedido não foi concluído':'Estamos acompanhando seu Pix'}</h2>
   <p>{status==='failed'?'Confira o histórico ou entre em contato com o suporte. Não envie outro pagamento para a mesma referência.':'O sistema consultará a PaggPay automaticamente. Só liberaremos a licença depois da confirmação no servidor.'}</p>
   <div className="pix-success-amount"><span>{planName} · Valor do pedido</span><strong>{(amount/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>
   {error&&<div className="pix-feedback" role="alert">{error}</div>}
   <div className="pix-actions"><button type="button" className="pix-secondary" onClick={()=>setRetry(x=>!x)}>Atualizar situação</button>
    <Link className="pix-secondary" href="/pagamentos">Meus pagamentos</Link></div>
  </div>}
 </section>;
}
