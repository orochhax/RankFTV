"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addMonthsToDate, parseBRLInput, splitAmountEqually, SEM_CATEGORIA,
  type InvestmentYieldMode, type Person, type PersonSelecao, type RecurrenceDayMode,
} from "@/lib/personal-finance";
import { buildInstallmentDrafts } from "@/lib/personal-finance-purchase";

type Res = { ok: boolean; error?: string };

const PERSONS = ["carlos", "julia"];
const PERSON_SELECAO = ["carlos", "julia", "carlos_e_julia"];
const TYPES = ["gasto", "renda", "investimento"];
const BANKS = ["inter", "c6", "mercado_pago", "nubank", "vale"];
const METHODS = ["credito", "debito", "pix"];

// Só o CEO (ADMIN_EMAIL) mexe no controle financeiro pessoal — igual /admin/performance.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return { supabase, user };
}

function reval() {
  revalidatePath("/admin/gastos");
}

// ── Validação compartilhada entre criar/editar ──────────────────────────────

type CamposComuns = {
  name: string; category: string; entryDate: string;
  type: string; bank: string; paymentMethod: string;
};

function validarCamposComuns(formData: FormData): { ok: true; campos: CamposComuns } | { ok: false; error: string } {
  const name = ((formData.get("name") as string) ?? "").trim();
  const category = ((formData.get("category") as string) ?? "").trim();
  const entryDate = ((formData.get("entry_date") as string) ?? "").trim();
  const type = formData.get("type") as string;
  const bank = formData.get("bank") as string;
  const paymentMethod = formData.get("payment_method") as string;

  if (!name) return { ok: false, error: "Informe um nome." };
  if (!category) return { ok: false, error: "Informe uma categoria." };
  if (!entryDate || Number.isNaN(Date.parse(entryDate))) return { ok: false, error: "Informe uma data válida." };
  if (!TYPES.includes(type)) return { ok: false, error: "Tipo inválido." };
  if (!BANKS.includes(bank)) return { ok: false, error: "Banco inválido." };
  if (!METHODS.includes(paymentMethod)) return { ok: false, error: "Forma de pagamento inválida." };

  return { ok: true, campos: { name, category, entryDate, type, bank, paymentMethod } };
}

/** Pessoa do formulário de criação — aceita "carlos_e_julia" (nunca salvo assim no banco). */
function validarPessoaSelecao(formData: FormData): { ok: true; pessoaSelecao: PersonSelecao } | { ok: false; error: string } {
  const person = formData.get("person") as string;
  if (!PERSON_SELECAO.includes(person)) return { ok: false, error: "Selecione a pessoa." };
  return { ok: true, pessoaSelecao: person as PersonSelecao };
}

/** Pessoa de um lançamento já existente — sempre uma única pessoa (carlos ou julia). */
function validarPessoaUnica(formData: FormData): { ok: true; person: Person } | { ok: false; error: string } {
  const person = formData.get("person") as string;
  if (!PERSONS.includes(person)) return { ok: false, error: "Selecione a pessoa." };
  return { ok: true, person: person as Person };
}

type Valores = { total: number; carlos: number | null; julia: number | null };

/**
 * Resolve o(s) valor(es) do lançamento. Pra pessoa única, é só o campo
 * "amount". Pra "Carlos e Julia", recalcula no servidor (nunca confia só no
 * estado React): modo "igual" divide o total sem perder centavo
 * (splitAmountEqually); modo "personalizado" lê amount_carlos/amount_julia
 * direto, cada um precisa ser > 0.
 */
function resolverValores(formData: FormData, pessoaSelecao: PersonSelecao): { ok: true; valores: Valores } | { ok: false; error: string } {
  if (pessoaSelecao !== "carlos_e_julia") {
    const amount = parseBRLInput((formData.get("amount") as string) ?? "");
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "O valor precisa ser maior que zero." };
    return {
      ok: true,
      valores: {
        total: amount,
        carlos: pessoaSelecao === "carlos" ? amount : null,
        julia: pessoaSelecao === "julia" ? amount : null,
      },
    };
  }

  const splitMode = formData.get("split_mode") as string; // "igual" | "personalizado"
  if (splitMode === "personalizado") {
    const carlos = parseBRLInput((formData.get("amount_carlos") as string) ?? "");
    const julia = parseBRLInput((formData.get("amount_julia") as string) ?? "");
    if (!Number.isFinite(carlos) || carlos <= 0) return { ok: false, error: "O valor de Carlos precisa ser maior que zero." };
    if (!Number.isFinite(julia) || julia <= 0) return { ok: false, error: "O valor de Julia precisa ser maior que zero." };
    return { ok: true, valores: { total: carlos + julia, carlos, julia } };
  }

  const total = parseBRLInput((formData.get("amount") as string) ?? "");
  if (!Number.isFinite(total) || total <= 0) return { ok: false, error: "O valor precisa ser maior que zero." };
  const { carlos, julia } = splitAmountEqually(total);
  return { ok: true, valores: { total, carlos, julia } };
}

