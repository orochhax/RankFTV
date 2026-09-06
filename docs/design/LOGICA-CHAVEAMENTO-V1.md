# Lógica do chaveamento — RankFTV V1

## Responsabilidade do organizador

O organizador informa as duplas, escolhe quais participam do sorteio e lança os pontos de cada set. O sistema sorteia os confrontos, calcula o vencedor, avança ou rebaixa a dupla e define a quadra.

## Configuração de quadras

Cada campeonato informa:

- quantidade total de quadras;
- número da quadra principal.

Distribuição automática:

1. Com uma quadra, todas as partidas usam a Quadra 1.
2. Fases iniciais da chave principal alternam entre todas as quadras.
3. Semifinais usam a quadra principal.
4. A final usa sempre a quadra principal escolhida.
5. Terceiro lugar e partidas da repescagem usam primeiro as quadras secundárias.
6. Se não houver quadra secundária, essas partidas voltam para a quadra principal.

A quadra é persistida na partida. Assim, painel do organizador, staff, página pública e tela ao vivo mostram a mesma informação.

Depois da distribuição automática, o organizador pode abrir qualquer jogo e trocar manualmente sua quadra por outra cadastrada no campeonato. A alteração fica persistida e é refletida em todas as visualizações. Salvar novamente a configuração geral das quadras ou gerar um novo sorteio refaz a distribuição automática.

## Formato 1 — eliminatória simples

- uma derrota elimina a dupla;
- vencedores das semifinais avançam para a final;
- perdedores das semifinais disputam o terceiro lugar;
- o pódio vem da final e da disputa de terceiro lugar.

## Formato 2 — dupla eliminação (repescagem recomendada)

- uma dupla só é eliminada após a segunda derrota;
- a primeira derrota na chave principal envia a dupla para a chave de perdedores;
- a chave principal classifica duas duplas e a repescagem classifica outras duas;
- as duas classificadas da repescagem voltam para a chave principal nas semifinais, em cruzamento com as duas classificadas superiores;
- os vencedores das semifinais disputam a única final do campeonato;
- os perdedores das semifinais fazem uma partida separada pelo terceiro lugar;
- não existe grande final externa nem final de reset neste formato.

O formato é escolhido antes do sorteio e não pode ser alterado depois que houver resultado lançado.

## Numeração e resultado

- jogos da chave principal recebem numeração sequencial por fase;
- jogos da repescagem continuam a sequência, sem reutilizar números;
- cada card exibe número, quadra, sets e pontos por set;
- o vencedor é calculado pelo placar e recebe destaque azul;
- o bloco Resultado final é atualizado automaticamente e só deixa de mostrar “A definir” quando os jogos necessários terminarem.

## Próxima evolução operacional

Para também calcular horário automaticamente, o motor precisará considerar duração média, intervalo entre jogos, descanso mínimo da dupla e confrontos de todas as categorias. Somente atribuir quadras sem considerar essas dependências não evita conflitos de agenda.
