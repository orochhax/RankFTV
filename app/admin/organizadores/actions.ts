"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { registrarAuditoria } from "@/lib/audit";
import { MOTIVOS_REJEICAO_PREDEFINIDOS, type StatusVerificacaoOrganizador } from "@/lib/organizer-kyc";

export type OrganizadorKycItem = {
  id: string;
  userId: string;
  nome: string;
  username: string;
  email: string | null;
  nomeCompleto: string | null;
  cpfCnpj: string | null;
  dataNascimento: string | null;
  telefone: string;
  chavePix: string | null;
  documentoTipo: string | null;
  documentoNumero: string | null;
  documentoFrenteUrl: string | null;
  documentoVersoUrl: string | null;
  selfieUrl: string | null;
  statusVerificacao: StatusVerificacaoOrganizador;
  motivoRejeicao: string | null;
  submetidoEm: string | null;
  aprovadoEm: string | null;
  aprovadoPor: string | null;
  createdAt: string | null;
};

export async function listarOrganizadoresKyc(): Promise<{
  ok: boolean;
  organizadores?: OrganizadorKycItem[];
  error?: string;
}> {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);

  if (!user || !isCeo(role)) {
    return { ok: false, error: "Acesso restrito ao CEO." };
  }

  const admin = createAdminClient();
  const { data: accounts, error } = await admin
    .from("organizer_accounts")
    .select(`
      id,
      user_id,
      nome_completo,
      cpf_cnpj,
      data_nascimento,
      telefone,
      chave_pix,
      documento_tipo,
      documento_numero,
      documento_frente_url,
      documento_verso_url,
      selfie_url,
      status_verificacao,
      motivo_rejeicao,
      submetido_em,
      aprovado_em,
      aprovado_por,
      created_at
    `)
    .order("submetido_em", { ascending: false, nullsFirst: false });

  if (error) {
    return { ok: false, error: "Erro ao buscar organizadores." };
  }

  const userIds = (accounts ?? []).map((a) => a.user_id);
  const { data: profiles } = userIds.length > 0
    ? await admin.from("profiles").select("id, nome, username").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Buscar e-mails do auth se necessário
  const items: OrganizadorKycItem[] = (accounts ?? []).map((acc) => {
    const prof = profileMap.get(acc.user_id);
    return {
      id: acc.id,
      userId: acc.user_id,
      nome: prof?.nome ?? "Organizador",
      username: prof?.username ?? "usuario",
      email: null,
      nomeCompleto: acc.nome_completo,
      cpfCnpj: acc.cpf_cnpj,
      dataNascimento: acc.data_nascimento,
      telefone: acc.telefone,
      chavePix: acc.chave_pix,
      documentoTipo: acc.documento_tipo,
      documentoNumero: acc.documento_numero,
      documentoFrenteUrl: acc.documento_frente_url,
      documentoVersoUrl: acc.documento_verso_url,
      selfieUrl: acc.selfie_url,
      statusVerificacao: (acc.status_verificacao || "pendente_documentos") as StatusVerificacaoOrganizador,
      motivoRejeicao: acc.motivo_rejeicao,
      submetidoEm: acc.submetido_em,
      aprovadoEm: acc.aprovado_em,
      aprovadoPor: acc.aprovado_por,
      createdAt: acc.created_at,
    };
  });

  return { ok: true, organizadores: items };
}

export async function obterUrlsDocumentosKyc(organizerAccountId: string): Promise<{
  ok: boolean;
  frenteSignedUrl?: string | null;
  versoSignedUrl?: string | null;
  selfieSignedUrl?: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);

  if (!user || !isCeo(role)) {
    return { ok: false, error: "Acesso restrito ao CEO." };
  }

  const admin = createAdminClient();
  const { data: acc } = await admin
    .from("organizer_accounts")
    .select("documento_frente_url, documento_verso_url, selfie_url")
    .eq("id", organizerAccountId)
    .maybeSingle();

  if (!acc) {
    return { ok: false, error: "Conta de organizador não encontrada." };
  }

  const [frenteRes, versoRes, selfieRes] = await Promise.all([
    acc.documento_frente_url
      ? admin.storage.from("organizer-kyc").createSignedUrl(acc.documento_frente_url, 900)
      : Promise.resolve({ data: null }),
    acc.documento_verso_url
      ? admin.storage.from("organizer-kyc").createSignedUrl(acc.documento_verso_url, 900)
      : Promise.resolve({ data: null }),
    acc.selfie_url
      ? admin.storage.from("organizer-kyc").createSignedUrl(acc.selfie_url, 900)
      : Promise.resolve({ data: null }),
  ]);

  return {
    ok: true,
    frenteSignedUrl: frenteRes.data?.signedUrl ?? null,
    versoSignedUrl: versoRes.data?.signedUrl ?? null,
    selfieSignedUrl: selfieRes.data?.signedUrl ?? null,
  };
}

export async function aprovarOrganizadorKyc(organizerAccountId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);

  if (!user || !isCeo(role)) {
    return { ok: false, error: "Acesso restrito ao CEO." };
  }

  const admin = createAdminClient();
  const agora = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("organizer_accounts")
    .update({
      status_verificacao: "aprovado",
      habilitado: true,
      aprovado_por: user.id,
      aprovado_em: agora,
      motivo_rejeicao: null,
    })
    .eq("id", organizerAccountId)
    .select("user_id, cpf_cnpj")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: "Erro ao aprovar organizador." };
  }

  await registrarAuditoria({
    actorId: user.id,
    acao: "organizador_kyc_aprovado",
    alvoTabela: "organizer_accounts",
    alvoId: organizerAccountId,
    detalhes: {
      organizadorUserId: updated.user_id,
      cpfCnpj: updated.cpf_cnpj,
    },
  });

  revalidatePath("/admin/organizadores");
  revalidatePath("/painel");
  return { ok: true };
}

export async function rejeitarOrganizadorKyc(
  organizerAccountId: string,
  motivoPredefinido: string,
  observacaoAdicional?: string
): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);

  if (!user || !isCeo(role)) {
    return { ok: false, error: "Acesso restrito ao CEO." };
  }

  const motivoTrim = motivoPredefinido.trim();
  const obsTrim = observacaoAdicional?.trim() ?? "";

  let motivoFinal = motivoTrim;
  if (motivoTrim === "Outro motivo (especificar)") {
    if (!obsTrim) {
      return { ok: false, error: "Por favor, especifique o motivo da rejeição." };
    }
    motivoFinal = obsTrim;
  } else if (obsTrim) {
    motivoFinal = `${motivoTrim}. Observação: ${obsTrim}`;
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("organizer_accounts")
    .update({
      status_verificacao: "rejeitado",
      habilitado: false,
      motivo_rejeicao: motivoFinal,
      aprovado_por: null,
      aprovado_em: null,
    })
    .eq("id", organizerAccountId)
    .select("user_id, cpf_cnpj")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: "Erro ao rejeitar organizador." };
  }

  await registrarAuditoria({
    actorId: user.id,
    acao: "organizador_kyc_rejeitado",
    alvoTabela: "organizer_accounts",
    alvoId: organizerAccountId,
    detalhes: {
      organizadorUserId: updated.user_id,
      cpfCnpj: updated.cpf_cnpj,
      motivo: motivoFinal,
    },
  });

  revalidatePath("/admin/organizadores");
  revalidatePath("/painel");
  return { ok: true };
}
