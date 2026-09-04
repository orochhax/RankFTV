# Decisão de permissões administrativas

Data: 04/09/2026

## Decisão atual

Enquanto a operação tiver somente o CEO, os painéis que permitem consultar ou
alterar ingressos, identidade de atletas, suporte, reembolsos, alertas e métricas
operacionais continuam exclusivos do papel `ceo`. Não será criada agora uma
matriz de permissões que aumentaria a superfície de configuração sem existir
uma equipe para usá-la.

As rotas sensíveis devem validar o papel no servidor, independentemente de o
link aparecer ou não no menu. Controles apenas visuais não são autorização.

## Quando reavaliar

Reabrir esta decisão antes de dar acesso administrativo a uma segunda pessoa.
Nessa ocasião, separar pelo menos estas capacidades:

| Capacidade | Escopo mínimo sugerido |
|---|---|
| Check-in | Ler ingresso e confirmar entrada no campeonato atribuído |
| Placar | Ler partidas e registrar placar nas quadras atribuídas |
| Inscrições | Consultar e ajustar inscrições do próprio campeonato |
| Suporte | Consultar casos atribuídos, sem acesso financeiro amplo |
| Financeiro | Consultar vendas, reembolsos e repasses do organizador |
| CEO | Configuração global, auditoria, identidade e operações críticas |

## Condições para liberar

1. permissões negadas por padrão e verificadas no servidor;
2. escopo por campeonato ou organização, nunca somente por item de menu;
3. auditoria com ator, ação, alvo e horário;
4. teste automatizado de acesso permitido e negado para cada capacidade;
5. procedimento de revogação imediata e revisão periódica dos acessos.
