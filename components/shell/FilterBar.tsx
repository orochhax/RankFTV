// Barra horizontal de filtros — busca + selects/chips lado a lado no
// desktop, empilhando no mobile. Componente puramente de layout: a lógica de
// cada filtro continua onde já estava (cada página/seção decide os campos).
export function FilterBar({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      {children}
    </div>
  );
}
