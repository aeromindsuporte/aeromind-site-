'use client';
import {useState} from 'react';
export function CampaignCopyButton({content}:{content:string}){
 const [notice,setNotice]=useState('');
 async function copy(){
  try{
   await navigator.clipboard.writeText(content);
   setNotice('Texto copiado');
  }catch{setNotice('Não foi possível copiar automaticamente. Selecione o texto acima.')}
 }
 return <div className="mc-copy-wrap"><button type="button" className="mc-secondary" onClick={copy}>Copiar mensagem de divulgação</button><span role="status">{notice}</span></div>;
}
