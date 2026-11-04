export type NoveltySource = { title: string; published_at: string | null };

export type IdeaNovelty = {
  isSpecificLaunch: boolean;
  date: string | null;
  sourceTitle: string | null;
  label: string;
};

const launchSignals = /lançamento|lançou|lancamento|release|released|estreia|disponível|disponivel|modelo|versão|versao|atualização|atualizacao|duet|cloud|agent|agente/i;

export function getIdeaNovelty(idea: { title: string; summary: string; angle: string; hook: string }, sources: NoveltySource[]): IdeaNovelty {
  const content = [idea.title, idea.summary, idea.angle, idea.hook].join(" ");
  const isSpecificLaunch = launchSignals.test(content);
  if (!isSpecificLaunch) {
    return { isSpecificLaunch: false, date: null, sourceTitle: null, label: "Esta ideia não é relacionada a nenhum lançamento específico." };
  }

  const source = [...sources]
    .filter((item) => item.published_at && Number.isFinite(Date.parse(item.published_at)))
    .sort((a, b) => Date.parse(b.published_at as string) - Date.parse(a.published_at as string))[0];
  if (!source) {
    return { isSpecificLaunch: true, date: null, sourceTitle: null, label: "A pauta se relaciona a um lançamento ou novidade, mas a fonte não informa a data." };
  }
  return { isSpecificLaunch: true, date: source.published_at, sourceTitle: source.title, label: "Data observada da novidade na fonte relacionada" };
}
