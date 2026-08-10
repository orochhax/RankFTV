# Agenda, hábitos e estudos — Performance

## Migration

Depois das migrations existentes de `performance-life-os`, `performance-study-modules` e `performance-study-reference-standard`, execute manualmente:

1. `supabase/performance-scheduling-study-progress.sql`
2. Recarregue `/admin/performance`.

A migration é aditiva e idempotente. Ela cria o histórico de agenda dos hábitos, o progresso dos checklists com RLS, os gatilhos atômicos de conclusão e as validações de recorrência. O código mostra um aviso explícito quando a tabela de progresso ainda não existe.

## Regras de negócio

- Agenda: a linha salva em `perf_event` é a série canônica. As ocorrências são calculadas somente para a janela exibida, no fuso `America/Bahia`; editar ou excluir uma ocorrência edita/exclui a série inteira e a interface deixa isso explícito.
- Hábitos: `daily`, `weekdays`, `weekends` e `custom_weekdays` usam os números `0=domingo ... 6=sábado`. Dias não planejados são folga: não entram no denominador e não quebram sequência. Alterações futuras não reescrevem períodos antigos.
- Estudos: a aula conclui automaticamente somente quando todos os itens de Preparação e Critérios objetivos estão marcados e todas as perguntas atuais aparecem juntas em uma tentativa válida. A nota é apenas indicador de domínio; respostas erradas contam como respondidas.
- Tentativas: “Tentar novamente” inicia uma edição local nova, sem excluir as tentativas anteriores e sem revogar uma conclusão válida.
- Compatibilidade: etapas já concluídas antes da migration são preservadas e recebem backfill dos checks. Etapas antigas sem gates continuam com conclusão manual.
- Vídeos: roadmap novo não pode ser aceito com `type=video` sem URL. Material audiovisual sem link externo é reclassificado como `audiovisual`. Dados legados `video` sem URL mostram alerta e continuam acessíveis para correção.
- Pastas: cada card deriva o destino da mesma ordem de módulos usada pelo guia. O dispositivo escolhido é salvo em `localStorage` por roadmap e atualiza todos os cards.

## Auditoria de videoaulas legadas

O repositório não contém os dados do roadmap de inglês, que ficam no Supabase. Depois de aplicar a migration, rode a consulta abaixo no SQL Editor para localizar os cards que precisam de link ou reclassificação:

```sql
select id, roadmap_id, module_id, title, resource_url
from perf_study_roadmap_item
where item_kind = 'video'
  and nullif(btrim(resource_url), '') is null
order by roadmap_id, order_index;
```

Não invente URLs no reparo: cadastre uma página HTTPS direta e confiável ou altere `item_kind` para `audiovisual` com instruções exatas de acesso.
