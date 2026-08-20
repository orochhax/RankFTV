"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

type Address = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

type Props = {
  telefone: string;
  setTelefone: (value: string) => void;
  cep: string;
  setCep: (value: string) => void;
  numeroEndereco: string;
  setNumeroEndereco: (value: string) => void;
  complemento: string;
  setComplemento: (value: string) => void;
  inputCls: string;
  labelCls: string;
};

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function CardHolderContactFields({
  telefone,
  setTelefone,
  cep,
  setCep,
  numeroEndereco,
  setNumeroEndereco,
  complemento,
  setComplemento,
  inputCls,
  labelCls,
}: Props) {
  const cepDigits = cep.replace(/\D/g, "");
  const [lookup, setLookup] = useState<{
    cep: string;
    status: "loading" | "success" | "error";
    address?: Address;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (cepDigits.length !== 8) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookup({ cep: cepDigits, status: "loading" });
      try {
        const response = await fetch(`/api/cep/${cepDigits}`, {
          cache: "force-cache",
          signal: controller.signal,
        });
        const data = await response.json() as Address & { error?: string };
        if (!response.ok) {
          setLookup({ cep: cepDigits, status: "error", error: data.error ?? "CEP não encontrado." });
          return;
        }
        setLookup({ cep: cepDigits, status: "success", address: data });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setLookup({ cep: cepDigits, status: "error", error: "Não foi possível consultar o CEP agora." });
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cepDigits]);

  const currentLookup = lookup?.cep === cepDigits ? lookup : null;
  const address = currentLookup?.status === "success" ? currentLookup.address : null;

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Celular do titular (com DDD)</label>
        <input
          className={inputCls}
          placeholder="(00) 00000-0000"
          value={telefone}
          onChange={(event) => setTelefone(formatPhone(event.target.value))}
          inputMode="tel"
          autoComplete="tel"
          maxLength={15}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>CEP do titular</label>
          <input
            className={inputCls}
            placeholder="00000-000"
            value={cep}
            onChange={(event) => setCep(formatCep(event.target.value))}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Número do endereço</label>
          <input
            className={inputCls}
            placeholder="123"
            value={numeroEndereco}
            onChange={(event) => setNumeroEndereco(event.target.value.slice(0, 20))}
            autoComplete="address-line2"
            maxLength={20}
            required
          />
        </div>
      </div>

      {currentLookup?.status === "loading" && (
        <p className="flex items-center gap-1.5 text-xs text-gray-400" aria-live="polite">
          <Loader2 className="size-3.5 animate-spin" /> Consultando CEP…
        </p>
      )}
      {currentLookup?.status === "error" && (
        <p className="text-xs text-red-600" aria-live="polite">{currentLookup.error}</p>
      )}
      {address && (
        <div className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600 ring-1 ring-black/5">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-gray-400" />
          <span>
            {[address.street, address.neighborhood].filter(Boolean).join(" · ")}
            {(address.city || address.state) && (
              <span className="block text-gray-400">{[address.city, address.state].filter(Boolean).join("/")}</span>
            )}
          </span>
        </div>
      )}

      <div>
        <label className={labelCls}>Complemento do endereço (opcional)</label>
        <input
          className={inputCls}
          placeholder="Apartamento, bloco ou referência"
          value={complemento}
          onChange={(event) => setComplemento(event.target.value.slice(0, 60))}
          autoComplete="address-line2"
          maxLength={60}
        />
      </div>
    </div>
  );
}
