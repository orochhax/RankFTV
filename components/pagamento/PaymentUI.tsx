"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, CreditCard, QrCode, ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatBRL } from "@/lib/format";
import { calcularTaxaComprador, calcularTotalComprador } from "@/lib/taxas";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/shell/PageContainer";

const AVATAR_COLORS = ["bg-blue-500","bg-blue-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-teal-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

type Atleta = { id: string; nome: string };
type Tab    = "pix" | "cartao";

type Props = {
  champId:       string;
  champNome:     string;
  catNome:       string;
  valor:         number;
  isElite:       boolean;
  registrationId: string;
  atleta1:       Atleta | null;
  atleta2:       Atleta | null;
  pixCopyPaste:  string | null;
  pixQrBase64:   string | null;
  billingType:   string | null;
  invoiceUrl:    string | null;
};

function CopyPixButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        copied ? "bg-blue-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
      }`}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado!" : "Copiar código Pix"}
    </button>
  );
}

export function PaymentUI({
  champId,
  champNome,
  catNome,
  valor,
  isElite,
  registrationId,
  atleta1,
  atleta2,
  pixCopyPaste,
  pixQrBase64,
  billingType,
  invoiceUrl,
}: Props) {
  const isCardPayment = billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD";
  const [tab, setTab] = useState<Tab>(isCardPayment ? "cartao" : "pix");
  const router = useRouter();
  const stoppedRef = useRef(false);

  // Polling: verifica a cada 3s se o pagamento foi confirmado pelo webhook.
  // Para automaticamente após 20 minutos.
  useEffect(() => {
    const supabase = createClient();
    stoppedRef.current = false;

    async function check() {
      if (stoppedRef.current) return;
      const { data } = await supabase
        .from("registrations")
        .select("status_pagamento")
        .eq("id", registrationId)
        .single();
      if (data?.status_pagamento === "pago") {
        router.push(`/campeonatos/${champId}/pagamento/${registrationId}?pago=1`);
        router.refresh();
        return;
      }
      if (!stoppedRef.current) timer = setTimeout(check, 3000);
    }

    let timer = setTimeout(check, 3000);
    const maxTimer = setTimeout(() => { stoppedRef.current = true; clearTimeout(timer); }, 20 * 60 * 1000);

    return () => { stoppedRef.current = true; clearTimeout(timer); clearTimeout(maxTimer); };
  }, [registrationId, champId, router]);

  // Pix: o QR já foi gerado com valor + taxa Pix. Mostra a conta pro comprador.
  const taxaPix  = calcularTaxaComprador(valor, "pix", isElite);
  const totalPix = calcularTotalComprador(valor, "pix", isElite);

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro (mesma largura contida do corpo, em toda tela) ── */}
      <div className="bg-brand-dark pb-16 pt-6">
        <PageContainer width="form" className="space-y-5">
          <Link
            href={`/campeonatos/${champId}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar ao campeonato
          </Link>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Inscrição</p>
            <h1 className="mt-1 text-xl font-bold text-white">{champNome}</h1>
            <p className="text-sm text-white/50">Categoria {catNome}</p>
          </div>

          {(atleta1 || atleta2) && (
            <div className="flex items-center gap-3">
              {atleta1 && (
                <div className="flex items-center gap-2">
                  <Avatar nome={atleta1.nome} color={avatarColor(atleta1.id)} size="sm" />
                  <span className="text-sm font-medium text-white">{atleta1.nome.split(" ")[0]}</span>
                </div>
              )}
              {atleta2 && (
                <>
                  <span className="text-white/30">+</span>
                  <div className="flex items-center gap-2">
                    <Avatar nome={atleta2.nome} color={avatarColor(atleta2.id)} size="sm" />
                    <span className="text-sm font-medium text-white">{atleta2.nome.split(" ")[0]}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formatBRL(valor)}</span>
            <span className="text-sm text-white/40">por dupla</span>
          </div>
        </PageContainer>
      </div>

      {/* ── Corpo: sheet arredondada no mobile, fundo neutro no desktop ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
        <PageContainer width="form" className="space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {(isCardPayment
              ? [{ key: "cartao" as Tab, label: "Cartão", icon: <CreditCard className="size-4" /> }]
              : [{ key: "pix" as Tab, label: "Pix", icon: <QrCode className="size-4" /> }]
            ).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ── Tab Pix ── */}
          {tab === "pix" && (
            <div className="space-y-5">
              {/* Resumo: valor + taxa = total */}
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Inscrição</span><span>{formatBRL(valor)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-gray-500">
                  <span>Taxa de serviço</span><span>+ {formatBRL(taxaPix)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                  <span>Total no Pix</span><span>{formatBRL(totalPix)}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl bg-gray-50 px-6 py-8 ring-1 ring-black/5">
                {pixQrBase64 ? (
                  <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${pixQrBase64}`}
                      alt="QR Code Pix"
                      className="size-52"
                    />
                  </div>
                ) : (
                  <div className="flex size-52 items-center justify-center rounded-2xl bg-gray-200 text-sm text-gray-400">
                    QR code indisponível
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Abra o app do seu banco e escaneie</p>
                  <p className="mt-0.5 text-xs text-gray-400">Ou copie o código abaixo</p>
                </div>
              </div>

              {pixCopyPaste && (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">Pix copia e cola</p>
                    <p className="break-all font-mono text-xs text-gray-600 leading-relaxed">{pixCopyPaste}</p>
                  </div>
                  <div className="flex justify-center">
                    <CopyPixButton text={pixCopyPaste} />
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-blue-100">
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-blue-500" />Confirmação automática em segundos</li>
                  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-blue-500" />Válido por 24 horas</li>
                  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-blue-500" />Disponível em qualquer banco</li>
                </ul>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-blue-400" />
                Aguardando confirmação do pagamento…
              </div>

              <Link href={`/campeonatos/${champId}`} className="block text-center text-sm text-gray-400 hover:text-gray-600">
                Pagar depois
              </Link>
            </div>
          )}

          {/* ── Tab Cartão ── */}
          {tab === "cartao" && (
            <div className="space-y-5 rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><CreditCard className="size-5" /></div>
                <div>
                  <h2 className="font-semibold text-gray-900">Pagamento seguro no Asaas</h2>
                  <p className="mt-1 text-sm text-gray-500">Você informará os dados do cartão diretamente na página segura do Asaas. A RankFTV não recebe nem armazena número ou CVV.</p>
                </div>
              </div>
              {invoiceUrl ? (
                <a href={invoiceUrl} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                  Ir para o pagamento seguro
                </a>
              ) : (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">Não foi possível preparar o checkout do cartão. Volte e tente novamente.</p>
              )}
            </div>
          )}

        </PageContainer>
      </div>
    </div>
  );
}
