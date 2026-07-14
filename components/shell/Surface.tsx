// Card padrão do design system: superfície branca, borda discreta, sombra
// leve, cantos entre 16–24px. Usado em qualquer bloco "flutuando" sobre o
// fundo cinza-azulado do app (stat, lista, painel, formulário).
export function Surface({
  as: As = "div",
  padding = "md",
  rounded = "lg",
  className = "",
  children,
  ...rest
}: {
  as?: "div" | "section" | "article";
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "md" | "lg";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const paddingCls = {
    none: "",
    sm:   "p-4",
    md:   "p-5",
    lg:   "p-6",
  }[padding];
  const roundedCls = rounded === "lg" ? "rounded-card-lg" : "rounded-card";

  return (
    <As
      className={`bg-surface ring-1 ring-border shadow-soft ${roundedCls} ${paddingCls} ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}
