// Fonte ÚNICA da verdade para as imagens de banner.
//
// Tudo que mostra um campeonato — os cards da Home, os cards de "Campeonatos
// Abertos" e as páginas/séries — lê daqui pela MESMA chave (o `id`). Trocou a
// foto aqui, troca em TODOS os lugares de uma vez.
//
// As imagens ficam em /public/banners/. Para adicionar ou trocar uma foto:
//   1. salve o arquivo em /public/banners/
//   2. aponte o id do campeonato/série para ele aqui embaixo
//
// Quem não tiver foto aqui cai no gradiente colorido (fallback) automaticamente.
export const BANNERS: Record<string, string> = {
  "copa-litoral-ftv": "/banners/copa-litoral.jpg",
  "floripa-beach-cup": "/banners/floripa-beach-cup.jpg",
};

export function getBannerUrl(id: string): string | undefined {
  return BANNERS[id];
}
