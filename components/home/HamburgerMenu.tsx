"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Menu, X, User, Bell, CalendarPlus, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Props = {
  unreadCount: number;
};

export function HamburgerMenu({ unreadCount }: Props) {
  const [open, setOpen]       = useState(false);
  const [isPending, start]    = useTransition();
  const menuRef               = useRef<HTMLDivElement>(null);
  const router                = useRouter();

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    start(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  const items = [
    {
      icon: User,
      label: "Perfil",
      href: "/perfil",
      badge: 0,
    },
    {
      icon: Bell,
      label: "Notificações",
      href: "/notificacoes",
      badge: unreadCount,
    },
    {
      icon: CalendarPlus,
      label: "Organizar um evento",
      href: "/painel/novo-campeonato",
      badge: 0,
    },
    {
      icon: Settings,
      label: "Configurações",
      href: "/perfil/conta",
      badge: 0,
    },
  ];

  return (
    <div ref={menuRef} className="relative">
      {/* Botão hambúrguer */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="relative rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
        {/* Bolinha vermelha externa (quando fechado e tem notificações) */}
        {!open && unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-red-500 ring-2 ring-[#0f0f13]" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
          <nav className="py-1">
            {items.map(({ icon: Icon, label, href, badge }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Icon className="size-4 shrink-0 text-gray-400" />
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            ))}

            <div className="my-1 h-px bg-gray-100" />

            <button
              onClick={handleLogout}
              disabled={isPending}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <LogOut className="size-4 shrink-0" />
              <span>{isPending ? "Saindo…" : "Sair"}</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