type CamposInvestimento = {
  investmentYieldMode: InvestmentYieldMode | null;
  investmentCdiPercent: number | null;
};

// Regra de rendimento só existe (e só é validada) pra type === "investimento".
// Renda e gasto sempre saem com os dois campos null.
function validarCamposInvestimento(
  formData: FormData,
  type: string,
): { ok: true; campos: CamposInvestimento } | { ok: false; error: string } {
  if (type !== "investimento") {
    return { ok: true, campos: { investmentYieldMode: null, investmentCdiPercent: null } };
  }

  const yieldMode = formData.get("investment_yield_mode") as string;
  if (yieldMode !== "single_cdi" && yieldMode !== "mercado_pago_tiered") {
    return { ok: false, error: "Selecione a regra de rendimento do investimento." };
  }

  if (yieldMode === "mercado_pago_tiered") {
    return { ok: true, campos: { investmentYieldMode: "mercado_pago_tiered", investmentCdiPercent: null } };
  }

  const cdiPercent = parseBRLInput((formData.get("investment_cdi_percent") as string) ?? "");
  if (!Number.isFinite(cdiPercent) || cdiPercent <= 0 || cdiPercent > 1000) {
    return { ok: false, error: "Informe um percentual do CDI válido (ex: 100, 105, 110, 120)." };
  }

  return { ok: true, campos: { investmentYieldMode: "single_cdi", investmentCdiPercent: cdiPercent } };
}

type CamposDia = { recurrenceDayMode: RecurrenceDayMode | null; recurrenceDay: number | null };

/** "Quando lançar" — só existe (e só é validado) pra lançamento fixo (isRecurring). */
function validarRecorrenciaDia(formData: FormData, isRecurring: boolean): { ok: true; campos: CamposDia } | { ok: false; error: string } {
  if (!isRecurring) return { ok: true, campos: { recurrenceDayMode: null, recurrenceDay: null } };

  const mode = formData.get("recurrence_day_mode") as string;
  if (mode !== "calendar_day" && mode !== "business_day") {
    return { ok: false, error: "Selecione quando o lançamento fixo cai no mês." };
  }

  const day = parseInt((formData.get("recurrence_day") as string) ?? "", 10);
  const max = mode === "business_day" ? 23 : 31;
  if (!Number.isInteger(day) || day < 1 || day > max) {
    return {
      ok: false,
      error: mode === "business_day" ? "Escolha um dia útil entre o 1º e o 23º." : "Escolha um dia do mês entre 1 e 31.",
    };
  }

  return { ok: true, campos: { recurrenceDayMode: mode, recurrenceDay: day } };
}

// ── Lançamentos ──────────────────────────────────────────────────────────────

