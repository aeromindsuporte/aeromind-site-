import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'AeroMind | Monitor inteligente para o Aviator',
 description: 'AeroMind Monitor: acompanhamento, histórico, indicadores B4 e análise Rosa V4. Dados para análise, sem garantia de resultados.',
 robots: { index: true, follow: true }
};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="pt-BR"><body>{children}</body></html>;
}
