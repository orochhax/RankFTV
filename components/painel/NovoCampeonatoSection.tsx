"use client";

import { useState } from "react";
import { Wallet, QrCode, Sparkles, Network, TrendingUp, Shirt, Megaphone } from "lucide-react";
import { ElitePlanCard } from "./ElitePlanCard";
import { NovoCampeonatoForm } from "./NovoCampeonatoForm";
import type { PageWithStats } from "@/lib/supabase/pages";

type MinhaPage = Pick<PageWithStats, "id" | "nome" | "handle">;

const DESBLOQUEIOS = [
  { icon: Wallet,     titulo: "Inscrição e pagamento online", desc: "Atleta paga na hora, dinheiro confirmado." },
  { icon: QrCode,     titulo: "Check-in por QR",              desc: "Credencial no celular, portaria sem fila." },
  { icon: Sparkles,   titulo: "Categoria balanceada",         desc: "A plataforma sugere a categoria certa.", destaque: true },
  { icon: Network,    titulo: "Chaveamento ao vivo",          desc: "Chave e resultados em tempo real pro público." },
  { icon: TrendingUp, titulo: "Financeiro em tempo real",     desc: "Veja quanto entrou e quanto é seu." },
  { icon: Shirt,      titulo: "Camisas por tamanho",          desc: "Saiba quantas P/M/G/GG encomendar." },
  { icon: Megaphone,  titulo: "Comunicação com inscritos",    desc: "Avise todo mundo num clique." },
];

export function NovoCampeonatoSection({ minhasPages }: { minhasPages: MinhaPage[] }) {
  const [elite, setElite] = useState(false);

  return (
    <div className="space-y-4">

      {/* 1. Elite card — primeiro */}
      <ElitePlanCard elite={elite} onToggle={setElite} />

      {/* 2. Card preto — o que vem junto */}
      <div className="rounded-2xl bg-[#0f0f13] p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          Tudo isso já vem junto
        </p>
        <p className="mt-1 text-sm text-white/50">
          Assim que você criar, seu painel libera:
        </p>
        <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {DESBLOQUEIOS.map(({ icon: Icon, titulo, desc, destaque }) => (
            <li key={titulo} className="flex gap-3">
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${destaque ? "bg-blue-600" : "bg-white/10"}`}>
                <Icon className="size-4 text-white" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                  {titulo}
                  {destaque && (
                    <span className="rounded-full bg-blue-600/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                      Exclusivo
                    </span>
                  )}
                </p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
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
