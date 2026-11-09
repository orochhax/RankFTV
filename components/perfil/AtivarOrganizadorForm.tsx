"use client";

import { useActionState, useState } from "react";
import { Loader2, Upload, FileCheck, ShieldCheck } from "lucide-react";
import { ativarOrganizador } from "@/app/perfil/ativar-organizador/actions";

type FormState = { error?: string; ok?: boolean };
const initialState: FormState = {};

type FormInitialData = {
  nome_completo?: string | null;
  cpf_cnpj?: string | null;
  data_nascimento?: string | null;
  telefone?: string | null;
  chave_pix?: string | null;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  documento_frente_url?: string | null;
  documento_verso_url?: string | null;
  selfie_url?: string | null;
};

export function AtivarOrganizadorForm({
  initialData,
  nextUrl,
}: {
  initialData?: FormInitialData | null;
  nextUrl?: string;
}) {
  const [frenteFileName, setFrenteFileName] = useState<string | null>(null);
  const [versoFileName, setVersoFileName] = useState<string | null>(null);

  const [state, action, pending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await ativarOrganizador(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={action} className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      {nextUrl && <input type="hidden" name="next_url" value={nextUrl} />}

      {/* Seção 1: Dados do Titular */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
            1
          </div>
          <h2 className="text-base font-semibold text-gray-900">Dados do Organizador</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            Nome Civil Completo (conforme documento oficial)
          </label>
          <input
            name="nome_completo"
            type="text"
            defaultValue={initialData?.nome_completo ?? ""}
            placeholder="Ex: Carlos Eduardo da Rocha"
            required
            className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              CPF ou CNPJ
            </label>
            <input
              name="cpf_cnpj"
              type="text"
              inputMode="numeric"
              defaultValue={initialData?.cpf_cnpj ?? ""}
              placeholder="Apenas números"
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Data de nascimento
            </label>
            <input
              name="data_nascimento"
              type="date"
              defaultValue={initialData?.data_nascimento ?? ""}
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            Celular WhatsApp (com DDD)
          </label>
          <input
            name="telefone"
            type="tel"
            defaultValue={initialData?.telefone ?? ""}
            placeholder="(73) 99999-8888"
            required
            className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Seção 2: Chave Pix para Recebimento */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Chave Pix para Recebimento</h2>
            <p className="text-xs text-gray-400">
              A chave Pix deve pertencer obrigatoriamente ao mesmo CPF/CNPJ cadastrado.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            Chave Pix (CPF, CNPJ, Telefone, E-mail ou Chave Aleatória)
          </label>
          <input
            name="chave_pix"
            type="text"
            defaultValue={initialData?.chave_pix ?? ""}
            placeholder="Informe sua chave Pix"
            required
            className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Seção 3: Identificação Oficial e Uploads */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
            3
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Documento Oficial com Foto</h2>
            <p className="text-xs text-gray-400">
              Para sua segurança e dos atletas, validamos a identidade de cada organizador.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Tipo de documento
            </label>
            <select
              name="documento_tipo"
              defaultValue={initialData?.documento_tipo ?? "cnh"}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="cnh">CNH (Carteira Nacional de Habilitação)</option>
              <option value="rg">RG (Registro Geral / Nova Carteira Nacional)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Número do documento
            </label>
            <input
              name="documento_numero"
              type="text"
              defaultValue={initialData?.documento_numero ?? ""}
              placeholder="Número impresso no documento"
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 2 Uploads de Imagem: Frente e Verso */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Frente */}
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-4 text-center hover:border-blue-400 transition-colors">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {frenteFileName || initialData?.documento_frente_url ? (
                <FileCheck className="size-5 text-emerald-600" />
              ) : (
                <Upload className="size-5" />
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-gray-900">1. Frente do Documento</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Com foto e dados nítidos</p>

            <label className="mt-3 inline-block cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
              {frenteFileName ? "Foto selecionada ✓" : initialData?.documento_frente_url ? "Substituir foto" : "Escolher foto"}
              <input
                type="file"
                name="foto_frente"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required={!initialData?.documento_frente_url}
                onChange={(e) => setFrenteFileName(e.target.files?.[0]?.name ?? null)}
                className="hidden"
              />
            </label>
            {frenteFileName && <p className="mt-1 text-[11px] text-emerald-600 truncate">{frenteFileName}</p>}
          </div>

          {/* Verso */}
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-4 text-center hover:border-blue-400 transition-colors">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {versoFileName || initialData?.documento_verso_url ? (
                <FileCheck className="size-5 text-emerald-600" />
              ) : (
                <Upload className="size-5" />
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-gray-900">2. Verso do Documento</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Com filiação e numeração</p>

            <label className="mt-3 inline-block cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
              {versoFileName ? "Foto selecionada ✓" : initialData?.documento_verso_url ? "Substituir foto" : "Escolher foto"}
              <input
                type="file"
                name="foto_verso"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required={!initialData?.documento_verso_url}
                onChange={(e) => setVersoFileName(e.target.files?.[0]?.name ?? null)}
                className="hidden"
              />
            </label>
            {versoFileName && <p className="mt-1 text-[11px] text-emerald-600 truncate">{versoFileName}</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-blue-50 p-3.5 text-xs text-blue-800 flex items-start gap-2.5">
          <ShieldCheck className="size-4 shrink-0 text-blue-600 mt-0.5" />
          <span>
            Seus documentos são criptografados e armazenados em ambiente privado e seguro, estritamente de acordo com a LGPD.
          </span>
        </div>
      </div>

      {state.error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-all shadow-md"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Enviando documentos..." : "Enviar documentos para validação"}
      </button>
    </form>
  );
}
