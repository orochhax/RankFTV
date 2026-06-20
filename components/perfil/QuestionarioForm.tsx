"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { salvarQuestionario } from "@/app/perfil/questionario/actions";

const PERGUNTAS = [
  {
    name: "tempo",
    label: "Há quanto tempo você joga futevôlei?",
    opcoes: [
      { valor: "menos_1", texto: "Menos de 1 ano" },
      { valor: "1_3",     texto: "1 a 3 anos" },
      { valor: "3_6",     texto: "3 a 6 anos" },
      { valor: "mais_6",  texto: "Mais de 6 anos" },
    ],
  },
  {
    name: "nivel",
    label: "Como você costuma jogar?",
    opcoes: [
      { valor: "recreativo",  texto: "Só recreativo (praia com amigos)" },
      { valor: "amador",      texto: "Amador (campeonatos locais/municipais)" },
      { valor: "competitivo", texto: "Competitivo (campeonatos estaduais)" },
      { valor: "alto_nivel",  texto: "Alto nível (regionais/nacionais)" },
    ],
  },
  {
    name: "frequencia",
    label: "Com que frequência você treina?",
    opcoes: [
      { valor: "1x",      texto: "1x por semana ou menos" },
      { valor: "2_3x",    texto: "2 a 3x por semana" },
      { valor: "4_5x",    texto: "4 a 5x por semana" },
      { valor: "todo_dia",texto: "Todo dia" },
    ],
  },
  {
    name: "melhor_resultado",
    label: "Qual foi seu melhor resultado em campeonato?",
    opcoes: [
      { valor: "nunca",     texto: "Nunca participei" },
      { valor: "sem_podio", texto: "Participei mas sem pódio" },
      { valor: "top4",      texto: "Fiz top 4 (semifinal)" },
      { valor: "campeao",   texto: "Fui campeão ou vice" },
    ],
  },
  {
    name: "categoria_usual",
    label: "Em qual categoria você normalmente compete?",
    opcoes: [
      { valor: "nunca",   texto: "Nunca competí em campeonato" },
      { valor: "D",       texto: "Categoria D (iniciante)" },
      { valor: "C",       texto: "Categoria C" },
      { valor: "B",       texto: "Categoria B" },
      { valor: "A_elite", texto: "Categoria A ou Elite" },
    ],
  },
] as const;

const initialState = { error: undefined as string | undefined };

export function QuestionarioForm() {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await salvarQuestionario(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={action} className="space-y-8">
      {/* Gênero — define em quais categorias o atleta pode jogar */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-800">
          <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            ♦
          </span>
          Qual é o seu gênero?
        </legend>
        <p className="text-xs text-gray-500">
          Usamos isso para indicar as categorias certas (masculina, feminina ou
          mista) e avisar quando um campeonato não tem categoria para você.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { valor: "masculino", texto: "Masculino" },
            { valor: "feminino",  texto: "Feminino" },
          ].map((opcao) => (
            <label
              key={opcao.valor}
              className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 hover:bg-gray-50"
            >
              <input
                type="radio"
                name="genero"
                value={opcao.valor}
                required
                className="accent-blue-600"
              />
              {opcao.texto}
            </label>
          ))}
        </div>
      </fieldset>

      {PERGUNTAS.map((pergunta, idx) => (
        <fieldset key={pergunta.name} className="space-y-3">
          <legend className="text-sm font-semibold text-gray-800">
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {idx + 1}
            </span>
            {pergunta.label}
          </legend>
          <div className="space-y-2">
            {pergunta.opcoes.map((opcao) => (
              <label
                key={opcao.valor}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name={pergunta.name}
                  value={opcao.valor}
                  required
                  className="accent-blue-600"
                />
                {opcao.texto}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Salvando..." : "Salvar e ver meu perfil"}
      </button>
    </form>
  );
}
