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
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-brand-soft">
        <MailCheck className="size-8 text-brand" />
      </div>

      <h1 className="text-2xl font-bold text-ink">Verifique seu e-mail</h1>

      <p className="mt-3 text-sm text-ink-muted">
        Enviamos um link de confirmação para{" "}
        {email ? (
          <span className="font-semibold text-ink">{email}</span>
        ) : (
          "seu e-mail"
        )}
        . Clique no link para ativar sua conta.
      </p>

      <p className="mt-4 text-xs text-ink-muted/80">
        Não recebeu? Verifique a pasta de spam ou{" "}
        <Link href="/cadastro" className="text-brand-ink hover:text-brand hover:underline">
          tente novamente
        </Link>
        .
      </p>

      <div className="mt-8">
        <Link
          href="/login"
          className="text-sm font-medium text-brand-ink hover:text-brand hover:underline"
        >
          Já confirmei — ir para o login
        </Link>
      </div>
    </div>
  );
}
