// Constantes estruturais do shell desktop — usadas tanto em classes Tailwind
// (valores arbitrários, ex.: `w-[var(--sidebar-w)]`) quanto em cálculos JS
// (larguras/paddings que dependem do estado recolhido/expandido da sidebar).
// As cores/raios/sombras do design system ficam em app/globals.css (@theme),
// não aqui — só o que precisa ser lido em JS mora neste arquivo.

export const SIDEBAR_WIDTH_EXPANDED = 264; // px
export const SIDEBAR_WIDTH_COLLAPSED = 80; // px
export const TOPBAR_HEIGHT = 64; // px

// Largura máxima de conteúdo "denso" (dashboards, grids, tabelas) em
// monitores muito grandes — evita linhas de texto/click-targets absurdamente
// largos em telas 1920px+, sem voltar a travar tudo num tubo estreito.
export const PAGE_MAX_WIDTH_WIDE = 1600; // px
// Formulários e conteúdo de leitura continuam confortáveis, não esticados.
export const PAGE_MAX_WIDTH_FORM = 800; // px
export const PAGE_MAX_WIDTH_PROSE = 720; // px
