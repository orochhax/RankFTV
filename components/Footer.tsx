import Link from "next/link";

// Rodapé simples — também serve pra deixar /cadastro e /login alcançáveis
// (a navbar, por decisão do ftv.md 8.1, não tem item de login/cadastro).
export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white px-6 py-6 pb-24 text-center text-sm text-gray-500 md:pb-6">
      <p>RankFTV — protótipo visual, dados fictícios.</p>
      <p className="mt-1">
        <Link href="/cadastro" className="hover:underline">
          Criar conta
        </Link>
        {" · "}
        <Link href="/login" className="hover:underline">
          Entrar
        </Link>
      </p>
    </footer>
  );
}
