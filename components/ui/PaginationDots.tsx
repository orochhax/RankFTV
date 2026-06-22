import Link from "next/link";

// Bolinhas de paginação. A ativa fica azul; as outras são links pra ?page=N.
export function PaginationDots({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;
  const paginas = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2.5">
      {paginas.map((p) => (
        <Link
          key={p}
          href={p === 1 ? basePath : `${basePath}?page=${p}`}
          aria-label={`Página ${p}`}
          aria-current={p === page ? "page" : undefined}
          className={`size-2.5 rounded-full transition-colors ${
            p === page ? "bg-blue-600" : "bg-gray-300 hover:bg-gray-400"
          }`}
        />
      ))}
    </div>
  );
}
