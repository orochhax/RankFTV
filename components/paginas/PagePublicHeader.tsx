"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, BookOpen } from "lucide-react";
import Image from "next/image";
import { togglePageFollow } from "@/app/campeonatos/paginas/actions";

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

export function PagePublicHeader({
  pageId,
  nome,
  handle,
  descricao,
  edicoes,
  userId,
  initialFollowing,
  initialSeguidores,
  avatarUrl,
  seguidoresHref,
}: {
  pageId: string;
  nome: string;
  handle: string;
  descricao: string;
  edicoes: number;
  userId: string | null;
  initialFollowing: boolean;
  initialSeguidores: number;
  avatarUrl?: string | null;
  // Quando informado (painel do dono), a contagem de seguidores vira link
  // pra lista de seguidores. Na página pública fica só texto.
  seguidoresHref?: string | null;
}) {
  const [seguindo, setSeguindo] = useState(initialFollowing);
  const [seguidores, setSeguidores] = useState(initialSeguidores);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    if (!userId) { router.push("/login"); return; }
    setSeguindo((f) => !f);
    setSeguidores((n) => seguindo ? Math.max(0, n - 1) : n + 1);
    startTransition(async () => {
      const result = await togglePageFollow(pageId);
      setSeguindo(result.following);
      setSeguidores(result.count);
    });
  }

  return (
    <div className="flex flex-col items-center text-center gap-3">
      {/* Avatar */}
      <div className="relative size-20 -mt-10 rounded-2xl ring-4 ring-[#0f0f13] overflow-hidden bg-gradient-to-br from-gray-600 to-gray-700 shrink-0">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={nome} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl font-bold text-white/80">{nome.charAt(0)}</span>
          </div>
        )}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white">{nome}</h1>
      <p className="text-sm text-white/50">@{handle}</p>
      {descricao && (
        <p className="text-sm text-white/70 max-w-sm">{descricao}</p>
      )}
      <div className="flex items-center gap-5 text-sm text-white/50">
        {seguidoresHref ? (
          <Link
            href={seguidoresHref}
            className="flex items-center gap-1 font-semibold text-white underline decoration-white/40 decoration-1 underline-offset-4 transition-colors hover:decoration-white"
          >
            <Users className="size-4" />
            {fmt(seguidores)} seguidores
          </Link>
        ) : (
          <span className="flex items-center gap-1">
            <Users className="size-4" />
            {fmt(seguidores)} seguidores
          </span>
        )}
        <span className="flex items-center gap-1">
          <BookOpen className="size-4" />
          {edicoes} edições
        </span>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`mt-1 rounded-xl px-6 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          seguindo
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {seguindo ? "Seguindo" : "Seguir"}
      </button>
    </div>
  );
}
