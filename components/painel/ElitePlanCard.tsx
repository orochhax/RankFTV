"use client";

import { useState } from "react";
import {
  Crown, Check, X, ArrowRight,
  TrendingDown, Video, Star, MessageCircle, Camera,
  Sparkles, Megaphone, Wallet, QrCode, Network, TrendingUp, Shirt,
  ShieldCheck, BadgeDollarSign,
} from "lucide-react";

const BENEFICIOS_ELITE = [
  { icon: TrendingDown,  label: "Taxas reduzidas da plataforma" },
  { icon: Video,         label: "Call ao vivo com o CEO para apresentar todas as funcionalidades" },
  { icon: Star,          label: "Destaque no início do site — seu campeonato fica fixado na tela inicial do site" },
  { icon: Camera,        label: "Divulgação do campeonato nos stories do @rankftv" },
  { icon: MessageCircle, label: "Suporte priorizado direto pelo WhatsApp" },
  { icon: Network,       label: "Chaveamento ao vivo — chave e resultados em tempo real pro público" },
  { icon: QrCode,        label: "Check-in por QR — credencial no celular, portaria sem fila" },
  { icon: Sparkles,      label: "Categoria balanceada — a plataforma sugere a categoria certa" },
  { icon: Wallet,        label: "Inscrição e pagamento online — Pix na hora ou cartão em até 12x" },
  { icon: TrendingUp,    label: "Financeiro em tempo real — veja quanto entrou e quanto é seu" },
  { icon: Shirt,         label: "Camisas por tamanho — saiba quantas P/M/G/GG encomendar" },
  { icon: Megaphone,     label: "Comunicação com inscritos — avise todo mundo num clique" },
];

const TERMOS = [
  "O valor de R$178,00 será descontado automaticamente das primeiras inscrições recebidas.",
  "Você não paga nada agora — o desconto acontece conforme os atletas pagam.",
  "As taxas reduzidas entram em vigor imediatamente após aceitar.",
  "Caso o evento seja cancelado antes de atingir R$178 em inscrições, o saldo pendente é zerado.",
  "Ao aceitar, você concorda com os Termos do Evento de Elite da RankFTV.",
];

export function ElitePlanCard({
  elite,
  onToggle,
}: {
  elite: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [showTerms, setShowTerms] = useState(false);

  // Ativado
  if (elite) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 p-5 ring-2 ring-amber-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-400">
              <Crown className="size-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-amber-900">Evento de Elite ativado</p>
              <p className="text-xs text-amber-600">R$178 descontados das primeiras inscrições</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onToggle(false); setShowTerms(false); }}
            className="rounded-full p-1.5 text-amber-400 hover:bg-amber-100 hover:text-amber-600"
            title="Cancelar Elite"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {BENEFICIOS_ELITE.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-2 text-sm text-amber-800">
              <Check className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Explicação + termos
  if (showTerms) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] p-6">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="size-5 text-amber-400" />
          <h3 className="font-bold text-white">Como funciona o Evento de Elite</h3>
        </div>

        {/* Destaque principal: não paga agora */}
        <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="size-5 text-emerald-400" />
            <p className="font-bold text-emerald-300 text-base">Você não paga nada agora</p>
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            O valor de <strong className="text-emerald-300">R$178,00</strong> é descontado automaticamente
            das primeiras inscrições que entram. Sem cartão, sem boleto, sem tirar dinheiro do bolso.
            Enquanto ninguém se inscrever, você não deve nada.
          </p>
        </div>

        {/* Taxa reduzida = mais dinheiro */}
        <div className="rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/30 p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BadgeDollarSign className="size-5 text-amber-400" />
            <p className="font-bold text-amber-300 text-base">Taxa reduzida = mais dinheiro no seu bolso</p>
          </div>
          <p className="text-sm text-amber-200/80 leading-relaxed">
            No plano Padrão a plataforma retém uma taxa maior por inscrição.
            No Elite, essa taxa cai — e a diferença vai direto pra você.
            Num evento com R$10.000 em inscrições, isso pode representar
            <strong className="text-amber-300"> R$100 a mais</strong> no seu bolso.
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <div className="rounded-lg bg-white/10 px-3 py-2 text-white/60">
              Padrão: taxa maior
            </div>
            <ArrowRight className="size-3.5 text-amber-400 shrink-0" />
            <div className="rounded-lg bg-amber-400/20 px-3 py-2 text-amber-300 font-semibold">
              Elite: taxa reduzida ✓
            </div>
          </div>
        </div>

        {/* Termos resumidos */}
        <ul className="space-y-1.5 mb-6">
          {TERMOS.map((t) => (
            <li key={t} className="flex items-start gap-2 text-xs text-white/50">
              <Check className="size-3 mt-0.5 shrink-0 text-white/30" />
              {t}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onToggle(true)}
            className="flex-1 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-gray-900 hover:bg-amber-300 transition-colors"
          >
            Quero o Evento de Elite
          </button>
          <button
            type="button"
            onClick={() => setShowTerms(false)}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/50 hover:bg-white/5"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Padrão — lista de benefícios
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] p-5 ring-1 ring-amber-400/20">
      <div className="flex items-center gap-2 mb-1">
        <Crown className="size-5 text-amber-400" />
        <p className="font-bold text-white">Evento de Elite</p>
        <span className="ml-auto rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
          R$178 / evento
        </span>
      </div>
      <p className="text-xs text-white/40 mb-4">
        Descontado automaticamente das primeiras inscrições — sem pagar agora.
      </p>
      <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2 mb-5">
        {BENEFICIOS_ELITE.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-start gap-2 text-sm text-white/70">
            <Icon className="size-3.5 mt-0.5 shrink-0 text-amber-400" />
            {label}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setShowTerms(true)}
        className="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-gray-900 hover:bg-amber-300 transition-colors"
      >
        Entenda como funciona
      </button>
    </div>
  );
}
