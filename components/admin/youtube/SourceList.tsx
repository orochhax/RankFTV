"use client";

import { useState } from "react";
import { Check, ExternalLink, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type Source = {
  id: string;
  name: string;
  kind: string;
  url: string;
  category: string;
  language: string;
  enabled: boolean;
  last_success_at: string | null;
};

type SourceDraft = Pick<Source, "name" | "kind" | "url">;

const kindOptions = [
  ["site", "Site"],
  ["blog", "Blog"],
  ["youtube", "YouTube"],
  ["x", "X / Twitter"],
  ["newsletter", "Newsletter"],
  ["reddit", "Reddit"],
  ["rss", "Feed RSS"],
  ["atom", "Feed Atom"],
  ["api", "API"],
  ["other", "Outro"],
] as const;

const kindLabels = new Map<string, string>(kindOptions);
const emptyDraft: SourceDraft = { name: "", url: "", kind: "site" };

async function responseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? "Não foi possível concluir a alteração.";
}

function SourceEditor({
  source,
  onCancel,
  onSaved,
}: {
  source?: Source;
  onCancel: () => void;
  onSaved: (source: Source) => void;
}) {
  const [draft, setDraft] = useState<SourceDraft>(() => source
    ? { name: source.name, url: source.url, kind: source.kind }
    : emptyDraft);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch(source ? `/api/admin/youtube/sources/${source.id}` : "/api/admin/youtube/sources", {
      method: source ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!response.ok) {
      setError(await responseError(response));
      setPending(false);
      return;
    }
    const body = await response.json() as { source: Source };
    onSaved(body.source);
  }

  return (
    <form className="yt-source-form" onSubmit={submit}>
      <div className="yt-source-form-grid">
        <label>
          <span>Nome da fonte</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex.: Canal Maestros da IA"
            maxLength={120}
            required
            autoFocus
          />
        </label>
        <label>
          <span>Link</span>
          <input
            type="url"
            value={draft.url}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://..."
            maxLength={2048}
            required
          />
        </label>
        <label>
          <span>Tipo</span>
          <select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}>
            {kindOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="yt-source-error" role="alert">{error}</p> : null}
      <div className="yt-source-form-actions">
        <button type="button" className="yt-source-button is-secondary" onClick={onCancel} disabled={pending}><X size={14} /> Cancelar</button>
        <button type="submit" className="yt-source-button" disabled={pending}>
          {pending ? <LoaderCircle className="yt-spin" size={14} /> : <Save size={14} />}
          {source ? "Salvar alterações" : "Adicionar fonte"}
        </button>
      </div>
    </form>
  );
}

export function YoutubeSourceList({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState(initialSources);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeCount = sources.filter((source) => source.enabled).length;

  function saveSource(source: Source) {
    setSources((current) => {
      const exists = current.some((item) => item.id === source.id);
      return exists
        ? current.map((item) => item.id === source.id ? source : item)
        : [source, ...current];
    });
    setAdding(false);
    setEditing(null);
    setNotice("Fonte salva. Ela já faz parte da próxima pesquisa enquanto estiver ativa.");
  }

  async function toggle(source: Source) {
    setPending(source.id);
    setNotice(null);
    const response = await fetch(`/api/admin/youtube/sources/${source.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !source.enabled }),
    });
    if (response.ok) {
      const body = await response.json() as { source: Source };
      setSources((current) => current.map((item) => item.id === source.id ? body.source : item));
      setNotice(body.source.enabled
        ? `${body.source.name} será consultada na próxima pesquisa.`
        : `${body.source.name} ficou fora das próximas pesquisas.`);
    } else {
      setNotice(await responseError(response));
    }
    setPending(null);
  }

  async function remove(source: Source) {
    if (!window.confirm(`Remover “${source.name}” da lista? O histórico já coletado será preservado.`)) return;
    setPending(source.id);
    setNotice(null);
    const response = await fetch(`/api/admin/youtube/sources/${source.id}`, { method: "DELETE" });
    if (response.ok) {
      setSources((current) => current.filter((item) => item.id !== source.id));
      setNotice("Fonte removida. O histórico das pesquisas anteriores foi preservado.");
    } else {
      setNotice(await responseError(response));
    }
    setPending(null);
  }

  return (
    <div>
      <div className="yt-source-toolbar">
        <div><strong>{activeCount} ativas</strong><span>{sources.length - activeCount} desativadas</span></div>
        <button className="yt-source-button" type="button" onClick={() => { setAdding(true); setEditing(null); setNotice(null); }} disabled={adding}>
          <Plus size={14} /> Adicionar fonte
        </button>
      </div>
      {adding ? <SourceEditor onCancel={() => setAdding(false)} onSaved={saveSource} /> : null}
      {notice ? <p className="yt-source-notice" role="status">{notice}</p> : null}
      <div className="yt-source-list">
        {sources.map((source) => editing === source.id ? (
          <SourceEditor key={source.id} source={source} onCancel={() => setEditing(null)} onSaved={saveSource} />
        ) : (
          <article key={source.id}>
            <div className={source.enabled ? "yt-source-logo is-on" : "yt-source-logo"}>{source.name.slice(0, 2).toUpperCase()}</div>
            <div className="yt-source-identity">
              <strong>{source.name}</strong>
              <small>{kindLabels.get(source.kind) ?? source.kind} · {source.enabled ? "incluída na pesquisa" : "fora da pesquisa"}</small>
              <a href={source.url} target="_blank" rel="noreferrer" title={source.url}>{source.url}<ExternalLink size={11} /></a>
            </div>
            <span className={source.last_success_at ? "yt-health-ok" : "yt-health-wait"}>
              {source.last_success_at ? <><Check size={13} /> Já consultada</> : "Ainda não consultada"}
            </span>
            <button
              type="button"
              className={source.enabled ? "yt-toggle is-on" : "yt-toggle"}
              onClick={() => toggle(source)}
              disabled={pending === source.id}
              aria-label={`${source.enabled ? "Desativar" : "Ativar"} ${source.name}`}
              aria-pressed={source.enabled}
            >
              {pending === source.id ? <LoaderCircle className="yt-spin" size={14} /> : <i />}
            </button>
            <div className="yt-source-actions">
              <button type="button" onClick={() => { setEditing(source.id); setAdding(false); setNotice(null); }} aria-label={`Editar ${source.name}`} title="Editar"><Pencil size={14} /></button>
              <button type="button" onClick={() => remove(source)} disabled={pending === source.id} aria-label={`Remover ${source.name}`} title="Remover"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
        {!sources.length && !adding ? <div className="yt-compact-empty">Nenhuma fonte cadastrada. Adicione a primeira para orientar a próxima pesquisa.</div> : null}
      </div>
    </div>
  );
}
