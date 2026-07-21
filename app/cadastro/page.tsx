"use client";

import { Suspense, useRef, useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validaCpfCnpj, idadeEm, soDigitos } from "@/lib/validacao";
import type { Genero } from "@/lib/types";
import Turnstile, { type TurnstileHandle } from "@/components/auth/Turnstile";

// Quando a site key existe, o Supabase está com captcha ligado e exige o token.
const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const GENEROS: { valor: Genero; texto: string }[] = [
  { valor: "masculino", texto: "Masculino" },
  { valor: "feminino", texto: "Feminino" },
  { valor: "outro", texto: "Outro" },
];

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const modoOrganizador = searchParams.get("modo") === "organizador";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [username, setUsername] = useState("");
  const [genero, setGenero] = useState<Genero | "">("");
  const [usernameStatus, setUsernameStatus] = useState<
    "checking" | "ok" | "taken"
  >("checking");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  // Só coletados quando vem do fluxo "organizar evento" sem conta ainda.
  const [telefone, setTelefone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [nascimento, setNascimento] = useState("");

  const usernameBasicoStatus =
    !username ? "idle" : /^[a-z0-9_.]{3,30}$/.test(username) ? null : "invalid";
  const statusUsername = usernameBasicoStatus ?? usernameStatus;

  // Verifica @username em tempo real contra o banco real
  useEffect(() => {
    if (usernameBasicoStatus) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("username", username).maybeSingle();
      setUsernameStatus(profile ? "taken" : "ok");
    }, 400);
    return () => clearTimeout(timer);
  }, [supabase, username, usernameBasicoStatus]);

  const canSubmit =
    nome.trim().length > 0 &&
    email.trim().length > 0 &&
    senha.length >= 8 &&
    statusUsername === "ok" &&
    !!genero &&
    (!modoOrganizador || (telefone.trim().length > 0 && cpfCnpj.trim().length > 0 && nascimento.trim().length > 0)) &&
    (!captchaEnabled || !!captchaToken) &&
    !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErro(null);

    // Validações extras só valem no fluxo de cadastro direto como organizador.
    if (modoOrganizador) {
      const telefoneDigits = soDigitos(telefone);
      const cpfCnpjDigits = soDigitos(cpfCnpj);
      if (telefoneDigits.length < 10) {
        setErro("Informe um celular válido com DDD.");
        return;
      }
      if (!validaCpfCnpj(cpfCnpjDigits)) {
        setErro("Informe um CPF ou CNPJ válido.");
        return;
      }
      if (Number.isNaN(Date.parse(nascimento)) || idadeEm(nascimento) < 18) {
        setErro("Você precisa ter pelo menos 18 anos para organizar eventos.");
        return;
      }
    }

    setLoading(true);

    const metadata: Record<string, string> = { nome, username, genero };
    if (modoOrganizador) {
      metadata.modo = "organizador";
      metadata.telefone = soDigitos(telefone);
      metadata.cpf_cnpj = soDigitos(cpfCnpj);
      metadata.data_nascimento = nascimento;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    const requestedNext = searchParams.get("next");
    const safeNext =
      requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : null;
    if (modoOrganizador) callbackUrl.searchParams.set("next", "/painel/novo-campeonato");
    else if (safeNext) callbackUrl.searchParams.set("next", safeNext);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: metadata,
        emailRedirectTo: callbackUrl.toString(),
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) {
      const msg = error.message || "";
      setErro(
        msg.includes("already registered")
          ? "Esse e-mail já está cadastrado."
          : msg.includes("sending") || msg === "{}"
          ? "Erro ao enviar o e-mail de confirmação. Verifique as configurações de SMTP."
          : msg || "Erro ao criar conta. Tente novamente."
      );
      setLoading(false);
      // Token é de uso único: gera um novo pra próxima tentativa.
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } else {
      router.push(`/cadastro/verificar-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">
        {modoOrganizador ? "Criar conta de organizador" : "Criar conta"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {modoOrganizador
          ? "Precisamos desses dados pra liberar a criação de campeonatos."
          : "Só o essencial pra começar — o resto você completa depois, quando precisar."}
      </p>

      {erro && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="nome"
            name="name"
            type="text"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            @usuário
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              @
            </span>
            <input
              id="username"
              name="username"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-8 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="seu.usuario"
            />
            {statusUsername === "checking" && (
              <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
            {statusUsername === "ok" && (
              <CheckCircle2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-blue-500" />
            )}
            {(statusUsername === "taken" || statusUsername === "invalid") && (
              <XCircle className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-red-500" />
            )}
          </div>
          {statusUsername === "taken" && (
            <p className="mt-1 text-xs text-red-600">Esse @usuário já existe — escolha outro.</p>
          )}
          {statusUsername === "invalid" && (
            <p className="mt-1 text-xs text-red-600">
              Só letras minúsculas, números, . e _ (mínimo 3 caracteres)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="voce@email.com"
          />
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <div className="relative mt-1">
            <input
              id="senha"
              name="new-password"
              type={mostrarSenha ? "text" : "password"}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-gray-700">Gênero</legend>
          <div className="grid grid-cols-3 gap-2">
            {GENEROS.map((opcao) => (
              <label
                key={opcao.valor}
                className="flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="genero"
                  value={opcao.valor}
                  checked={genero === opcao.valor}
                  onChange={() => setGenero(opcao.valor)}
                  className="sr-only"
                />
                {opcao.texto}
              </label>
            ))}
          </div>
        </fieldset>

        {modoOrganizador && (
          <>
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                Celular (com DDD)
              </label>
              <input
                id="telefone"
                name="tel"
                type="tel"
                autoComplete="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="(11) 99999-8888"
              />
            </div>

            <div>
              <label htmlFor="cpfCnpj" className="block text-sm font-medium text-gray-700">
                CPF ou CNPJ
              </label>
              <input
                id="cpfCnpj"
                name="cpf-cnpj"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Só números"
              />
            </div>

            <div>
              <label htmlFor="nascimento" className="block text-sm font-medium text-gray-700">
                Data de nascimento
              </label>
              <input
                id="nascimento"
                name="bday"
                type="date"
                autoComplete="bday"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                No CNPJ, use a data de nascimento do responsável.
              </p>
            </div>
          </>
        )}

        <Turnstile ref={captchaRef} onToken={setCaptchaToken} />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}
