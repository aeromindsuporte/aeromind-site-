'use client';
import {useState,type ReactNode} from 'react';
export type CustomerTab={id:string,label:string,content:ReactNode};
export function CustomerTabs({tabs}:{tabs:CustomerTab[]}){
 const [current,setCurrent]=useState(tabs[0]?.id||'overview');
 return <div className="cv3-tabs-root">
  <div className="cv3-tabs" role="tablist" aria-label="Detalhes do cliente">
   {tabs.map(t=><button type="button" key={t.id} id={'cv3-tab-'+t.id}
    role="tab" aria-selected={current===t.id} aria-controls={'cv3-panel-'+t.id}
    onClick={()=>setCurrent(t.id)} className={current===t.id?'active':''}>{t.label}</button>)}
  </div>
  {tabs.map(t=><div key={t.id} role="tabpanel" id={'cv3-panel-'+t.id}
   aria-labelledby={'cv3-tab-'+t.id} hidden={current!==t.id}>{t.content}</div>)}
 </div>;
}
