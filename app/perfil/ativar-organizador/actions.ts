"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validaCpfCnpj, idadeEm, soDigitos } from "@/lib/validacao";
import { validateUploadBytes } from "@/lib/upload-validation";
import { registrarAuditoria } from "@/lib/audit";
import { consultarCpfCnpjTitularPix } from "@/lib/asaas";
import { compararTitularidadePix } from "@/lib/pix";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

async function processKycUpload(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  prefix: string,
  file: File | null,
  fallbackUrl: string | null
): Promise<string | null> {
  if (!file || file.size === 0) {
    return fallbackUrl;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateUploadBytes(bytes, file.type, MAX_FILE_SIZE);
  if (!validation.ok) {
    throw new Error(`A foto de ${prefix} precisa ser uma imagem válida (JPEG, PNG ou WebP) de até 5MB.`);
  }

  const ext = validation.mimeType === "application/pdf" ? "pdf" : validation.mimeType.split("/")[1];
  const path = `${userId}/${prefix}_${Date.now()}.${ext}`;

  // Garante que o bucket existe
  try {
    await admin.storage.createBucket("organizer-kyc", {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    });
  } catch {
    // Bucket já criado
  }

  const { error: uploadError } = await admin.storage.from("organizer-kyc").upload(path, bytes, {
    contentType: validation.mimeType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Erro ao armazenar ${prefix}. Tente novamente.`);
  }

  return path;
}

export async function ativarOrganizador(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nomeCompleto = ((formData.get("nome_completo") as string) ?? "").trim();
  const cpfCnpj      = soDigitos((formData.get("cpf_cnpj") as string) ?? "");
  const nascimento   = ((formData.get("data_nascimento") as string) ?? "").trim();
  const telefone     = soDigitos((formData.get("telefone") as string) ?? "");
  const chavePix     = ((formData.get("chave_pix") as string) ?? "").trim();
  const documentoTipo = ((formData.get("documento_tipo") as string) ?? "").trim().toLowerCase();
  const documentoNumero = ((formData.get("documento_numero") as string) ?? "").trim();
  const nextUrl      = ((formData.get("next_url") as string) ?? "").trim();

  // Validações cadastrais
  if (nomeCompleto.split(/\s+/).length < 2 || nomeCompleto.length < 5) {
    return { error: "Informe seu nome civil completo (como no documento oficial)." };
  }
  if (!validaCpfCnpj(cpfCnpj)) {
    return { error: "Informe um CPF ou CNPJ válido." };
  }
  if (!nascimento || Number.isNaN(Date.parse(nascimento))) {
    return { error: "Informe sua data de nascimento." };
  }
  if (idadeEm(nascimento) < 18) {
    return { error: "Você precisa ter pelo menos 18 anos para organizar eventos." };
  }
  if (telefone.length < 10) {
    return { error: "Telefone celular inválido. Informe com DDD." };
  }
  if (!chavePix || chavePix.length < 4) {
    return { error: "Informe uma chave Pix válida para receber repasses." };
  }
  if (documentoTipo !== "cnh" && documentoTipo !== "rg") {
    return { error: "Selecione o tipo de documento (RG ou CNH)." };
  }
  if (documentoNumero.length < 4) {
    return { error: "Informe o número do documento." };
  }

  // Consulta de titularidade Pix para checagem primária
  const cpfCnpjTitular = await consultarCpfCnpjTitularPix(chavePix);
  const titularidade = compararTitularidadePix(cpfCnpjTitular, cpfCnpj);
  if (titularidade === "nao_confere") {
    return {
      error: "A chave Pix informada está cadastrada em nome de outro CPF/CNPJ. Use uma chave no seu próprio nome.",
    };
  }

  // Busca conta atual para manter fotos anteriores caso o organizador esteja apenas atualizando
  const admin = createAdminClient();
  const { data: contaAtual } = await admin
    .from("organizer_accounts")
    .select("documento_frente_url, documento_verso_url, selfie_url, status_verificacao")
    .eq("user_id", user.id)
    .maybeSingle();

  const fileFrente = formData.get("foto_frente") as File | null;
  const fileVerso  = formData.get("foto_verso") as File | null;
  const fileSelfie = formData.get("foto_selfie") as File | null;

  let frentePath: string | null = null;
  let versoPath: string | null = null;
  let selfiePath: string | null = null;

  try {
    frentePath = await processKycUpload(admin, user.id, "frente", fileFrente, contaAtual?.documento_frente_url ?? null);
    versoPath  = await processKycUpload(admin, user.id, "verso", fileVerso, contaAtual?.documento_verso_url ?? null);
    selfiePath = await processKycUpload(admin, user.id, "selfie", fileSelfie, contaAtual?.selfie_url ?? null);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no envio dos arquivos.";
    return { error: msg };
  }

  if (!frentePath) {
    return { error: "Envie a foto da frente do seu documento (RG ou CNH)." };
  }
  if (!versoPath) {
    return { error: "Envie a foto do verso do seu documento (RG ou CNH)." };
  }
  if (!selfiePath) {
    return { error: "Envie uma selfie segurando seu documento ao lado do rosto." };
  }

  const agora = new Date().toISOString();

  const { error: dbError } = await admin
    .from("organizer_accounts")
    .upsert(
      {
        user_id: user.id,
        nome_completo: nomeCompleto,
        cpf_cnpj: cpfCnpj,
        data_nascimento: nascimento,
        telefone,
        chave_pix: chavePix,
        chave_pix_atualizada_em: agora,
        documento_tipo: documentoTipo,
        documento_numero: documentoNumero,
        documento_frente_url: frentePath,
        documento_verso_url: versoPath,
        selfie_url: selfiePath,
        status_verificacao: "em_analise",
        motivo_rejeicao: null,
        submetido_em: agora,
        habilitado: false, // liberação exclusiva do CEO após checagem
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    return { error: "Erro ao salvar os dados e documentos. Tente novamente." };
  }

  await registrarAuditoria({
    actorId: user.id,
    acao: "organizador_kyc_submetido",
    alvoTabela: "organizer_accounts",
    alvoId: user.id,
    detalhes: {
      cpfCnpj,
      documentoTipo,
      chavePix,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/perfil/ativar-organizador");
  revalidatePath("/painel");

  if (nextUrl && nextUrl.startsWith("/")) {
    redirect(nextUrl);
  } else {
    redirect("/painel");
  }
}
