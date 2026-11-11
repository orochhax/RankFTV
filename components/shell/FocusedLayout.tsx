import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Layout "concentrado" no desktop — login, cadastro, pagamento/Pix, convites, termos.
// Mantém no topo logo + botão explícito de retorno à Home (e reserva espaço
// para a BottomNav no mobile onde ela fica visível).
export function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface pb-28 md:pb-0">
      <header className="flex h-12 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
        <Link href="/" className="text-sm font-bold tracking-tight text-ink">
          Rank<span className="text-brand">FTV</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-brand-border hover:bg-brand-soft hover:text-brand-ink"
        >
          <ArrowLeft className="size-3.5" />
          Voltar ao início
        </Link>
      </header>
      {children}
    </div>
  );
}
