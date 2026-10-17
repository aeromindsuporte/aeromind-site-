import Link from 'next/link';
import type { ReactNode } from 'react';

const benefits = [
  { icon: '⬡', title: 'Licença e status da conta', description: 'Consulte o seu plano, a validade e o acesso autorizado.', style: 'green' },
  { icon: '⇩', title: 'Download do aplicativo', description: 'Distribuição protegida após a ativação de sua licença.', style: 'pink' },
  { icon: '♧', title: 'Suporte e gerenciamento', description: 'Tenha os recursos da sua conta em um único lugar.', style: 'blue' }
];

export function AuthShell({ title, intro, children }: { title: ReactNode; intro: string; children: ReactNode }) {
  return <div className="auth-root">
    <div className="auth-backdrop" aria-hidden="true"><div className="auth-mountain auth-mountain-one" /><div className="auth-mountain auth-mountain-two" /><div className="auth-mountain auth-mountain-three" /></div>
    <header className="auth-header">
      <div className="auth-container auth-nav">
        <Link href="/" className="auth-logo"><img src="/images/aeromind-mark.svg" alt="" width="42" height="42" /> AeroMind</Link>
        <nav aria-label="Navegação"><Link href="/">Início</Link><Link href="/#funcionalidades">Funcionalidades</Link><Link href="/#planos">Planos</Link><Link href="/#contato">Contato</Link></nav>
        <div className="auth-header-actions"><Link href="/entrar" className="auth-ghost-btn">Entrar</Link><Link href="/cadastro" className="auth-main-btn">Criar conta ↗</Link></div>
      </div>
    </header>
    <main className="auth-container auth-main">
      <section className="auth-presentation">
        <span className="auth-eyebrow">♙ ÁREA DE LOGIN</span>
        <h1>{title}</h1>
        <p className="auth-intro">{intro}</p>
        <div className="auth-benefits">
          {benefits.map(b => <div className={'auth-benefit auth-'+b.style} key={b.title}><span className="auth-benefit-icon">{b.icon}</span><div><strong>{b.title}</strong><p>{b.description}</p></div></div>)}
        </div>
      </section>
      <aside className="auth-illustration" aria-label="Exemplo da futura área do cliente">
        <div className="auth-preview"><div className="auth-preview-title">◉ Minha licença <small>PRÉVIA VISUAL</small></div><div className="auth-preview-plan"><b>✦ AeroMind</b><span>Licença: não ativada</span></div><div className="auth-preview-line">Plano <span>A definir</span></div><div className="auth-preview-line">Dispositivos <span>Nenhum</span></div><div className="auth-preview-line">Download <span>Protegido</span></div><div className="auth-preview-footer">Exemplo de interface, sem dados reais</div></div>
      </aside>
      <section className="auth-panel" aria-label="Formulário de acesso">
        <div className="auth-panel-brand"><img src="/images/aeromind-mark.svg" width="44" height="44" alt="" /><strong>AeroMind</strong></div>
        <p className="auth-slogan">Mais inteligência. Mais organização. Mais controle.</p>
        {children}
        <div className="auth-assurances"><span>◇ Ambiente seguro</span><span>♜ Licença validada</span><span>⇩ Download protegido</span></div>
        <p className="auth-help">Precisa de ajuda? <a href="mailto:aeromindsuporte@gmail.com">Fale com o suporte →</a></p>
      </section>
    </main>
    <footer className="auth-container auth-footer"><Link href="/">← Voltar ao AeroMind</Link><span>© AeroMind • Acesso seguro</span></footer>
  </div>;
}
