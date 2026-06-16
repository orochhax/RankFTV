// Aviso fixo enquanto o site não tem login/dados reais (Supabase entra depois —
// ver ftv.md seção 8.2). Sem isso, alguém podia achar que os campeonatos,
// atletas e o "usuário logado" são reais.
export function DemoBanner() {
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      🚧 Protótipo visual — campeonatos, atletas, rankings e o usuário &quot;logado&quot; são todos fictícios.
    </div>
  );
}
