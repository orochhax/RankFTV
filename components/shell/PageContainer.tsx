// Container de largura consistente pra páginas "de app" (fora do fluxo
// hero-escuro/sheet-arredondado que várias páginas legadas ainda usam).
// `wide` é pra dashboards/listagens/grids — usa a tela toda até um teto
// generoso. `form`/`prose` mantêm leitura confortável.
const MAX_WIDTH: Record<NonNullable<PageContainerProps["width"]>, string> = {
  wide:  "max-w-[1600px]",
  form:  "max-w-[800px]",
  prose: "max-w-[720px]",
};

type PageContainerProps = {
  width?: "wide" | "form" | "prose";
  className?: string;
  children: React.ReactNode;
};

export function PageContainer({ width = "wide", className = "", children }: PageContainerProps) {
  // px-6 no mobile/tablet mantém o gutter já usado no resto do site
  // (dark headers, sheets arredondadas); só cresce em telas grandes.
  return (
    <div className={`mx-auto w-full px-6 lg:px-8 ${MAX_WIDTH[width]} ${className}`}>
      {children}
    </div>
  );
}
