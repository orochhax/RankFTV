"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, Lock, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  email: string;
  initialTelefone: string | null;
};

export function AccountSettingsForm({ userId, email, initialTelefone }: Props) {
  const supabase = createClient();

  // Telefone
  const [telefone, setTelefone] = useState(initialTelefone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Senha
  const [showPassForm, setShowPassForm] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    setSavingPhone(true);
    setPhoneError(null);
    setPhoneSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .update({ telefone: telefone.trim() || null })
      .eq("id", userId);

    setSavingPhone(false);
    if (error) {
      setPhoneError("Erro ao salvar. Tente novamente.");
    } else {
      setPhoneSuccess(true);
      setTimeout(() => setPhoneSuccess(false), 3000);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPassError(null);

    if (novaSenha.length < 6) {
      setPassError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirma) {
      setPassError("As senhas não coincidem.");
      return;
    }

    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingPass(false);

    if (error) {
      setPassError("Erro ao alterar senha. Tente novamente.");
    } else {
      setPassSuccess(true);
      setNovaSenha("");
      setConfirma("");
      setTimeout(() => {
        setPassSuccess(false);
        setShowPassForm(false);
      }, 2500);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-gray-500">Dados da conta</h2>

      <div className="mt-4 space-y-6">
        {/* E-mail — somente leitura */}
        <div>
          <p className="text-sm font-medium text-gray-700">E-mail</p>
          <div className="mt-1 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600 ring-1 ring-black/5">
            <Mail className="size-4 shrink-0 text-gray-400" />
            {email}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            O e-mail não pode ser alterado por aqui.
          </p>
        </div>

        {/* Telefone */}
        <form onSubmit={handleSavePhone}>
          <label className="block text-sm font-medium text-gray-700">
            Telefone de contato
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="+55 (11) 99999-9999"
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingPhone}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {savingPhone && <Loader2 className="size-4 animate-spin" />}
              {phoneSuccess && <Check className="size-4" />}
              {phoneSuccess ? "Salvo!" : "Salvar"}
            </button>
          </div>
          {phoneError && (
            <p className="mt-1.5 text-xs text-red-600">{phoneError}</p>
          )}
        </form>

        {/* Senha */}
        <div>
          <p className="text-sm font-medium text-gray-700">Senha</p>

          {!showPassForm ? (
            <button
              type="button"
              onClick={() => setShowPassForm(true)}
              className="mt-1.5 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <Lock className="size-4" /> Alterar senha
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="mt-2 space-y-3">
              {/* Nova senha */}
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Confirmar senha */}
              <input
                type={showPass ? "text" : "password"}
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                placeholder="Confirmar nova senha"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {passError && (
                <p className="text-xs text-red-600">{passError}</p>
              )}
              {passSuccess && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="size-3" /> Senha alterada com sucesso!
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingPass}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingPass && <Loader2 className="size-4 animate-spin" />}
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPassForm(false);
                    setPassError(null);
                    setNovaSenha("");
                    setConfirma("");
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
