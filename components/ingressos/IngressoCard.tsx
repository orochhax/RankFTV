"use client";

import { useState } from "react";
import { Ticket, Users, CheckCircle2, Clock } from "lucide-react";
import QRCode from "qrcode";

export type Ingresso = {
  id:               string;
  tipo:             "atleta" | "plateia";
  campeonato_nome:  string;
  categoria_nome:   string | null;
  tipo_nome:        string | null;
  valor:            number;
  status_pagamento: string;
  code:             string | null;
  qr_token:         string | null;
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
  /** De onde essa lista foi aberta — usado pro botão "Voltar" da tela de
   *  pagamento saber pra onde retornar (ex.: "minhas-compras"). */
  origem?: "minhas-compras";
}) {
  const [qrData, setQrData] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  async function toggleQr() {
    if (showQr) { setShowQr(false); return; }
    if (!ing.qr_token) return;
    if (!qrData) {
      const data = await QRCode.toDataURL(ing.qr_token, {
        width:  220,
        margin: 2,
        color:  { dark: "#0f0f13", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrData(data);
    }
    setShowQr(true);
  }

  const pago       = ing.status_pagamento === "pago";
  const estornado  = ing.status_pagamento === "estornado";
  const isAtleta   = ing.tipo === "atleta";

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
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

      <div className="bg-white px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isAtleta && ing.parceiro_nome
            ? <><span className="font-medium">{ing.comprador_nome}</span> + <span className="font-medium">{ing.parceiro_nome}</span></>
            : <span className="font-medium">{ing.comprador_nome}</span>}
        </div>

        <div className="mt-3 flex items-center gap-3">
          {estornado ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-red-500">
              Cancelado
            </div>
          ) : pago ? (
            <>
              <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                <CheckCircle2 className="size-3.5" /> Confirmado
              </div>
              {ing.qr_token && (
                <button
                  onClick={toggleQr}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {showQr ? "Fechar QR" : "Ver QR de entrada"}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                <Clock className="size-3.5" /> Aguardando pagamento
              </div>
              <a
                href={`/campeonatos/${ing.championship_id}/${ing.tipo === "atleta" ? "comprar" : "plateia"}/ingresso/${ing.ticket_id}${origem ? `?voltar=${origem}` : ""}`}
                className="text-xs font-medium text-blue-600 underline"
              >
                Ver pagamento
              </a>
            </div>
          )}
        </div>

        {showQr && qrData && (
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrData}
              alt="QR de entrada"
              width={180}
              height={180}
              className={`rounded-xl ${ing.checked_in ? "opacity-40 grayscale" : ""}`}
            />
          </div>
        )}
        {ing.checked_in && showQr && (
          <p className="mt-2 text-center text-xs font-semibold text-gray-400">Check-in já realizado</p>
        )}
      </div>
    </div>
  );
}
