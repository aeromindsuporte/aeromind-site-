import {readFile} from 'node:fs/promises';
import path from 'node:path';
// O HTML aprovado é estático; nenhuma entrada de usuário é interpolada nele.
export default async function Home() {
 const content = await readFile(path.join(process.cwd(), 'app', 'landing.html'),'utf8');
 return <><link rel="stylesheet" href="/design-v2.css"/><div dangerouslySetInnerHTML={{__html:content}}/></>;
}
