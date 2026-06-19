"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Check, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { alterarHandlePagina } from "@/app/painel/paginas/[id]/editar/actions";
import { createClient } from "@/lib/supabase/client";

export function AlterarHandlePagina({
  pageId,
  currentHandle,
  handleUpdatedAt,
}: {
  pageId: string;
  currentHandle: string;
  handleUpdatedAt: string | null;
}) {
  const supabase = createClient();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calcula dias restantes do cooldown
  const diasRestantes = (() => {
    if (!handleUpdatedAt) return 0;
    const diff = (Date.now() - new Date(handleUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return diff < 20 ? Math.ceil(20 - diff) : 0;
  })();

  const bloqueado = diasRestantes > 0;

  // Quando pode mudar de novo
  const podeEm = (() => {
    if (!handleUpdatedAt || !bloqueado) return null;
    const d = new Date(new Date(handleUpdatedAt).getTime() + 20 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  })();

  useEffect(() => {
    if (!handle) { setStatus("idle"); return; }
    if (handle === currentHandle) { setStatus("invalid"); return; }
    if (!/^[a-z0-9-]{3,30}$/.test(handle)) { setStatus("invalid"); return; }

    setStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const [{ data: page }, { data: profile }] = await Promise.all([
        supabase.from("pages").select("id").eq("handle", handle).neq("id", pageId).maybeSingle(),
        supabase.from("profiles").select("id").eq("username", handle).maybeSingle(),
      ]);
      setStatus(page || profile ? "taken" : "ok");
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [handle]);

  function handleSave() {
    if (status !== "ok" || bloqueado) return;
    setError("");
    startTransition(async () => {
      const res = await alterarHandlePagina(pageId, handle);
      if (res.ok) {
        setSaved(true);
        setHandle("");
        setStatus("idle");
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error ?? "Erro ao alterar o @.");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-0.5">@ da página</p>
        <p className="text-sm text-gray-400">
          Atual: <span className="font-semibold text-gray-700">@{currentHandle}</span>
        </p>
      </div>

      {bloqueado ? (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
          <Clock className="size-4 mt-0.5 shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Mudança bloqueada por {diasRestantes} dia{diasRestantes > 1 ? "s" : ""}</p>
            <p className="text-amber-600 mt-0.5">Você poderá mudar novamente a partir de {podeEm}.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600">Novo @handle</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                maxLength={30}
                placeholder={currentHandle}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-7 pr-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {status === "checking" && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-gray-400" />}
              {status === "ok"      && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />}
              {(status === "taken" || status === "invalid") && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-red-500" />}
            </div>
            {status === "taken"   && <p className="text-xs text-red-600">Esse @ já está em uso.</p>}
            {status === "invalid" && handle && handle !== currentHandle && <p className="text-xs text-red-600">Só letras minúsculas, números e hífens (mín. 3 caracteres).</p>}
            {status === "invalid" && handle === currentHandle && <p className="text-xs text-red-600">Esse já é o @ atual da página.</p>}
            <p className="text-xs text-gray-400">Após mudar, o próximo @ só poderá ser alterado em 20 dias.</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="size-3.5" /> @ alterado com sucesso
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={status !== "ok" || pending}
              className="ml-auto rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {pending ? "Salvando…" : "Alterar @"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
