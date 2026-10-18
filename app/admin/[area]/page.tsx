import { notFound } from 'next/navigation';
import Admin from '../page';
const allowed=['clientes','licencas','planos','dispositivos','releases','downloads','cupons','pagamentos','relatorios'];
export default async function AdminArea({params,searchParams}:{params:Promise<{area:string}>,searchParams:Promise<{msg?:string}>}){
 const {area}=await params;
 if(!allowed.includes(area))notFound();
 return <Admin searchParams={searchParams} activeSection={area}/>;
}
