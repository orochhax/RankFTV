# Contrato de resposta para Carlos

## Regra geral

Responder em português claro, começando pelo resultado e usando só o detalhe
necessário. Separar fato observado, inferência e passo ainda não executado.
Nunca afirmar que algo foi aplicado, testado ou publicado sem evidência.

## Ao executar uma tarefa

Quando aplicável, responder nesta ordem:

1. **Resultado:** o que ficou pronto.
2. **Alterações:** arquivos e áreas afetadas, sem despejar o diff.
3. **Validação:** comandos e resultados observados.
4. **Situação externa:** branch, PR, Preview, Production ou migration.
5. **Próximo passo:** uma ação concreta; se depender de Carlos, usar o formato
   abaixo.

## Próximo passo da V1

1. Ler `PENDENCIAS-V1.md`, Git e registros.
2. Informar um próximo passo principal, não uma lista genérica.
3. Explicar por que vem agora e qual evidência o encerra.
4. Separar o que o agente faz sozinho do que exige conta, documento, pagamento
   ou painel de Carlos.

```md
O próximo passo da V1 é: **[ação concreta]**.

Por que agora:
- [evidência curta]

Eu consigo fazer sozinho:
- [ações]

Você precisa fazer:
1. [passo exato]

Consideramos concluído quando:
- [resultado verificável]
```

## Passo a passo manual

Quando Carlos precisar usar Vercel, Supabase, Asaas, GitHub ou outro painel,
informar:

- site e projeto;
- menus e botões;
- nome exato do campo/variável;
- valor literal seguro ou placeholder inequívoco;
- ambiente e branch a marcar;
- ambiente que não deve ser marcado;
- como salvar/republicar;
- como validar;
- qual retorno sanitizado enviar.

```md
Na Vercel, faça assim:

1. Abra `vercel.com` e entre no projeto `rank-ftv`.
2. Vá em `Settings → Environment Variables`.
3. Clique em `Add New` e cadastre:

```env
NOME_DA_VARIAVEL=cole_aqui_o_valor_do_ambiente_correto
```

4. Selecione somente:
   - Environment: `Preview`
   - Branch: `sandbox-homologacao`
5. Não selecione `Production`.
6. Salve e faça o redeploy da branch.

Como validar:
- [resultado esperado]

Depois me envie:
- captura com nome e ambiente, mantendo o valor oculto.
```

Nunca trocar isso por “configure a variável” e nunca pedir print com token,
documento pessoal ou URL privada.

## Análise e bloqueio

- Se o pedido for só analisar, não modificar arquivo, banco, deploy ou serviço.
- Em bloqueio, dizer o que foi verificado, o bloqueio concreto, por que não é
  seguro presumir, o menor passo de Carlos e como retomar.
- Corrigir erros de digitação silenciosamente, preservando a intenção.
- Valores financeiros usam formato brasileiro. Datas operacionais usam
  `America/Sao_Paulo` quando houver risco de confusão.
