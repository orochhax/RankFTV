import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade — RankFTV",
};

const ULTIMA_ATUALIZACAO = "20 de julho de 2026";

type Bloco = { p: string } | { ul: string[] };
type Secao = { titulo: string; blocos: Bloco[] };

// Complementa a seção "Privacidade e proteção de dados" de app/termos/page.tsx
// com mais detalhe (LGPD, Lei 13.709/2018) — finalidade, compartilhamento,
// retenção, direitos do titular e como exercê-los na própria plataforma
// (exportar/excluir conta: ver /perfil/conta). Só descreve o que o código
// realmente faz — nada de afirmação jurídica que o produto não cumpre ainda
// (ver AUDITORIA-PRODUCAO.md pras pendências reais de produção).
const SECOES: Secao[] = [
  {
    titulo: "Quem trata seus dados",
    blocos: [
      { p: "Esta Política de Privacidade é mantida pela RankFTV [PENDENTE: mesma identificação empresarial usada nos Termos de Uso — razão social/CNPJ e canal de contato oficial] e se aplica a todo o uso da plataforma RankFTV." },
    ],
  },
  {
    titulo: "Dados que coletamos",
    blocos: [
      {
        ul: [
          "Cadastro: nome, e-mail, senha (armazenada com hash, nunca em texto puro), @usuário e, quando aplicável, gênero, foto, cidade/estado.",
          "Dados privados, guardados separados do perfil público: CPF/CNPJ, telefone, data de nascimento e as respostas do questionário de nível.",
          "Inscrições, duplas, ingressos e credenciais de campeonatos, e vínculos de aluno/plano em arenas.",
          "Dados financeiros: chave Pix (organizador/arena) e dados enviados diretamente ao processador de pagamentos (Asaas) para cobrança — número de cartão e CVV nunca ficam salvos no banco da RankFTV.",
          "Dados técnicos de uso e acesso (endereço IP, quando necessário para segurança e prevenção de abuso — ver rate limit).",
        ],
      },
    ],
  },
  {
    titulo: "Para que usamos",
    blocos: [
      {
        ul: [
          "Criar e manter sua conta e perfil público.",
          "Processar inscrições, ingressos, credenciamento, aulas e assinaturas de arena.",
          "Processar pagamentos e repasses através do processador de pagamentos parceiro.",
          "Prevenir fraude e abuso (rate limit, auditoria de mudanças sensíveis como chave Pix e gênero pós-uso).",
          "Cumprir obrigação legal, quando aplicável (ex.: retenção de registro financeiro).",
          "Comunicar sobre o campeonato/arena em que você está inscrito ou matriculado.",
        ],
      },
    ],
  },
  {
    titulo: "Com quem compartilhamos",
    blocos: [
      {
        ul: [
          "Supabase — banco de dados, autenticação e armazenamento de arquivo da plataforma.",
          "Asaas — processamento de pagamento, cobrança e repasse via Pix/cartão.",
          "Resend — envio dos e-mails transacionais (confirmação, convite, comunicado, código de recuperação de ingresso).",
          "O organizador do campeonato ou dono da arena em que você se inscreveu/matriculou, limitado ao necessário pra realizar o evento/gerir a turma.",
          "Autoridade pública, quando exigido por lei ou ordem judicial.",
        ],
      },
      { p: "Não vendemos dado pessoal a terceiros." },
    ],
  },
  {
    titulo: "Por quanto tempo guardamos",
    blocos: [
      { p: "Mantemos os dados enquanto sua conta existir e pelo tempo adicional necessário para cumprir obrigação legal — em especial registro de transação financeira, que a legislação fiscal/contábil exige manter por um período mesmo depois de uma solicitação de exclusão de conta. Dados de questionário, presença e histórico de rating ficam vinculados ao seu histórico competitivo enquanto a conta existir." },
    ],
  },
  {
    titulo: "Seus direitos e como exercê-los",
    blocos: [
      { p: "Nos termos da LGPD (Lei nº 13.709/2018), você pode pedir confirmação de tratamento, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados." },
      {
        ul: [
          "Exportar meus dados: disponível em /perfil/conta — gera um arquivo com os principais dados vinculados à sua conta.",
          "Solicitar exclusão da conta: disponível em /perfil/conta — abre um pedido de exclusão; registros financeiros que a lei exige manter continuam guardados de forma restrita mesmo após a exclusão do restante da conta.",
          "Visibilidade do perfil: em /perfil/editar você controla quais dados do seu perfil aparecem publicamente.",
        ],
      },
    ],
  },
  {
    titulo: "Segurança",
    blocos: [
      { p: "Adotamos controle de acesso por permissão (RLS no banco), autenticação obrigatória pra dado sensível, registro de auditoria pra mudança de chave Pix/gênero/campo financeiro, e não guardamos número de cartão nem CVV — só o token de cobrança do processador de pagamentos. Nenhuma medida de segurança é infalível; se identificarmos um incidente que afete seus dados, vamos te avisar pelos canais oficiais." },
    ],
  },
  {
    titulo: "Contato",
    blocos: [
      { p: "Dúvida sobre esta política ou sobre seus dados: [PENDENTE: canal de contato oficial — e-mail de privacidade/DPO, se houver]." },
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-app-bg">
      <div className="bg-black px-6 pb-16 pt-8">
        <div className="mx-auto max-w-3xl space-y-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80">
            <ArrowLeft className="size-4" /> Início
          </Link>
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">RankFTV</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Política de Privacidade</h1>
          <p className="text-sm text-white/50">Última atualização: {ULTIMA_ATUALIZACAO}</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-3 px-6">
          {SECOES.map((secao) => (
            <details key={secao.titulo} className="group rounded-2xl bg-white ring-1 ring-black/5" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold text-gray-900">{secao.titulo}</span>
                <ChevronDown className="size-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-gray-600">
                {secao.blocos.map((bloco, i) =>
                  "p" in bloco ? (
                    <p key={i}>{bloco.p}</p>
                  ) : (
                    <ul key={i} className="list-disc space-y-1.5 pl-5">
                      {bloco.ul.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  ),
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
