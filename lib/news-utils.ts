export type TamanhoFonte = "P" | "M" | "G";

export type News = {
  id: string;
  titulo: string;
  titulo_story: string | null;
  tamanho_fonte: TamanhoFonte;
  resumo: string;
  conteudo: string;
  imagem_url: string | null;
  created_at: string;
};

// Data formatada pro fuso de Brasília (server roda em UTC na Vercel).
export function formatDataNoticia(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
