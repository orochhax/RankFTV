// Container compartilhado das páginas do app. Dashboards e listagens usam
// toda a largura disponível; somente formulários e prosa mantêm uma medida
// confortável de leitura.
const MAX_WIDTH: Record<NonNullable<PageContainerProps["width"]>, string> = {
  wide: "max-w-none",
  form: "max-w-[800px]",
  prose: "max-w-[720px]",
};

type PageContainerProps = {
  width?: "wide" | "form" | "prose";
  className?: string;
  children: React.ReactNode;
};

export function PageContainer({ width = "wide", className = "", children }: PageContainerProps) {
  // Gutter consistente no mobile/tablet e um pouco mais folgado no desktop.
  return (
    <div className={`mx-auto w-full px-6 lg:px-8 ${MAX_WIDTH[width]} ${className}`}>
      {children}
    </div>
  );
}
