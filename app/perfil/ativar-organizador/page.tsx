import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AtivarOrganizadorForm } from "@/components/perfil/AtivarOrganizadorForm";

export default async function AtivarOrganizadorPage({
  searchParams,
}: {
  searchParams?: Promise<{ champId?: string; next?: string; status?: string }>;
}) {
  const params = await searchParams;
  const champId = params?.champId;
  const next = params?.next || (champId ? `/painel/campeonatos/${champId}/publicar` : "/painel");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/perfil/ativar-organizador")}`);

  const { data: conta } = await supabase
    .from("organizer_accounts")
    .select("habilitado, status_verificacao, motivo_rejeicao, nome_completo, cpf_cnpj, data_nascimento, telefone, chave_pix, documento_tipo, documento_numero, documento_frente_url, documento_verso_url, selfie_url, submetido_em")
    .eq("user_id", user.id)
    .maybeSingle();

  // Se já está aprovado pelo CEO, redireciona para o destino
  if (conta?.habilitado && conta?.status_verificacao === "aprovado") {
    redirect(next);
  }

  const isEmAnalise = conta?.status_verificacao === "em_analise";
  const isRejeitado = conta?.status_verificacao === "rejeitado";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 px-6 py-8">
      <Link
        href={champId ? `/painel/campeonatos/${champId}` : "/painel"}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> {champId ? "Voltar ao campeonato" : "Voltar ao painel"}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Verificação de Identidade do Organizador
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Para garantir a segurança financeira das inscrições e a integridade dos torneios, validamos os dados e documentos oficiais de todos os organizadores antes da publicação de eventos pagos.
        </p>
      </div>

      {/* Cartão Informativo de Status Em Análise */}
      {isEmAnalise && (
        <div className="rounded-3xl bg-amber-50 p-6 ring-1 ring-amber-200 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-900 font-semibold text-base">
            <Clock className="size-5 text-amber-600" />
            Documentos em análise pela equipe RankFTV
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">
            Seus dados e fotos foram recebidos com sucesso. Nossa equipe realiza a conferência cadastral em até <strong>24 horas úteis</strong>.
          </p>
          <p className="text-xs text-amber-700">
            Enviado em: {conta?.submetido_em ? new Date(conta.submetido_em).toLocaleString("pt-BR") : "Recentemente"}
          </p>
          <div className="pt-2">
            <Link
              href={champId ? `/painel/campeonatos/${champId}` : "/painel"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Ir para o painel <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Cartão de Aviso em Caso de Rejeição */}
      {isRejeitado && (
        <div className="rounded-3xl bg-rose-50 p-6 ring-1 ring-rose-200 space-y-3">
          <div className="flex items-center gap-2.5 text-rose-900 font-semibold text-base">
            <AlertCircle className="size-5 text-rose-600" />
            Pendência na validação dos documentos
          </div>
          <p className="text-sm text-rose-800 leading-relaxed">
            Houve uma pendência na conferência dos documentos enviados:
          </p>
          <div className="rounded-xl bg-white/80 p-3 text-xs font-medium text-rose-900 border border-rose-200">
            &ldquo;{conta?.motivo_rejeicao || "Por favor, reenvie fotos mais nítidas do seu documento e selfie."}&rdquo;
          </div>
          <p className="text-xs text-rose-700">
            Você pode corrigir os dados ou reenviar novas fotos no formulário abaixo:
          </p>
        </div>
      )}

      {/* Formulário (exibido se não estiver em análise ou se tiver sido rejeitado para correção) */}
      {(!isEmAnalise || isRejeitado) && (
        <AtivarOrganizadorForm initialData={conta} nextUrl={next} />
      )}
    </div>
  );
}
