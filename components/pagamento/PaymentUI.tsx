"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, CreditCard, QrCode, FileText, ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatBRL } from "@/lib/format";

const AVATAR_COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-teal-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

type Atleta = { id: string; nome: string };
type Tab = "pix" | "cartao" | "boleto";

type Props = {
  champId:       string;
  champNome:     string;
  catNome:       string;
  valor:         number;
  atleta1:       Atleta | null;
  atleta2:       Atleta | null;
  pixCopyPaste:  string | null;
  pixQrBase64:   string | null;
};

function CopyPix({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        copied
          ? "bg-emerald-500 text-white"
          : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
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
  atleta1,
  atleta2,
  pixCopyPaste,
  pixQrBase64,
}: Props) {
  const [tab, setTab] = useState<Tab>("pix");

  const tabs: { key: Tab; label: string; icon: React.ReactNode; breve?: boolean }[] = [
    { key: "pix",    label: "Pix",    icon: <QrCode className="size-4" /> },
    { key: "cartao", label: "Cartão", icon: <CreditCard className="size-4" />, breve: true },
    { key: "boleto", label: "Boleto", icon: <FileText className="size-4" />, breve: true },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro com resumo do pedido ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-lg space-y-5">
          <Link
            href={`/campeonatos/${champId}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar ao campeonato
          </Link>

          {/* Nome do evento */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">
              Inscrição
            </p>
            <h1 className="mt-1 text-xl font-bold text-white">{champNome}</h1>
            <p className="text-sm text-white/50">Categoria {catNome}</p>
          </div>

          {/* Atletas */}
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
                  <span className="text-white/30 font-light">+</span>
                  <div className="flex items-center gap-2">
                    <Avatar nome={atleta2.nome} color={avatarColor(atleta2.id)} size="sm" />
                    <span className="text-sm font-medium text-white">{atleta2.nome.split(" ")[0]}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Valor */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formatBRL(valor)}</span>
            <span className="text-sm text-white/40">por dupla</span>
          </div>
        </div>
      </div>

      {/* ── Área branca com curva ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-lg space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {tabs.map(({ key, label, icon, breve }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  tab === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {icon}
                {label}
                {breve && (
                  <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                    breve
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Conteúdo PIX ── */}
          {tab === "pix" && (
            <div className="space-y-5">
              {/* QR Code */}
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
                  <p className="text-sm font-medium text-gray-700">
                    Abra o app do seu banco e escaneie
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Ou copie o código abaixo
                  </p>
                </div>
              </div>

              {/* Copia e cola */}
              {pixCopyPaste && (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                      Pix copia e cola
                    </p>
                    <p className="break-all font-mono text-xs text-gray-600 leading-relaxed">
                      {pixCopyPaste}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <CopyPix text={pixCopyPaste} />
                  </div>
                </div>
              )}

              {/* Infos */}
              <div className="rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-blue-100">
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-blue-500" />
                    Confirmação automática — a inscrição é liberada em segundos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-blue-500" />
                    Válido por 24 horas
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-blue-500" />
                    Disponível em qualquer banco
                  </li>
                </ul>
              </div>

              <Link
                href={`/campeonatos/${champId}`}
                className="block text-center text-sm text-gray-400 hover:text-gray-600"
              >
                Pagar depois
              </Link>
            </div>
          )}

          {/* ── Conteúdo Cartão ── */}
          {tab === "cartao" && (
            <div className="space-y-5 opacity-60">
              <div className="rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200 text-center">
                <p className="text-sm font-semibold text-amber-700">Pagamento por cartão em breve</p>
                <p className="mt-1 text-xs text-amber-600">
                  Por enquanto use Pix — confirmação imediata e sem taxas extras.
                </p>
              </div>

              {/* Form preview */}
              <div className="space-y-4 rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5 pointer-events-none">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Número do cartão</label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                    <span className="flex-1 font-mono text-sm text-gray-400 tracking-widest">•••• •••• •••• ••••</span>
                    <CreditCard className="size-4 text-gray-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome no cartão</label>
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-300">
                    Seu nome aqui
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Validade</label>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-300">MM / AA</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">CVV</label>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-300">•••</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Parcelamento</label>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-400">
                    <span>À vista — {formatBRL(valor)}</span>
                    <span>▾</span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-200 py-3 text-center text-sm font-semibold text-gray-400">
                  Pagar {formatBRL(valor)}
                </div>
              </div>
            </div>
          )}

          {/* ── Conteúdo Boleto ── */}
          {tab === "boleto" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-amber-50 px-4 py-4 ring-1 ring-amber-200 text-center">
                <p className="text-sm font-semibold text-amber-700">Boleto em breve</p>
                <p className="mt-1 text-xs text-amber-600">
                  Use Pix enquanto isso — mais rápido e com confirmação imediata.
                </p>
              </div>
              <button
                onClick={() => setTab("pix")}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Pagar com Pix
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
