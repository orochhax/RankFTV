import Link from "next/link";
import { MailCheck } from "lucide-react";

export default async function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-blue-100">
        <MailCheck className="size-8 text-blue-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Verifique seu e-mail</h1>

      <p className="mt-3 text-sm text-gray-500">
        Enviamos um link de confirmação para{" "}
        {email ? (
          <span className="font-semibold text-gray-700">{email}</span>
        ) : (
          "seu e-mail"
        )}
        . Clique no link para ativar sua conta.
      </p>

      <p className="mt-4 text-xs text-gray-400">
        Não recebeu? Verifique a pasta de spam ou{" "}
        <Link href="/cadastro" className="text-blue-600 hover:underline">
          tente novamente
        </Link>
        .
      </p>

      <div className="mt-8">
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Já confirmei — ir para o login
        </Link>
      </div>
    </div>
  );
}
