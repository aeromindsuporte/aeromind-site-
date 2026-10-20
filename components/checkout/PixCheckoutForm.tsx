'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

type PixReply={error?:string;message?:string;requiresSupport?:boolean;status?:string;orderId?:string;amountCents?:number;emv?:string|null;expiresAt?:string|null;valid?:boolean;discounted_cents?:number};
const money=(v:number)=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const nextPage=(id:string)=>'/ativacao?pedido='+encodeURIComponent(id);

export function PixCheckoutForm({slug,planName,baseCents,mode}:{slug:string;planName:string;baseCents:number;mode:'live'|'sandbox'}){
 const [orderId,setOrderId]=useState('');
 const [payerName,setPayerName]=useState(''),[document,setDocument]=useState('');
 const [coupon,setCoupon]=useState(''),[preview,setPreview]=useState<number|null>(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const [status,setStatus]=useState(''),[emv,setEmv]=useState<string|null>(null);
 const [expiresAt,setExpiresAt]=useState<string|null>(null);
 const [warning,setWarning]=useState(''),[failures,setFailures]=useState(0);
 const [qrUrl,setQrUrl]=useState(''),[qrError,setQrError]=useState(false);
 const [copied,setCopied]=useState(false);
 const [paidAmount,setPaidAmount]=useState<number|null>(null);
 const total=paidAmount??preview??baseCents;

 // O QR é gerado no próprio navegador: o código Pix não é enviado a serviços externos.
 useEffect(()=>{
  let active=true;
  if(!emv||status==='paid'){return;}
  setQrUrl('');setQrError(false);
  QRCode.toDataURL(emv,{width:260,margin:2,errorCorrectionLevel:'M',
   color:{dark:'#12182cff',light:'#ffffffff'}})
   .then(uri=>{if(active)setQrUrl(uri);})
   .catch(()=>{if(active)setQrError(true);});
  return ()=>{active=false;};
 },[emv,status]);

 // Apenas respostas autenticadas do servidor podem mudar a etapa para "pago".
 useEffect(()=>{
  if(!orderId||status==='paid'||status==='failed'||failures>=3)return;
  let active=true;
  const timer=setInterval(async()=>{
   try{
    const response=await fetch('/api/pix/status?pedido='+encodeURIComponent(orderId),{cache:'no-store'});
    if(!response.ok)throw new Error('Status indisponível');
    const data=await response.json() as PixReply;
    if(!active)return;
    setFailures(0);
    setStatus(data.status||'creating');
    if(data.emv)setEmv(data.emv);
    if(data.expiresAt)setExpiresAt(data.expiresAt);
    if(typeof data.amountCents==='number')setPaidAmount(data.amountCents);
    if(data.requiresSupport)setWarning(data.message||'Consulte o suporte antes de iniciar outra cobrança.');
    if(data.status==='paid'){setWarning('');setError('');}
   }catch{if(active)setFailures(n=>n+1);}
  },8000);
  return ()=>{active=false;clearInterval(timer);};
 },[orderId,status,failures]);

 // A tela de sucesso aparece primeiro; depois o cliente segue para acesso e download.
 useEffect(()=>{
  if(status!=='paid'||!orderId)return;
  const timer=setTimeout(()=>window.location.assign(nextPage(orderId)),6500);
  return ()=>clearTimeout(timer);
 },[status,orderId]);

 async function checkCoupon(){
  setError('');setPreview(null);
  if(!coupon.trim())return;
  try{
   const response=await fetch('/api/coupons/preview?plano='+encodeURIComponent(slug)+'&codigo='+encodeURIComponent(coupon.trim()),{cache:'no-store'});
   const data=await response.json() as PixReply;
   if(!response.ok||!data.valid){setError(data.error||'Cupom inválido ou expirado.');return;}
   setPreview(data.discounted_cents??null);
  }catch{setError('Não foi possível consultar o cupom.');}
 }
 async function pay(){
  if(loading||orderId)return;
  setLoading(true);setError('');setWarning('');
  try{
   const response=await fetch('/api/pix/create',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({plan:slug,payerName,document,coupon:coupon.trim()})});
   const data=await response.json() as PixReply;
   if(data.orderId){
    setOrderId(data.orderId);setStatus(data.status||'creating');
    if(data.emv)setEmv(data.emv);
    if(data.expiresAt)setExpiresAt(data.expiresAt);
    if(typeof data.amountCents==='number')setPaidAmount(data.amountCents);
    if(data.message)setWarning(data.message);
    if(data.requiresSupport)setWarning(data.message||'Solicitação pendente de conciliação. Não gere outra cobrança.');
   }
   if(!response.ok){setError(data.error||'Não foi possível preparar o Pix.');return;}
   if(!data.orderId)setError('Não recebemos o número do pedido. Consulte o suporte antes de tentar novamente.');
  }catch{setError('Conexão interrompida. Verifique seu pedido antes de tentar outro Pix.');}
  finally{setLoading(false);}
 }
 async function copyCode(){
  if(!emv)return;
  try{await navigator.clipboard.writeText(emv);setCopied(true);
   setTimeout(()=>setCopied(false),2500);
  }catch{setError('Seu navegador não permitiu copiar. Selecione o código manualmente.');}
 }

 if(status==='paid'&&orderId){
  return <section className="pix-shell" aria-live="polite">
   <div className="pix-success">
    <span className="pix-success-mark" aria-hidden="true">✓</span>
    <span className="pix-state-pill done">✓ Pagamento confirmado</span>
    <h2>Pagamento realizado com sucesso!</h2>
    <p>Seu pagamento foi confirmado pelo AeroMind. Agora você pode acessar sua licença e instalar o aplicativo.</p>
    <div className="pix-success-amount"><span>{planName} · Pagamento aprovado</span><strong>{money(total)}</strong></div>
    <div className="pix-actions">
     <Link className="pix-primary" href={nextPage(orderId)}>Continuar para ativar o aplicativo →</Link>
     <Link className="pix-secondary" href="/minha-conta">Ver minha licença</Link>
    </div>
    <p className="pix-muted">Você será encaminhado automaticamente em alguns segundos. Acesse o AeroMind Monitor com a mesma conta usada na compra.</p>
   </div>
  </section>;
 }

 const hasQr=!!emv&&status!=='failed';
 const isExpired=!!expiresAt&&Date.parse(expiresAt)<=Date.now();
 return <section className="pix-shell">
  <div className="pix-head">
   <div className="pix-symbol" aria-hidden="true">▣</div>
   <div><span className="pix-mini-label">{mode==='live'?'PAGAMENTO SEGURO':'AMBIENTE DE HOMOLOGAÇÃO'}</span>
    <h2>{hasQr?'Escaneie para pagar':orderId?'Estamos preparando seu Pix':'Finalize sua compra com Pix'}</h2>
    <p className="pix-muted">{hasQr?'Use o QR Code ou copie o código para pagar no aplicativo do seu banco.':
     'O acesso é liberado somente após a confirmação do pagamento pelo servidor.'}</p>
   </div>
  </div>

  {!orderId&&<div className="pix-fields">
    <label>Nome completo do pagador<input value={payerName} onChange={e=>setPayerName(e.target.value)}
     autoComplete="name" maxLength={120} placeholder="Nome e sobrenome"/></label>
    <label>CPF ou CNPJ<input value={document} onChange={e=>setDocument(e.target.value)}
     inputMode="numeric" autoComplete="off" maxLength={18} placeholder="Somente números"/></label>
    <div className="pix-coupon-row">
     <label>Cupom de desconto (opcional)<input value={coupon} maxLength={24} placeholder="Digite seu cupom"
      onChange={e=>{setCoupon(e.target.value.toUpperCase());setPreview(null);}}/></label>
     <button type="button" onClick={checkCoupon} disabled={!coupon.trim()}>Aplicar cupom</button>
    </div>
    <div className="pix-total-row"><span>Valor total</span><strong>{money(total)}</strong></div>
    {error&&<div className="pix-feedback" role="alert">{error}</div>}
    {total<200&&<div className="pix-feedback" role="alert">O Pix precisa ter pelo menos R$ 2,00. Ajuste seu cupom ou selecione outro plano.</div>}
    <button className="pix-primary" type="button" disabled={loading||total<200||
      payerName.trim().length<3||![11,14].includes(document.replace(/\D/g,'').length)} onClick={pay}>
      {loading?'Conectando à PaggPay...':'Gerar QR Code Pix →'}
    </button>
    <div className="pix-note"><span aria-hidden="true">🔒</span> Pagamento via PaggPay. Nunca é necessário informar senha bancária nesta página.</div>
  </div>}

  {orderId&&<div className="pix-state-pill waiting" role="status">
   {status==='failed'?'✕ Solicitação recusada':status==='pending'?'◷ Aguardando pagamento':'◷ Verificando a cobrança'}
  </div>}

  {hasQr&&<div className="pix-qr-layout">
    <div className="pix-qr-card">
     {qrUrl?<img alt="QR Code Pix para pagamento" src={qrUrl} width={260} height={260}/>:
      <div className="pix-qr-skeleton">{qrError?'Não foi possível desenhar o QR Code. Utilize o copia e cola.':'Gerando QR Code…'}</div>}
    </div>
    <div className="pix-instructions">
     <h3>{money(total)} por Pix</h3>
     <ol><li>Abra o aplicativo do seu banco.</li><li>Escolha Pix e depois pagar com QR Code.</li><li>Escaneie a imagem e confira o valor.</li></ol>
     {expiresAt&&<span className="pix-expiry">{isExpired?'O Pix pode ter expirado. Consulte a situação do pedido.':
       'Válido até '+new Date(expiresAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</span>}
    </div>
  </div>}
  {hasQr&&<div className="pix-copy-area">
   <span className="pix-mini-label">PIX COPIA E COLA</span>
   <code>{emv}</code>
   <button type="button" className="pix-secondary" onClick={copyCode}>{copied?'✓ Copiado!':'Copiar código Pix'}</button>
  </div>}
  {orderId&&<div className="pix-total-row"><span>Valor do pedido</span><strong>{money(total)}</strong></div>}
  {error&&orderId&&<div className="pix-feedback" role="alert">{error}</div>}
  {warning&&<div className="pix-feedback" role="status">{warning}</div>}
  {orderId&&!hasQr&&status!=='failed'&&<p className="pix-muted">O pedido já foi reservado. Evite emitir outra cobrança enquanto verificamos a confirmação do provedor.</p>}
  {failures>=3&&<div className="pix-feedback">A consulta automática foi interrompida. Abra o acompanhamento do pedido para conferir a situação.</div>}
  {orderId&&<div className="pix-actions">
   <Link className="pix-secondary" href={'/checkout/retorno?pedido='+encodeURIComponent(orderId)}>Consultar situação do pedido →</Link>
   {status==='failed'&&<Link className="pix-secondary" href="/suporte">Falar com o suporte →</Link>}
  </div>}
 </section>;
}
