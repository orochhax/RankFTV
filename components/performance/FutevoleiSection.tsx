"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Loader2, Target, Trash2, TrendingUp } from "lucide-react";
import {
  registrarRating,
  definirMetaRating,
  adicionarJogo,
  removerJogo,
} from "@/app/admin/performance/actions";

type RatingEntry = { id: string; data: string; rating: number };

type Jogo = {
  id: string;
  data: string;
  parceiro: string | null;
  adversario: string | null;
  resultado: "vitoria" | "derrota";
  placar: string | null;
  obs: string | null;
};

type Props = {
  ratings: RatingEntry[];
  jogos: Jogo[];
  ratingMeta: number | null;
  hoje: string;
};

export function FutevoleiSection({ ratings, jogos, ratingMeta, hoje }: Props) {
  const ratingAtual = ratings.length ? ratings[ratings.length - 1].rating : null;
  const vitórias = jogos.filter((j) => j.resultado === "vitoria").length;
  const derrotas = jogos.filter((j) => j.resultado === "derrota").length;
  const total = jogos.length;
  const aproveitamento = total > 0 ? Math.round((vitórias / total) * 100) : null;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-6">
      <h2 className="font-semibold text-gray-900">Futevôlei</h2>

      {/* ── Rating ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Rating</p>

        <div className="flex flex-wrap gap-2 mb-3">
          <Chip label="Atual" value={ratingAtual != null ? String(ratingAtual) : "—"} color="blue" />
          <Chip label="Meta" value={ratingMeta != null ? String(ratingMeta) : "—"} color="green" />
          {ratingAtual != null && ratingMeta != null && (
            <Chip
              label={ratingAtual >= ratingMeta ? "Meta atingida" : "Faltam"}
              value={ratingAtual >= ratingMeta ? "" : `${(ratingMeta - ratingAtual).toFixed(0)} pts`}
              color={ratingAtual >= ratingMeta ? "green" : "gray"}
            />
          )}
        </div>

        {ratings.length >= 2 && (
          <div className="mb-3 overflow-hidden rounded-xl bg-gray-50 p-3">
            <RatingChart ratings={ratings} meta={ratingMeta} />
          </div>
        )}
        {ratings.length === 1 && (
          <p className="mb-3 text-xs text-gray-400">Registre mais um dia para ver a curva de evolução.</p>
        )}
        {ratings.length === 0 && (
          <p className="mb-3 text-xs text-gray-400">Nenhum rating registrado ainda.</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-3">
          <RegistrarRatingForm key={ratingAtual ?? "null"} hoje={hoje} />
          <MetaRatingForm key={`meta-${ratingMeta}`} ratingMeta={ratingMeta} />
        </div>
      </div>

      {/* ── Jogos ── */}
      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Jogos</p>

        {total > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip label="Total" value={String(total)} color="gray" />
            <Chip label="Vitórias" value={String(vitórias)} color="green" />
            <Chip label="Derrotas" value={String(derrotas)} color="red" />
            {aproveitamento != null && (
              <Chip
                label="Aproveitamento"
                value={`${aproveitamento}%`}
                color={aproveitamento >= 60 ? "green" : aproveitamento >= 40 ? "amber" : "red"}
              />
            )}
          </div>
        )}

        <AdicionarJogoForm hoje={hoje} />

        {jogos.length > 0 && (
          <ul className="mt-4 space-y-2">
            {jogos.map((j) => (
              <JogoItem key={j.id} jogo={j} />
            ))}
          </ul>
        )}

        {jogos.length === 0 && (
          <p className="mt-3 text-xs text-gray-400">Nenhum jogo registrado ainda.</p>
        )}
      </div>
    </section>
  );
}

