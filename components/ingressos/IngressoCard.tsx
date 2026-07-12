import Link from "next/link";
import { Ticket, Users, CheckCircle2, Clock, ChevronRight } from "lucide-react";

export type Ingresso = {
  id:               string;
  tipo:             "atleta" | "plateia";
  campeonato_nome:  string;
  categoria_nome:   string | null;
  tipo_nome:        string | null;
  valor:            number;
  status_pagamento: string;
  code:             string | null;
  access_token:     string | null;
  checked_in:       boolean;
  comprador_nome:   string;
  parceiro_nome?:   string | null;
  championship_id:  string;
  ticket_id:        string;
};

export function IngressoCard({
  ingresso: ing,
  origem,
}: {
  ingresso: Ingresso;
  /** De onde essa lista foi aberta — usado pra tela do ingresso saber pra
   *  onde volta (ex.: "minhas-compras"). */
  origem?: "minhas-compras";
}) {
  const pago       = ing.status_pagamento === "pago";
  const estornado  = ing.status_pagamento === "estornado";
  const isAtleta   = ing.tipo === "atleta";

  const params = new URLSearchParams();
  if (ing.access_token) params.set("token", ing.access_token);
  if (origem) params.set("voltar", origem);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const href = `/campeonatos/${ing.championship_id}/${isAtleta ? "comprar" : "plateia"}/ingresso/${ing.ticket_id}${suffix}`;

  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-2xl ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      <div className="bg-[#0f0f13] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isAtleta
              ? <Users className="size-4 text-blue-400" />
              : <Ticket className="size-4 text-blue-400" />}
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">
              {isAtleta ? "Ingresso de atleta" : "Ingresso de plateia"}
            </p>
          </div>
          {ing.code && (
            <p className="font-mono text-[10px] tracking-widest text-white/30">{ing.code}</p>
          )}
        </div>
        <p className="mt-1 text-sm font-semibold text-white">{ing.campeonato_nome}</p>
        {(ing.categoria_nome || ing.tipo_nome) && (
          <p className="text-xs text-white/40">
            {ing.categoria_nome ? `Categoria ${ing.categoria_nome}` : ing.tipo_nome}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 bg-white px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isAtleta && ing.parceiro_nome
              ? <><span className="font-medium">{ing.comprador_nome}</span> + <span className="font-medium">{ing.parceiro_nome}</span></>
              : <span className="font-medium truncate">{ing.comprador_nome}</span>}
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
            {estornado ? (
              <span className="text-red-500">Cancelado</span>
            ) : pago ? (
              <span className="flex items-center gap-1 text-blue-600">
                <CheckCircle2 className="size-3.5" /> Confirmado
                {ing.checked_in && <span className="font-normal text-gray-400">· check-in feito</span>}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="size-3.5" /> Aguardando pagamento
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="size-4 shrink-0 text-gray-300" />
      </div>
    </Link>
  );
}
