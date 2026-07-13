import { redirect } from "next/navigation";
import Link from "next/link";
import { Percent, Users, Star, Trophy, Newspaper, Activity, WalletCards, CalendarRange, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const MENU = [
  {
    href: "/admin/performance",
    icon: Activity,
    label: "Performance",
    desc: "Seu painel pessoal: metas do dia, constância e evolução.",
  },
  {
    href: "/admin/gastos",
    icon: WalletCards,
    label: "Gastos pessoais",
    desc: "Controle financeiro pessoal de Carlos e Julia — isolado do RankFTV.",
  },
  {
    href: "/admin/gasto-mensal",
    icon: CalendarRange,
    label: "Gasto mensal",
    desc: "Planejamento financeiro mensal de Carlos e Julia — receitas, despesas e resultado previsto.",
  },
  {
    href: "/admin/campeonatos",
    icon: Trophy,
    label: "Campeonatos",
    desc: "Veja todos os campeonatos, mude o status, exclua e contate o organizador.",
  },
  {
    href: "/admin/noticias",
    icon: Newspaper,
    label: "Notícias",
    desc: "Crie e exclua as notícias que aparecem na home e em /noticias.",
  },
  {
    href: "/admin/destaques",
    icon: Star,
    label: "Destaques da home",
    desc: "Escolha os 3 campeonatos fixados na tela inicial para todos.",
  },
  {
    href: "/admin/taxas",
    icon: Percent,
    label: "Taxas da plataforma",
    desc: "Defina a taxa cobrada por inscrição em cada campeonato.",
  },
  {
    href: "/admin/usuarios",
    icon: Users,
    label: "Usuários",
    desc: "Visualize e gerencie as contas cadastradas na plataforma.",
  },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
      </div>

      <ul className="space-y-3">
        {MENU.map(({ href, icon: Icon, label, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 hover:ring-blue-200 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Icon className="size-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500 truncate">{desc}</p>
              </div>
              <ChevronRight className="size-5 text-gray-300 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
