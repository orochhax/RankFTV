import { AlertTriangle } from "lucide-react";

export type ChampionshipNotice = { id: string; title: string; message: string; createdAt: string };

export function ChampionshipNotices({ notices }: { notices: ChampionshipNotice[] }) {
  if (notices.length === 0) return null;
  return <section aria-labelledby="notices-title" className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200"><h2 id="notices-title" className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle className="size-5" />Avisos importantes</h2><ol className="mt-3 space-y-3">{notices.map((notice) => <li key={notice.id} className="border-t border-amber-200 pt-3 first:border-0 first:pt-0"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold text-amber-950">{notice.title}</h3><time className="text-[11px] text-amber-700">{new Date(notice.createdAt).toLocaleString("pt-BR")}</time></div><p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{notice.message}</p></li>)}</ol></section>;
}
