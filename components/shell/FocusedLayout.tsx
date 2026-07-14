// Layout "concentrado" — login, cadastro, pagamento/Pix, convites, termos.
// Só remove a sidebar/topbar/bottom nav do shell global; cada página mantém
// seu próprio cabeçalho/fundo (várias já têm uma faixa escura própria com
// voltar + contexto, adicionar um segundo cabeçalho aqui duplicaria a
// navegação). Deixa o conteúdo cobrir a tela inteira, sem faixas laterais
// vazias.
export function FocusedLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface">{children}</div>;
}