// ── Gráfico SVG de rating ─────────────────────────────────────────────────────
function RatingChart({ ratings, meta }: { ratings: RatingEntry[]; meta: number | null }) {
  const W = 320, H = 90;
  const PAD = { t: 18, b: 8, l: 36, r: 8 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const allR = ratings.map((r) => r.rating);
  if (meta != null) allR.push(meta);
  const minR = Math.min(...allR) - 10;
  const maxR = Math.max(...allR) + 10;

  const ts = ratings.map((r) => new Date(r.data + "T12:00:00").getTime());
  const minT = ts[0], maxT = ts[ts.length - 1];
  const rangeT = maxT - minT || 1;

  const sx = (data: string) =>
    PAD.l + ((new Date(data + "T12:00:00").getTime() - minT) / rangeT) * cw;
  const sy = (r: number) =>
    PAD.t + ch - ((r - minR) / (maxR - minR)) * ch;

  const points = ratings.map((r) => `${sx(r.data)},${sy(r.rating)}`).join(" ");
  const metaY = meta != null ? sy(meta) : null;
  const last = ratings[ratings.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {metaY != null && (
        <>
          <line
            x1={PAD.l} y1={metaY} x2={W - PAD.r} y2={metaY}
            stroke="#10b981" strokeWidth="1" strokeDasharray="5 3" opacity="0.8"
          />
          <text x={W - PAD.r - 2} y={metaY - 3} fontSize="7" fill="#10b981" textAnchor="end">
            meta {meta}
          </text>
        </>
      )}
      <text x={PAD.l - 3} y={PAD.t + 3} fontSize="7" fill="#9ca3af" textAnchor="end">
        {(maxR - 10).toFixed(0)}
      </text>
      <text x={PAD.l - 3} y={PAD.t + ch + 3} fontSize="7" fill="#9ca3af" textAnchor="end">
        {(minR + 10).toFixed(0)}
      </text>
      <polyline
        points={points} fill="none"
        stroke="#8b5cf6" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"
      />
      {ratings.map((r, i) => (
        <circle key={i} cx={sx(r.data)} cy={sy(r.rating)} r="2.5" fill="#8b5cf6" />
      ))}
      <circle cx={sx(last.data)} cy={sy(last.rating)} r="4.5" fill="white" stroke="#8b5cf6" strokeWidth="2" />
      <text
        x={sx(last.data)} y={sy(last.rating) - 8}
        fontSize="8.5" fill="#8b5cf6" textAnchor="middle" fontWeight="bold"
      >
        {last.rating}
      </text>
    </svg>
  );
}

// ── Form: registrar rating ────────────────────────────────────────────────────
function RegistrarRatingForm({ hoje }: { hoje: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function action(formData: FormData) {
    formData.set("data", hoje);
    setErro(null); setSalvo(false);
    startTransition(async () => {
      const res = await registrarRating(formData);
      if (res.ok) { setSalvo(true); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  return (
    <div>
      <form action={action} className="flex items-center gap-2">
        <input
          name="rating"
          type="number"
          step="1"
          min={0}
          placeholder="Ex.: 1450"
          className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <span className="text-xs text-gray-400">pts hoje</span>
        <button type="submit" disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-60">
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <TrendingUp className="size-3" />}
          {salvo ? "Salvo!" : "Registrar"}
        </button>
      </form>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}

// ── Form: definir meta de rating ──────────────────────────────────────────────
function MetaRatingForm({ ratingMeta }: { ratingMeta: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function action(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const res = await definirMetaRating(formData);
      if (res.ok) { setSalvo(true); router.refresh(); }
    });
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <Target className="size-4 shrink-0 text-blue-500" />
      <input
        name="rating_meta"
        type="number"
        step="1"
        min={0}
        defaultValue={ratingMeta ?? undefined}
        placeholder="Meta (pts)"
        className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit" disabled={isPending}
        className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        {salvo ? "Salvo!" : "Definir"}
      </button>
    </form>
  );
}

// ── Form: adicionar jogo ──────────────────────────────────────────────────────
function AdicionarJogoForm({ hoje }: { hoje: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  function action(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const res = await adicionarJogo(formData);
      if (res.ok) {
        setFormKey((k) => k + 1);
        setAberto(false);
        router.refresh();
      } else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  const inp = "w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
      >
        {aberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        {aberto ? "Fechar" : "Registrar jogo"}
      </button>

      {aberto && (
        <form key={formKey} action={action} className="mt-3 space-y-3 rounded-xl bg-gray-50 p-4 ring-1 ring-black/5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Data</label>
              <input name="data" type="date" defaultValue={hoje} className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Resultado</label>
              <select name="resultado" defaultValue="vitoria" className={`${inp} bg-white`}>
                <option value="vitoria">Vitória</option>
                <option value="derrota">Derrota</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Meu parceiro</label>
              <input name="parceiro" type="text" placeholder="Nome" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Adversários</label>
              <input name="adversario" type="text" placeholder="Nome / Dupla" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Placar</label>
              <input name="placar" type="text" placeholder="21-18 / 21-15" className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Observação</label>
              <input name="obs" type="text" placeholder="Opcional" className={inp} />
            </div>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Salvar jogo
          </button>
        </form>
      )}
    </div>
  );
}

// ── Item da lista de jogos ────────────────────────────────────────────────────
function JogoItem({ jogo }: { jogo: Jogo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function excluir() {
    if (!confirm("Remover este jogo?")) return;
    startTransition(async () => { await removerJogo(jogo.id); router.refresh(); });
  }

  const [ano, mes, dia] = jogo.data.split("-");
  const dataFmt = `${dia}/${mes}`;

  return (
    <li className="flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-black/5">
      {/* Badge resultado */}
      <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${
        jogo.resultado === "vitoria"
          ? "bg-blue-100 text-blue-700"
          : "bg-red-100 text-red-700"
      }`}>
        {jogo.resultado === "vitoria" ? "V" : "D"}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">
          <span className="font-medium text-gray-400 text-xs">{dataFmt}</span>
          {jogo.parceiro && <> · c/ {jogo.parceiro}</>}
          {jogo.adversario && <> · vs {jogo.adversario}</>}
          {jogo.placar && <> · <span className="font-semibold">{jogo.placar}</span></>}
        </p>
        {jogo.obs && <p className="mt-0.5 text-xs text-gray-400 truncate">{jogo.obs}</p>}
      </div>

      {/* Excluir */}
      <button
        onClick={excluir}
        disabled={isPending}
        className="shrink-0 flex size-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </li>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({
  label, value, color,
}: {
  label: string; value: string; color: "blue" | "green" | "amber" | "red" | "gray";
}) {
  const cls = {
    blue:  "bg-blue-50 text-blue-700",
    green: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red:   "bg-red-50 text-red-700",
    gray:  "bg-gray-100 text-gray-600",
  };
  return (
    <div className={`rounded-lg px-2.5 py-1 text-xs ${cls[color]}`}>
      <span className="font-medium">{label}</span>{value ? `: ${value}` : ""}
    </div>
  );
}
