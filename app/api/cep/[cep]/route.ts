type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ cep: string }> },
) {
  const { cep: rawCep } = await context.params;
  const cep = rawCep.replace(/\D/g, "");

  if (cep.length !== 8) {
    return Response.json({ error: "CEP inválido." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { accept: "application/json" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("viacep_unavailable");

    const data = await response.json() as ViaCepResponse;
    if (data.erro) {
      return Response.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    return Response.json({
      street: data.logradouro?.trim() ?? "",
      neighborhood: data.bairro?.trim() ?? "",
      city: data.localidade?.trim() ?? "",
      state: data.uf?.trim() ?? "",
    }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return Response.json({ error: "Não foi possível consultar o CEP agora." }, { status: 502 });
  }
}
