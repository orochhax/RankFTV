"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Setinha de "voltar" que retorna pra página anterior (de onde o usuário veio).
// Usa router.back() pra ser genérica — funciona venha de onde vier.
export function BackButton({
  label = "Voltar",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800 ${className}`}
    >
      <ArrowLeft className="size-4" /> {label}
    </button>
  );
}