export async function criarLancamento(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const validado = validarCamposComuns(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { name, category, entryDate, type, bank, paymentMethod } = validado.campos;

  const validadoPessoa = validarPessoaSelecao(formData);
  if (!validadoPessoa.ok) return { ok: false, error: validadoPessoa.error };
  const { pessoaSelecao } = validadoPessoa;
  const compartilhado = pessoaSelecao === "carlos_e_julia";

  const validadoInvest = validarCamposInvestimento(formData, type);
  if (!validadoInvest.ok) return { ok: false, error: validadoInvest.error };
  const { investmentYieldMode, investmentCdiPercent } = validadoInvest.campos;

  const isInstallment = formData.get("is_installment") === "true" || formData.get("is_installment") === "on";
  const installmentTotalRaw = formData.get("installment_total") as string;
  // Fixo (recorrente, sem término — ex: salário) é exclusivo com parcelamento.
  const isRecurring = formData.get("is_recurring") === "true" || formData.get("is_recurring") === "on";

  if (isRecurring && isInstallment) {
    return { ok: false, error: "Um lançamento não pode ser fixo e parcelado ao mesmo tempo." };
  }
  if (type === "investimento" && isInstallment) {
    return { ok: false, error: "Investimento não pode ser parcelado — use pontual ou fixo." };
  }

  const validadoValores = resolverValores(formData, pessoaSelecao);
  if (!validadoValores.ok) return { ok: false, error: validadoValores.error };
  const valores = validadoValores.valores;

  const validadoDia = validarRecorrenciaDia(formData, isRecurring);
  if (!validadoDia.ok) return { ok: false, error: validadoDia.error };
  const { recurrenceDayMode, recurrenceDay } = validadoDia.campos;

  const installmentTotal = isInstallment && !isRecurring ? parseInt(installmentTotalRaw ?? "", 10) : 1;
  if (!Number.isInteger(installmentTotal) || installmentTotal < 1 || installmentTotal > 120) {
    return { ok: false, error: "Quantidade de parcelas inválida (1 a 120)." };
  }

  const pessoas: { person: Person; amount: number }[] = compartilhado
    ? [{ person: "carlos", amount: valores.carlos! }, { person: "julia", amount: valores.julia! }]
    : [{ person: pessoaSelecao as Person, amount: valores.total }];
  const sharedGroupId = compartilhado ? crypto.randomUUID() : null;

  // Fixo é uma única linha por pessoa, aplicada "virtualmente" todo mês na
  // hora de agregar (ver lib/personal-finance.ts) — não gera N lançamentos
  // como o parcelamento. Quando compartilhado, os dois ficam ligados pelo
  // mesmo shared_entry_group_id, mas continuam sendo fixos independentes.
  if (isRecurring) {
    const rows = pessoas.map((p) => ({
      user_id:        user.id,
      person:         p.person,
      name, category,
      entry_date:     entryDate,
      amount:         p.amount,
      type,
      bank,
      payment_method: paymentMethod,
      is_recurring:   true,
      recurrence_day_mode: recurrenceDayMode,
      recurrence_day:      recurrenceDay,
      investment_yield_mode:  investmentYieldMode,
      investment_cdi_percent: investmentCdiPercent,
      shared_entry_group_id:  sharedGroupId,
    }));
    const { error: recError } = await supabase.from("personal_finance_entries").insert(rows);
    if (recError) return { ok: false, error: recError.message };
    reval();
    return { ok: true };
  }

  const parcelado = isInstallment && installmentTotal > 1;

  // Parcelado usa o valor total digitado. Em compras compartilhadas, cada pessoa tem seu grupo de parcelas e cada mes tem um shared_entry_group_id proprio.
  if (parcelado) {
    const drafts = buildInstallmentDrafts({
      allocations: pessoas,
      installmentTotal,
      firstDateISO: entryDate,
      idFactory: () => crypto.randomUUID(),
    });
    const rows = drafts.map((draft) => ({
      user_id:              user.id,
      person:               draft.person,
      name,
      category,
      entry_date:           draft.entryDate,
      amount:               draft.amount,
      type,
      bank,
      payment_method:       paymentMethod,
      is_installment:       true,
      installment_group_id: draft.installmentGroupId,
      installment_number:   draft.installmentNumber,
      installment_total:    draft.installmentTotal,
      investment_yield_mode:  investmentYieldMode,
      investment_cdi_percent: investmentCdiPercent,
      shared_entry_group_id:  draft.sharedEntryGroupId,
    }));
    const { error } = await supabase.from("personal_finance_entries").insert(rows);
    if (error) return { ok: false, error: error.message };
    reval();
    return { ok: true };
  }

  // Normal (não fixo, não parcelado) — 1 linha, ou 2 linhas ligadas por shared_entry_group_id.
  const rows = pessoas.map((p) => ({
    user_id:        user.id,
    person:         p.person,
    name, category,
    entry_date:     entryDate,
    amount:         p.amount,
    type,
    bank,
    payment_method: paymentMethod,
    investment_yield_mode:  investmentYieldMode,
    investment_cdi_percent: investmentCdiPercent,
    shared_entry_group_id:  sharedGroupId,
  }));
  const { error } = await supabase.from("personal_finance_entries").insert(rows);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

type OriginalRow = {
  id: string;
  person: Person;
  is_installment: boolean;
  installment_group_id: string | null;
  installment_number: number;
  installment_total: number;
  is_recurring: boolean;
  shared_entry_group_id: string | null;
};

export async function editarLancamento(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const entryId = formData.get("entry_id") as string;
  if (!entryId) return { ok: false, error: "Lançamento inválido." };

  const validado = validarCamposComuns(formData);
  if (!validado.ok) return { ok: false, error: validado.error };
  const { name, category, entryDate, type, bank, paymentMethod } = validado.campos;

  const validadoInvest = validarCamposInvestimento(formData, type);
  if (!validadoInvest.ok) return { ok: false, error: validadoInvest.error };
  const { investmentYieldMode, investmentCdiPercent } = validadoInvest.campos;

  const { data: original } = await supabase
    .from("personal_finance_entries")
    .select("id, person, is_installment, installment_group_id, installment_number, installment_total, is_recurring, shared_entry_group_id")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle<OriginalRow>();
  if (!original) return { ok: false, error: "Lançamento não encontrado." };

  const validadoDia = validarRecorrenciaDia(formData, original.is_recurring);
  if (!validadoDia.ok) return { ok: false, error: validadoDia.error };
  const { recurrenceDayMode, recurrenceDay } = validadoDia.campos;

  const escopoPessoa = (formData.get("escopo_pessoa") as string) || "esta"; // "esta" | "ambos"
  const ehAmbos = original.shared_entry_group_id != null && escopoPessoa === "ambos";

  // ── Editar Carlos e Julia juntos (lançamento compartilhado) ─────────────
  if (ehAmbos) {
    const validadoValores = resolverValores(formData, "carlos_e_julia");
    if (!validadoValores.ok) return { ok: false, error: validadoValores.error };
    const valores = validadoValores.valores;

    const { data: siblingRow } = await supabase
      .from("personal_finance_entries")
      .select("id, person")
      .eq("shared_entry_group_id", original.shared_entry_group_id)
      .eq("user_id", user.id)
      .neq("id", entryId)
      .maybeSingle<{ id: string; person: Person }>();
    if (!siblingRow) return { ok: false, error: "Lançamento compartilhado não encontrado." };

    const valorPorPessoa = (person: Person) => (person === "carlos" ? valores.carlos! : valores.julia!);
    const alvos = [{ id: entryId, person: original.person }, { id: siblingRow.id, person: siblingRow.person }];

    if (original.is_recurring) {
      const escopoFixo = formData.get("escopo_fixo") as string; // "este_mes" | "todos_os_meses"

      if (escopoFixo === "este_mes") {
        const monthKey = formData.get("month_key") as string;
        if (!monthKey) return { ok: false, error: "Mês inválido." };
        for (const alvo of alvos) {
          const { error } = await supabase.from("personal_finance_recurring_overrides").upsert(
            {
              user_id:            user.id,
              recurring_entry_id: alvo.id,
              month_key:          monthKey,
              name, category,
              entry_date:         entryDate,
              amount:             valorPorPessoa(alvo.person),
              type, bank,
              payment_method:     paymentMethod,
              recurrence_day_mode: recurrenceDayMode,
              recurrence_day:      recurrenceDay,
              investment_yield_mode:  investmentYieldMode,
              investment_cdi_percent: investmentCdiPercent,
              deleted:            false,
              updated_at:         new Date().toISOString(),
            },
            { onConflict: "user_id,recurring_entry_id,month_key" },
          );
          if (error) return { ok: false, error: error.message };
        }
        reval();
        return { ok: true };
      }

      // "todos_os_meses" — atualiza as duas linhas originais.
      for (const alvo of alvos) {
        const { error } = await supabase
          .from("personal_finance_entries")
          .update({
            name, category,
            entry_date: entryDate,
            amount: valorPorPessoa(alvo.person),
            type, bank,
            payment_method: paymentMethod,
            recurrence_day_mode: recurrenceDayMode,
            recurrence_day: recurrenceDay,
            investment_yield_mode: investmentYieldMode,
            investment_cdi_percent: investmentCdiPercent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", alvo.id)
          .eq("user_id", user.id);
        if (error) return { ok: false, error: error.message };
      }
      reval();
      return { ok: true };
    }

    // Normal compartilhado (não fixo — combinação com parcela é bloqueada na criação).
    for (const alvo of alvos) {
      const { error } = await supabase
        .from("personal_finance_entries")
        .update({
          name, category,
          entry_date: entryDate,
          amount: valorPorPessoa(alvo.person),
          type, bank,
          payment_method: paymentMethod,
          investment_yield_mode: investmentYieldMode,
          investment_cdi_percent: investmentCdiPercent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alvo.id)
        .eq("user_id", user.id);
      if (error) return { ok: false, error: error.message };
    }
    reval();
    return { ok: true };
  }

  // ── Editar somente este lançamento ───────────────────────────────────────
  const validadoPessoa = validarPessoaUnica(formData);
  if (!validadoPessoa.ok) return { ok: false, error: validadoPessoa.error };
  const { person } = validadoPessoa;

  const validadoValores = resolverValores(formData, person);
  if (!validadoValores.ok) return { ok: false, error: validadoValores.error };
  const amount = validadoValores.valores.total;

  const camposComuns = {
    person, name, category,
    entry_date: entryDate,
    amount, type, bank,
    payment_method: paymentMethod,
    recurrence_day_mode: recurrenceDayMode,
    recurrence_day: recurrenceDay,
    investment_yield_mode:  investmentYieldMode,
    investment_cdi_percent: investmentCdiPercent,
    updated_at: new Date().toISOString(),
  };

  // ── Fixo/recorrente ──────────────────────────────────────────────────────
  if (original.is_recurring) {
    const escopoFixo = formData.get("escopo_fixo") as string; // "este_mes" | "todos_os_meses"

    if (escopoFixo === "este_mes") {
      const monthKey = formData.get("month_key") as string;
      if (!monthKey) return { ok: false, error: "Mês inválido." };
      const { error } = await supabase.from("personal_finance_recurring_overrides").upsert(
        {
          user_id:            user.id,
          recurring_entry_id: entryId,
          month_key:          monthKey,
          name, category,
          entry_date:         entryDate,
          amount, type, bank,
          payment_method:     paymentMethod,
          person,
          recurrence_day_mode: recurrenceDayMode,
          recurrence_day:      recurrenceDay,
          investment_yield_mode:  investmentYieldMode,
          investment_cdi_percent: investmentCdiPercent,
          deleted:            false,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: "user_id,recurring_entry_id,month_key" },
      );
      if (error) return { ok: false, error: error.message };
      reval();
      return { ok: true };
    }

    // "todos_os_meses" — atualiza a linha original. Overrides de meses
    // específicos continuam valendo por cima (são exceções intencionais).
    const { error } = await supabase
      .from("personal_finance_entries")
      .update(camposComuns)
      .eq("id", entryId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    reval();
    return { ok: true };
  }

  // ── Parcelado ────────────────────────────────────────────────────────────
  if (original.is_installment && original.installment_group_id) {
    const escopoParcela = (formData.get("escopo_parcela") as string) || "esta"; // "esta" | "estas_proximas" | "todas"
    const groupId = original.installment_group_id;

    if (escopoParcela === "esta") {
      const { error } = await supabase
        .from("personal_finance_entries")
        .update(camposComuns)
        .eq("id", entryId)
        .eq("user_id", user.id);
      if (error) return { ok: false, error: error.message };
      reval();
      return { ok: true };
    }

    const novoTotalRaw = formData.get("installment_total") as string;
    const novoTotal = parseInt(novoTotalRaw ?? "", 10);
    if (!Number.isInteger(novoTotal) || novoTotal < 1 || novoTotal > 120) {
      return { ok: false, error: "Quantidade de parcelas inválida (1 a 120)." };
    }

    const { data: grupoRaw } = await supabase
      .from("personal_finance_entries")
      .select("id, installment_number")
      .eq("installment_group_id", groupId)
      .eq("user_id", user.id)
      .order("installment_number");
    const grupo = (grupoRaw ?? []) as { id: string; installment_number: number }[];

    const alvo = escopoParcela === "todas"
      ? grupo
      : grupo.filter((p) => p.installment_number >= original.installment_number);

    // Atualiza os campos comuns em cada parcela alvo, preservando a
    // progressão mensal de datas relativa à parcela que foi editada.
    for (const p of alvo) {
      const offset = p.installment_number - original.installment_number;
      const novaData = offset === 0 ? entryDate : addMonthsToDate(entryDate, offset);
      const { error } = await supabase
        .from("personal_finance_entries")
        .update({ ...camposComuns, entry_date: novaData })
        .eq("id", p.id)
        .eq("user_id", user.id);
      if (error) return { ok: false, error: error.message };
    }

    // Ajusta a quantidade de parcelas do grupo, se mudou.
    if (novoTotal !== original.installment_total) {
      if (novoTotal > original.installment_total) {
        const primeira = grupo.find((p) => p.installment_number === 1);
        const { data: primeiraCompleta } = primeira
          ? await supabase.from("personal_finance_entries").select("entry_date").eq("id", primeira.id).maybeSingle()
          : { data: null };
        const dataBase = primeiraCompleta?.entry_date ?? entryDate;

        const novasLinhas = [];
        for (let n = original.installment_total + 1; n <= novoTotal; n++) {
          novasLinhas.push({
            user_id: user.id,
            person, name, category,
            entry_date: addMonthsToDate(dataBase, n - 1),
            amount, type, bank,
            payment_method: paymentMethod,
            is_installment: true,
            installment_group_id: groupId,
            installment_number: n,
            installment_total: novoTotal,
          });
        }
        if (novasLinhas.length > 0) {
          const { error } = await supabase.from("personal_finance_entries").insert(novasLinhas);
          if (error) return { ok: false, error: error.message };
        }
        await supabase
          .from("personal_finance_entries")
          .update({ installment_total: novoTotal })
          .eq("installment_group_id", groupId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("personal_finance_entries")
          .delete()
          .eq("installment_group_id", groupId)
          .eq("user_id", user.id)
          .gt("installment_number", novoTotal);
        await supabase
          .from("personal_finance_entries")
          .update({ installment_total: novoTotal })
          .eq("installment_group_id", groupId)
          .eq("user_id", user.id)
          .lte("installment_number", novoTotal);
      }
    }

    reval();
    return { ok: true };
  }

  // ── Lançamento normal ────────────────────────────────────────────────────
  const { error } = await supabase
    .from("personal_finance_entries")
    .update(camposComuns)
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

export type ApagarLancamentoInput = {
  entryId: string;
  monthKey?: string;
  escopoFixo?: "este_mes" | "todos_os_meses";
  /** "ambos" também apaga o lançamento irmão (mesmo shared_entry_group_id), se houver. */
  escopoPessoa?: "esta" | "ambos";
};

export async function apagarLancamento(input: ApagarLancamentoInput): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { data: original } = await supabase
    .from("personal_finance_entries")
    .select("id, is_recurring, shared_entry_group_id")
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; is_recurring: boolean; shared_entry_group_id: string | null }>();
  if (!original) return { ok: false, error: "Lançamento não encontrado." };

  const ids = [input.entryId];
  if (original.shared_entry_group_id && input.escopoPessoa === "ambos") {
    const { data: siblingRow } = await supabase
      .from("personal_finance_entries")
      .select("id")
      .eq("shared_entry_group_id", original.shared_entry_group_id)
      .eq("user_id", user.id)
      .neq("id", input.entryId)
      .maybeSingle<{ id: string }>();
    if (siblingRow) ids.push(siblingRow.id);
  }

  if (original.is_recurring && input.escopoFixo === "este_mes") {
    if (!input.monthKey) return { ok: false, error: "Mês inválido." };
    for (const id of ids) {
      const { error } = await supabase.from("personal_finance_recurring_overrides").upsert(
        {
          user_id:            user.id,
          recurring_entry_id: id,
          month_key:          input.monthKey,
          deleted:            true,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: "user_id,recurring_entry_id,month_key" },
      );
      if (error) return { ok: false, error: error.message };
    }
    reval();
    return { ok: true };
  }

  // Fixo "todos os meses" ou lançamento normal/parcela: apaga a linha (os
  // overrides do fixo somem junto, por ON DELETE CASCADE).
  const { error } = await supabase
    .from("personal_finance_entries")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

// ── Categorias ───────────────────────────────────────────────────────────────

async function migrarLancamentosParaSemCategoria(supabase: SupabaseClient, userId: string, nomeAntigo: string) {
  await supabase.from("personal_finance_entries").update({ category: SEM_CATEGORIA }).eq("user_id", userId).eq("category", nomeAntigo);
  await supabase.from("personal_finance_recurring_overrides").update({ category: SEM_CATEGORIA }).eq("user_id", userId).eq("category", nomeAntigo);
}

export async function criarCategoria(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const name = ((formData.get("name") as string) ?? "").trim();
  if (!name) return { ok: false, error: "Informe um nome." };
  if (name.toLowerCase() === SEM_CATEGORIA.toLowerCase()) {
    return { ok: false, error: "Esse nome é reservado." };
  }

  const { data: existing } = await supabase
    .from("personal_finance_categories")
    .select("id, active")
    .eq("user_id", user.id)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    if (existing.active) return { ok: false, error: "Já existe uma categoria com esse nome." };
    const { error } = await supabase
      .from("personal_finance_categories")
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    reval();
    return { ok: true };
  }

  const { error } = await supabase.from("personal_finance_categories").insert({ user_id: user.id, name });
  if (error) return { ok: false, error: error.message };
  reval();
  return { ok: true };
}

export async function renomearCategoria(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const id = formData.get("id") as string;
  const novoNome = ((formData.get("name") as string) ?? "").trim();
  if (!id) return { ok: false, error: "Categoria inválida." };
  if (!novoNome) return { ok: false, error: "Informe um nome." };

  const { data: cat } = await supabase
    .from("personal_finance_categories")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cat) return { ok: false, error: "Categoria não encontrada." };
  if (cat.name === SEM_CATEGORIA) return { ok: false, error: "Essa categoria não pode ser renomeada." };
  if (novoNome.toLowerCase() === SEM_CATEGORIA.toLowerCase()) return { ok: false, error: "Esse nome é reservado." };
  if (novoNome === cat.name) return { ok: true };

  const { error: updErr } = await supabase
    .from("personal_finance_categories")
    .update({ name: novoNome, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (updErr) {
    if ((updErr as { code?: string }).code === "23505") return { ok: false, error: "Já existe uma categoria com esse nome." };
    return { ok: false, error: updErr.message };
  }

  await supabase.from("personal_finance_entries").update({ category: novoNome }).eq("user_id", user.id).eq("category", cat.name);
  await supabase.from("personal_finance_recurring_overrides").update({ category: novoNome }).eq("user_id", user.id).eq("category", cat.name);

  reval();
  return { ok: true };
}

export async function removerCategoria(id: string): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const { data: cat } = await supabase
    .from("personal_finance_categories")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cat) return { ok: false, error: "Categoria não encontrada." };
  if (cat.name === SEM_CATEGORIA) return { ok: false, error: "Essa categoria não pode ser removida." };

  // Nunca apaga lançamento: migra pra "Sem categoria" antes de desativar.
  await migrarLancamentosParaSemCategoria(supabase, user.id, cat.name);

  const { error } = await supabase
    .from("personal_finance_categories")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}

// ── Configuração de rendimento (regra do Mercado Pago por faixas) ───────────
// Só mexe nos 3 percentuais/limite — last_cdi_annual/last_cdi_reference_date
// são geridos pelo fetch da taxa CDI em page.tsx, não por aqui. Editar a
// regra recalcula a projeção na próxima renderização, mas não toca em
// nenhum lançamento já salvo.
export async function salvarConfiguracoesInvestimento(formData: FormData): Promise<Res> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, error: "Acesso negado." };
  const { supabase, user } = ctx;

  const bonusCdiPercent = parseBRLInput((formData.get("mercado_pago_bonus_cdi_percent") as string) ?? "");
  const bonusLimit = parseBRLInput((formData.get("mercado_pago_bonus_limit") as string) ?? "");
  const excessCdiPercent = parseBRLInput((formData.get("mercado_pago_excess_cdi_percent") as string) ?? "");

  if (!Number.isFinite(bonusCdiPercent) || bonusCdiPercent <= 0 || bonusCdiPercent > 1000) {
    return { ok: false, error: "Percentual da faixa bônus inválido." };
  }
  if (!Number.isFinite(bonusLimit) || bonusLimit <= 0) {
    return { ok: false, error: "Limite da faixa bônus inválido." };
  }
  if (!Number.isFinite(excessCdiPercent) || excessCdiPercent <= 0 || excessCdiPercent > 1000) {
    return { ok: false, error: "Percentual da faixa excedente inválido." };
  }

  const { error } = await supabase.from("personal_finance_investment_settings").upsert(
    {
      user_id: user.id,
      mercado_pago_bonus_cdi_percent: bonusCdiPercent,
      mercado_pago_bonus_limit: bonusLimit,
      mercado_pago_excess_cdi_percent: excessCdiPercent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  reval();
  return { ok: true };
}
