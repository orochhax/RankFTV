import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  QrCode,
  Sparkles,
  Network,
  TrendingUp,
  Shirt,
  Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyPages } from "@/lib/supabase/pages";
import { NovoCampeonatoForm } from "@/components/painel/NovoCampeonatoForm";

// O que o organizador desbloqueia ao criar — reforço de valor durante a criação.
const DESBLOQUEIOS = [
  { icon: Wallet,     titulo: "Inscrição e pagamento online", desc: "Atleta paga na hora, dinheiro confirmado." },
  { icon: QrCode,     titulo: "Check-in por QR",              desc: "Credencial no celular, portaria sem fila." },
  { icon: Sparkles,   titulo: "Categoria balanceada",         desc: "A plataforma sugere a categoria certa.", destaque: true },
  { icon: Network,    titulo: "Chaveamento ao vivo",          desc: "Chave e resultados em tempo real pro público." },
  { icon: TrendingUp, titulo: "Financeiro em tempo real",     desc: "Veja quanto entrou e quanto é seu." },
  { icon: Shirt,      titulo: "Camisas por tamanho",          desc: "Saiba quantas P/M/G/GG encomendar." },
  { icon: Megaphone,  titulo: "Comunicação com inscritos",    desc: "Avise todo mundo num clique." },
];

// Criar campeonato (Fase 0 — CRUD básico, ver ftv.md seção 7). Exige login: o
// organizador é o próprio usuário logado.
export default async function NovoCampeonatoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const minhasPages = await getMyPages(user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="size-4" /> Voltar ao painel
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-gray-900">Criar campeonato</h1>
      <p className="mt-1 text-sm text-gray-500">
        Preencha os dados e adicione as categorias. Dá pra salvar como rascunho e
        publicar depois.
      </p>

      {/* Painel de valor — o que ele desbloqueia ao criar */}
      <div className="mt-6 rounded-2xl bg-[#0f0f13] p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          Tudo isso já vem junto
        </p>
        <p className="mt-1 text-sm text-white/50">
          Assim que você criar, seu painel libera:
        </p>
        <ul className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {DESBLOQUEIOS.map(({ icon: Icon, titulo, desc, destaque }) => (
            <li key={titulo} className="flex gap-3">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  destaque ? "bg-blue-600" : "bg-white/10"
                }`}
              >
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

      {/* Reforço: sem custo pra criar */}
      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
        <p className="text-sm font-medium text-emerald-800">Sem custo pra criar</p>
        <p className="mt-0.5 text-xs text-emerald-600">
          Você só configura o recebimento na hora de publicar. Salvar como
          rascunho é livre.
        </p>
      </div>

      {/* Formulário */}
      <div className="mt-6">
        <NovoCampeonatoForm minhasPages={minhasPages} />
      </div>
    </div>
  );
}
