"use client";

import { useState } from "react";
import {
  MessageCircle, Wallet, QrCode, Sparkles,
  Network, TrendingUp, Shirt, Megaphone, Check,
} from "lucide-react";
import { ElitePlanCard } from "./ElitePlanCard";
import { NovoCampeonatoForm } from "./NovoCampeonatoForm";
import type { PageWithStats } from "@/lib/supabase/pages";

type MinhaPage = Pick<PageWithStats, "id" | "nome" | "handle">;

const BENEFICIOS_PADRAO = [
  { icon: MessageCircle, label: "Atendimento direto pelo WhatsApp" },
  { icon: Wallet,        label: "Inscrição e pagamento online — atleta paga na hora, dinheiro confirmado" },
  { icon: QrCode,        label: "Check-in por QR — credencial no celular, portaria sem fila" },
  { icon: Sparkles,      label: "Categoria balanceada — a plataforma sugere a categoria certa" },
  { icon: Network,       label: "Chaveamento ao vivo — chave e resultados em tempo real pro público" },
  { icon: TrendingUp,    label: "Financeiro em tempo real — veja quanto entrou e quanto é seu" },
  { icon: Shirt,         label: "Camisas por tamanho — saiba quantas P/M/G/GG encomendar" },
  { icon: Megaphone,     label: "Comunicação com inscritos — avise todo mundo num clique" },
];

export function NovoCampeonatoSection({ minhasPages }: { minhasPages: MinhaPage[] }) {
  const [elite, setElite] = useState(false);

  return (
    <div className="space-y-4">

      {/* 1. Campeonato de Elite */}
      <ElitePlanCard elite={elite} onToggle={setElite} />

      {/* 2. Campeonato Padrão */}
      <div className="rounded-2xl bg-[#0f0f13] p-5 text-white sm:p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Campeonato Padrão</p>
          <p className="mt-0.5 text-sm text-white/50">O que já vem incluso em todos os campeonatos:</p>
        </div>
        <ul className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {BENEFICIOS_PADRAO.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-2.5 text-sm text-white/70">
              <Icon className="size-4 mt-0.5 shrink-0 text-white/30" strokeWidth={1.8} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Card verde — sem custo */}
      <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
        <p className="text-sm font-medium text-emerald-800">Sem custo pra criar</p>
        <p className="mt-0.5 text-xs text-emerald-600">
          Você só configura o recebimento na hora de publicar. Salvar como rascunho é livre.
        </p>
      </div>

      {/* 4. Formulário */}
      <NovoCampeonatoForm minhasPages={minhasPages} elite={elite} />
    </div>
  );
}
