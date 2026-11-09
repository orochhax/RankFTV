"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
  Search,
  Eye,
  FileText,
  User,
  CreditCard,
  Phone,
  Calendar,
} from "lucide-react";
import {
  type OrganizadorKycItem,
  aprovarOrganizadorKyc,
  rejeitarOrganizadorKyc,
  obterUrlsDocumentosKyc,
} from "@/app/admin/organizadores/actions";
import { MOTIVOS_REJEICAO_PREDEFINIDOS, getStatusVerificacaoBadge } from "@/lib/organizer-kyc";

type FilterTab = "em_analise" | "aprovado" | "rejeitado" | "todos";

export function AdminOrganizadoresManager({
  initialOrganizadores,
}: {
  initialOrganizadores: OrganizadorKycItem[];
}) {
  const [organizadores, setOrganizadores] = useState<OrganizadorKycItem[]>(initialOrganizadores);
  const [selectedTab, setSelectedTab] = useState<FilterTab>("em_analise");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrganizadorKycItem | null>(null);

  // URLs de imagens assinadas do organizador selecionado
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [docUrls, setDocUrls] = useState<{
    frenteSignedUrl?: string | null;
    versoSignedUrl?: string | null;
    selfieSignedUrl?: string | null;
  }>({});

  // Estados de ação (aprovação/rejeição)
  const [actionPending, setActionPending] = useState(false);
  const [rejectingMode, setRejectingMode] = useState(false);
  const [selectedMotivo, setSelectedMotivo] = useState<string>(MOTIVOS_REJEICAO_PREDEFINIDOS[0]);
  const [obsAdicional, setObsAdicional] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Contagens
  const counts = {
    todos: organizadores.length,
    em_analise: organizadores.filter((o) => o.statusVerificacao === "em_analise").length,
    aprovado: organizadores.filter((o) => o.statusVerificacao === "aprovado").length,
    rejeitado: organizadores.filter((o) => o.statusVerificacao === "rejeitado").length,
  };

  // Filtragem
  const filtered = organizadores.filter((o) => {
    if (selectedTab !== "todos" && o.statusVerificacao !== selectedTab) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.nome.toLowerCase().includes(term) ||
      o.username.toLowerCase().includes(term) ||
      (o.nomeCompleto && o.nomeCompleto.toLowerCase().includes(term)) ||
      (o.cpfCnpj && o.cpfCnpj.includes(term)) ||
      (o.chavePix && o.chavePix.toLowerCase().includes(term))
    );
  });

  async function handleOpenOrg(org: OrganizadorKycItem) {
    setSelectedOrg(org);
    setRejectingMode(false);
    setSelectedMotivo(MOTIVOS_REJEICAO_PREDEFINIDOS[0]);
    setObsAdicional("");
    setFeedbackMsg(null);
    setLoadingUrls(true);

    const res = await obterUrlsDocumentosKyc(org.id);
    setLoadingUrls(false);
    if (res.ok) {
      setDocUrls({
        frenteSignedUrl: res.frenteSignedUrl,
        versoSignedUrl: res.versoSignedUrl,
        selfieSignedUrl: res.selfieSignedUrl,
      });
    } else {
      setDocUrls({});
    }
  }

  async function handleAprovar() {
    if (!selectedOrg) return;
    setActionPending(true);
    setFeedbackMsg(null);

    const res = await aprovarOrganizadorKyc(selectedOrg.id);
    setActionPending(false);

    if (res.ok) {
      setOrganizadores((prev) =>
        prev.map((o) =>
          o.id === selectedOrg.id
            ? { ...o, statusVerificacao: "aprovado", motivoRejeicao: null }
            : o
        )
      );
      setSelectedOrg((prev) => (prev ? { ...prev, statusVerificacao: "aprovado", motivoRejeicao: null } : null));
      setFeedbackMsg({ type: "success", text: "Organizador aprovado com sucesso! Publicação liberada." });
    } else {
      setFeedbackMsg({ type: "error", text: res.error ?? "Erro ao aprovar organizador." });
    }
  }

  async function handleConfirmarRejeicao() {
    if (!selectedOrg) return;
    setActionPending(true);
    setFeedbackMsg(null);

    const res = await rejeitarOrganizadorKyc(selectedOrg.id, selectedMotivo, obsAdicional);
    setActionPending(false);

    if (res.ok) {
      const motivoFinal = selectedMotivo === "Outro motivo (especificar)" ? obsAdicional : selectedMotivo;
      setOrganizadores((prev) =>
        prev.map((o) =>
          o.id === selectedOrg.id
            ? { ...o, statusVerificacao: "rejeitado", motivoRejeicao: motivoFinal }
            : o
        )
      );
      setSelectedOrg((prev) => (prev ? { ...prev, statusVerificacao: "rejeitado", motivoRejeicao: motivoFinal } : null));
      setRejectingMode(false);
      setFeedbackMsg({ type: "success", text: "Organizador recusado. O motivo foi registrado para correção." });
    } else {
      setFeedbackMsg({ type: "error", text: res.error ?? "Erro ao rejeitar organizador." });
    }
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => setSelectedTab("em_analise")}
          className={`rounded-2xl p-4 text-left transition-all ring-1 ${
            selectedTab === "em_analise"
              ? "bg-amber-50 ring-amber-400"
              : "bg-white ring-black/5 hover:ring-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Em Análise
            </span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{counts.em_analise}</p>
        </button>

        <button
          onClick={() => setSelectedTab("aprovado")}
          className={`rounded-2xl p-4 text-left transition-all ring-1 ${
            selectedTab === "aprovado"
              ? "bg-emerald-50 ring-emerald-400"
              : "bg-white ring-black/5 hover:ring-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Aprovados
            </span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{counts.aprovado}</p>
        </button>

        <button
          onClick={() => setSelectedTab("rejeitado")}
          className={`rounded-2xl p-4 text-left transition-all ring-1 ${
            selectedTab === "rejeitado"
              ? "bg-rose-50 ring-rose-400"
              : "bg-white ring-black/5 hover:ring-rose-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Rejeitados
            </span>
            <XCircle className="size-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-900">{counts.rejeitado}</p>
        </button>

        <button
          onClick={() => setSelectedTab("todos")}
          className={`rounded-2xl p-4 text-left transition-all ring-1 ${
            selectedTab === "todos"
              ? "bg-blue-50 ring-blue-400"
              : "bg-white ring-black/5 hover:ring-blue-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Todos
            </span>
            <ShieldCheck className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900">{counts.todos}</p>
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, @username, CPF ou chave Pix..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Lista de Organizadores */}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Nenhum organizador encontrado para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((org) => {
              const badge = getStatusVerificacaoBadge(org.statusVerificacao);
              return (
                <div
                  key={org.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {org.nomeCompleto || org.nome}
                      </p>
                      <span className="text-xs text-gray-400">@{org.username}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          badge.variant === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : badge.variant === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : badge.variant === "danger"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>CPF: {org.cpfCnpj || "Não informado"}</span>
                      <span>Tel: {org.telefone || "Não informado"}</span>
                      <span>Pix: {org.chavePix || "Não informada"}</span>
                      {org.submetidoEm && (
                        <span>
                          Enviado em: {new Date(org.submetidoEm).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>

                    {org.statusVerificacao === "rejeitado" && org.motivoRejeicao && (
                      <p className="text-xs text-rose-600">
                        <strong>Motivo da recusa:</strong> {org.motivoRejeicao}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenOrg(org)}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="size-3.5" />
                    Avaliar documentos
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Painel de Detalhes e Aprovação */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedOrg.nomeCompleto || selectedOrg.nome}
                  </h2>
                  <span className="text-sm text-gray-500">(@{selectedOrg.username})</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  ID do organizador: {selectedOrg.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Mensagem de Feedback */}
            {feedbackMsg && (
              <div
                className={`mt-4 rounded-xl p-3 text-sm ${
                  feedbackMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                {feedbackMsg.text}
              </div>
            )}

            {/* Dados Cadastrais */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <User className="size-3" /> CPF / CNPJ
                </span>
                <p className="mt-1 font-semibold text-gray-900">{selectedOrg.cpfCnpj || "—"}</p>
              </div>

              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <Calendar className="size-3" /> Nascimento
                </span>
                <p className="mt-1 font-semibold text-gray-900">{selectedOrg.dataNascimento || "—"}</p>
              </div>

              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <Phone className="size-3" /> Celular
                </span>
                <p className="mt-1 font-semibold text-gray-900">{selectedOrg.telefone || "—"}</p>
              </div>

              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <CreditCard className="size-3" /> Chave Pix
                </span>
                <p className="mt-1 font-semibold text-gray-900">{selectedOrg.chavePix || "—"}</p>
              </div>

              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <FileText className="size-3" /> Documento
                </span>
                <p className="mt-1 font-semibold text-gray-900">
                  {selectedOrg.documentoTipo ? selectedOrg.documentoTipo.toUpperCase() : "RG/CNH"}
                  {selectedOrg.documentoNumero ? ` nº ${selectedOrg.documentoNumero}` : ""}
                </p>
              </div>

              <div>
                <span className="text-gray-400 flex items-center gap-1">
                  <Clock className="size-3" /> Status Atual
                </span>
                <p className="mt-1 font-semibold text-gray-900">
                  {getStatusVerificacaoBadge(selectedOrg.statusVerificacao).label}
                </p>
              </div>
            </div>

            {/* Fotos dos Documentos */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Documentos e Comprovações em Imagem
              </h3>

              {loadingUrls ? (
                <div className="flex items-center justify-center p-8 text-sm text-gray-500">
                  <Loader2 className="mr-2 size-4 animate-spin text-blue-600" />
                  Carregando imagens seguras...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Foto Frente */}
                  <div className="space-y-1.5 rounded-2xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold text-gray-700">1. Frente do Documento</p>
                    {docUrls.frenteSignedUrl ? (
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={docUrls.frenteSignedUrl}
                          alt="Frente do documento"
                          className="h-full w-full object-cover"
                        />
                        <a
                          href={docUrls.frenteSignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black"
                          title="Abrir em tamanho real"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                        Não enviada
                      </div>
                    )}
                  </div>

                  {/* Foto Verso */}
                  <div className="space-y-1.5 rounded-2xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold text-gray-700">2. Verso do Documento</p>
                    {docUrls.versoSignedUrl ? (
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={docUrls.versoSignedUrl}
                          alt="Verso do documento"
                          className="h-full w-full object-cover"
                        />
                        <a
                          href={docUrls.versoSignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black"
                          title="Abrir em tamanho real"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                        Não enviada
                      </div>
                    )}
                  </div>

                  {/* Selfie com Documento */}
                  <div className="space-y-1.5 rounded-2xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold text-gray-700">3. Selfie com Documento</p>
                    {docUrls.selfieSignedUrl ? (
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={docUrls.selfieSignedUrl}
                          alt="Selfie com documento"
                          className="h-full w-full object-cover"
                        />
                        <a
                          href={docUrls.selfieSignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black"
                          title="Abrir em tamanho real"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                        Não enviada
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Painel de Rejeição (quando ativado) */}
            {rejectingMode && (
              <div className="mt-6 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200 space-y-4">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                  <AlertCircle className="size-4" />
                  Selecione o motivo da recusa dos documentos
                </div>

                <div className="space-y-2">
                  {MOTIVOS_REJEICAO_PREDEFINIDOS.map((motivo) => (
                    <label
                      key={motivo}
                      className="flex items-center gap-2.5 text-xs text-gray-800 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="motivo_rejeicao"
                        value={motivo}
                        checked={selectedMotivo === motivo}
                        onChange={() => setSelectedMotivo(motivo)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{motivo}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Instrução adicional para o organizador (opcional ou obrigatório para &quot;Outro motivo&quot;):
                  </label>
                  <textarea
                    rows={2}
                    value={obsAdicional}
                    onChange={(e) => setObsAdicional(e.target.value)}
                    placeholder="Ex: Foto cortou a data de expedição; favor enviar foto nítida e completa."
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingMode(false)}
                    disabled={actionPending}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarRejeicao}
                    disabled={actionPending}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {actionPending && <Loader2 className="size-3.5 animate-spin" />}
                    Confirmar Recusa
                  </button>
                </div>
              </div>
            )}

            {/* Ações do Modal */}
            {!rejectingMode && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedOrg(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Fechar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingMode(true)}
                    disabled={actionPending}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <XCircle className="size-3.5" />
                    Recusar Documentos
                  </button>

                  <button
                    type="button"
                    onClick={handleAprovar}
                    disabled={actionPending || selectedOrg.statusVerificacao === "aprovado"}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actionPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    {selectedOrg.statusVerificacao === "aprovado"
                      ? "Já Aprovado"
                      : "Aprovar Organizador"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
