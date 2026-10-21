"use client";

import { type FormEvent, useState } from "react";
import { Check, LoaderCircle, Save } from "lucide-react";

type Settings = {
  ai_provider: string;
  ai_model: string;
  research_times: string[];
  keywords: string[];
  max_items_per_source: number;
  max_ai_analyses_per_run: number;
  monthly_budget_usd_micros: number;
  editorial_profile: string;
};

export function YoutubeSettingsForm({ settings }: { settings: Settings }) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/youtube/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        aiProvider: data.get("aiProvider"),
        aiModel: data.get("aiModel"),
        researchTimes: String(data.get("researchTimes")).split(",").map((value) => value.trim()).filter(Boolean),
        keywords: String(data.get("keywords")).split(",").map((value) => value.trim()).filter(Boolean),
        maxItemsPerSource: Number(data.get("maxItemsPerSource")),
        maxAiAnalysesPerRun: Number(data.get("maxAiAnalysesPerRun")),
        monthlyBudgetUsd: Number(data.get("monthlyBudgetUsd")),
        editorialProfile: data.get("editorialProfile"),
      }),
    });
    if (response.ok) setSaved(true);
    else setError(((await response.json()) as { error?: string }).error ?? "Falha ao salvar");
    setPending(false);
  }

  return (
    <form className="yt-settings-form" onSubmit={submit}>
      <section className="yt-panel">
        <div className="yt-panel-heading"><div><h2>Inteligência artificial</h2></div><span>Chave protegida no servidor</span></div>
        <div className="yt-form-grid">
          <label><span>Provedor</span><select name="aiProvider" defaultValue={settings.ai_provider}><option value="none">Desativado</option><option value="openai">OpenAI</option></select></label>
          <label><span>Modelo</span><input name="aiModel" defaultValue={settings.ai_model} placeholder="gpt-5-mini" /></label>
        </div>
        <p className="yt-field-help">A chave da API permanece somente no ambiente protegido da Vercel e nunca é enviada ao navegador.</p>
      </section>
      <section className="yt-panel">
        <div className="yt-panel-heading"><div><h2>Pesquisa e limites</h2></div><span>America/Bahia</span></div>
        <div className="yt-form-grid is-thirds">
          <label><span>Horários (1 a 3)</span><input name="researchTimes" defaultValue={settings.research_times.join(", ")} /></label>
          <label><span>Itens por fonte</span><input name="maxItemsPerSource" type="number" min="5" max="100" defaultValue={settings.max_items_per_source} /></label>
          <label><span>Análises por rodada</span><input name="maxAiAnalysesPerRun" type="number" min="0" max="50" defaultValue={settings.max_ai_analyses_per_run} /></label>
          <label><span>Limite mensal estimado (US$)</span><input name="monthlyBudgetUsd" type="number" min="0" step="0.01" defaultValue={settings.monthly_budget_usd_micros / 1_000_000} /></label>
          <label className="is-span-two"><span>Palavras-chave</span><input name="keywords" defaultValue={settings.keywords.join(", ")} /></label>
        </div>
        <p className="yt-field-help">O limite é uma referência operacional; o volume real é controlado por itens e análises máximas por rodada.</p>
      </section>
      <section className="yt-panel">
        <div className="yt-panel-heading"><div><h2>Perfil editorial</h2></div></div>
        <label><span>Orientações para as sugestões</span><textarea name="editorialProfile" rows={6} defaultValue={settings.editorial_profile} placeholder="Público, tom, formatos e temas preferidos." /></label>
      </section>
      {error ? <p className="yt-form-error" role="alert">{error}</p> : null}
      <button className="yt-primary-button yt-settings-save" disabled={pending}>
        {pending ? <LoaderCircle className="yt-spin" size={17} /> : saved ? <Check size={17} /> : <Save size={17} />}
        {pending ? "Salvando..." : saved ? "Salvo" : "Salvar configurações"}
      </button>
    </form>
  );
}
