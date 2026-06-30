"use client";

import {
  MessageCircle, Wallet, QrCode, Sparkles, Lock, Camera,
  Network, TrendingUp, Shirt, Megaphone, Check,
  TrendingDown, Video, Star,
} from "lucide-react";
import { ElitePlanCard } from "./ElitePlanCard";

const BENEFICIOS_PADRAO = [
  { icon: TrendingDown,  label: "Taxas reduzidas da plataforma",                                             locked: true },
  { icon: Video,         label: "Call ao vivo com o CEO para apresentar todas as funcionalidades",            locked: true },
  { icon: Star,          label: "Destaque no início do site — seu campeonato fica fixado na tela inicial",   locked: true },
  { icon: Camera,        label: "Divulgação do campeonato nos stories do @rankftv",                          locked: true },
  { icon: MessageCircle, label: "Suporte pelo WhatsApp",                                                     locked: false },
  { icon: Network,       label: "Chaveamento ao vivo — chave e resultados em tempo real pro público",        locked: false },
  { icon: QrCode,        label: "Check-in por QR — credencial no celular, portaria sem fila",               locked: false },
  { icon: Sparkles,      label: "Categoria balanceada — a plataforma sugere a categoria certa",              locked: true },
  { icon: Wallet,        label: "Inscrição e pagamento online — Pix na hora ou cartão em até 12x", locked: false },
  { icon: TrendingUp,    label: "Financeiro em tempo real — veja quanto entrou e quanto é seu",              locked: false },
  { icon: Shirt,         label: "Camisas por tamanho — saiba quantas P/M/G/GG encomendar",                  locked: false },
  { icon: Megaphone,     label: "Comunicação com inscritos — avise todo mundo num clique",                   locked: false },
];

// Cards de escolha de plano (Elite x Padrão) — última etapa da criação.
export function PlanoCards({ elite, onToggle }: { elite: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="space-y-4">
      <ElitePlanCard elite={elite} onToggle={onToggle} />

      <div className="rounded-2xl bg-[#0f0f13] p-5 text-white sm:p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Evento Padrão</p>
            <span className="ml-auto rounded-full bg-blue-400/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
              R$0 / evento
            </span>
          </div>
          <p className="mt-0.5 text-sm text-white/50">O que já vem incluso em todos os campeonatos:</p>
        </div>
        <ul className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {BENEFICIOS_PADRAO.map(({ label, locked }) => (
            <li key={label} className={`flex items-start gap-2.5 text-sm ${locked ? "text-white/25" : "text-white/70"}`}>
              {locked
                ? <Lock className="size-3.5 mt-0.5 shrink-0 text-white/20" />
                : <Check className="size-3.5 mt-0.5 shrink-0 text-blue-400" />
              }
              <span className={locked ? "line-through" : ""}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
        <p className="text-sm font-medium text-blue-800">Sem custo pra criar</p>
        <p className="mt-0.5 text-xs text-blue-600">
          Você só configura o recebimento na hora de publicar. Salvar como rascunho é livre.
        </p>
      </div>
    </div>
  );
}
