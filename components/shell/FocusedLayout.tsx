import Link from "next/link";

// Layout "concentrado" — login, cadastro, pagamento/Pix, convites, termos.
// Sem a navegação desktop/mobile do shell global, mas com uma faixa mínima
// com a logo (link pra Home) — sem ela essas páginas ficavam sem NENHUMA
// forma de navegação de volta pro site (a BottomNav também some aqui).
// Cada página mantém seu próprio cabeçalho/fundo abaixo dessa faixa.
export function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="flex h-12 items-center border-b border-border px-6">
        <Link href="/" className="text-sm font-bold tracking-tight text-ink">
          Rank<span className="text-blue-600">FTV</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
