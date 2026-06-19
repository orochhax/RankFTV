"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff, Pencil, Check, X, Link2 } from "lucide-react";
import { saveSocialLinks } from "@/app/campeonatos/paginas/actions";

export type SocialLink = {
  type: "instagram" | "tiktok" | "whatsapp" | "facebook" | "youtube";
  url: string;
  visible: boolean;
};

const DEFAULTS: SocialLink[] = [
  { type: "instagram", url: "", visible: true },
  { type: "tiktok",    url: "", visible: true },
  { type: "whatsapp",  url: "", visible: true },
  { type: "facebook",  url: "", visible: true },
  { type: "youtube",   url: "", visible: true },
];

const META: Record<SocialLink["type"], { label: string; color: string; placeholder: string }> = {
  instagram: { label: "Instagram", color: "bg-gradient-to-br from-pink-500 to-orange-400", placeholder: "https://instagram.com/..." },
  tiktok:    { label: "TikTok",    color: "bg-black",                                       placeholder: "https://tiktok.com/@..." },
  whatsapp:  { label: "WhatsApp",  color: "bg-green-500",                                   placeholder: "https://wa.me/55..." },
  facebook:  { label: "Facebook",  color: "bg-blue-600",                                    placeholder: "https://facebook.com/..." },
  youtube:   { label: "YouTube",   color: "bg-red-600",                                     placeholder: "https://youtube.com/@..." },
};

function mergeWithDefaults(saved: SocialLink[]): SocialLink[] {
  const map = Object.fromEntries(saved.map((l) => [l.type, l]));
  return DEFAULTS.map((d) => map[d.type] ?? d);
}

export function SocialLinksBar({
  pageId,
  initialLinks,
  isOwner,
}: {
  pageId: string;
  initialLinks: SocialLink[];
  isOwner: boolean;
}) {
  const [links, setLinks] = useState<SocialLink[]>(mergeWithDefaults(initialLinks));
  const [editing, setEditing] = useState<SocialLink["type"] | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const publicLinks = links.filter((l) => l.visible && l.url.trim());

  function move(idx: number, dir: -1 | 1) {
    const next = [...links];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setLinks(next);
    persist(next);
  }

  function toggleVisible(idx: number) {
    const next = links.map((l, i) => i === idx ? { ...l, visible: !l.visible } : l);
    setLinks(next);
    persist(next);
  }

  function startEdit(link: SocialLink) {
    setEditing(link.type);
    setEditUrl(link.url);
  }

  function commitEdit() {
    if (!editing) return;
    const next = links.map((l) => l.type === editing ? { ...l, url: editUrl.trim() } : l);
    setLinks(next);
    setEditing(null);
    persist(next);
  }

  function persist(next: SocialLink[]) {
    startTransition(async () => {
      await saveSocialLinks(pageId, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  if (!isOwner) {
    if (publicLinks.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {publicLinks.map((l) => {
          const m = META[l.type];
          return (
            <a
              key={l.type}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 ${m.color}`}
            >
              <Link2 className="size-4" />
              {m.label}
            </a>
          );
        })}
      </div>
    );
  }

  // Owner view: edit controls
  return (
    <div className="space-y-2">
      {saved && (
        <p className="text-xs text-green-600 text-right">Salvo ✓</p>
      )}
      {/* Public preview */}
      {publicLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1">
          {publicLinks.map((l) => {
            const m = META[l.type];
            return (
              <a key={l.type} href={l.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white ${m.color}`}>
                <Link2 className="size-4" />{m.label}
              </a>
            );
          })}
        </div>
      )}
      {publicLinks.length === 0 && (
        <p className="text-xs text-white/40 pb-1">Nenhum link visível ainda. Configure abaixo.</p>
      )}

      {/* Edit rows */}
      <div className="rounded-2xl bg-white/10 p-3 space-y-2">
        <p className="text-xs text-white/50 font-medium mb-1">Editar links</p>
        {links.map((link, idx) => {
          const m = META[link.type];
          const isEditing = editing === link.type;
          return (
            <div key={link.type} className="flex items-center gap-2">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0 || pending}
                  className="rounded p-0.5 text-white/40 hover:text-white disabled:opacity-20">
                  <ChevronUp className="size-3" />
                </button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === links.length - 1 || pending}
                  className="rounded p-0.5 text-white/40 hover:text-white disabled:opacity-20">
                  <ChevronDown className="size-3" />
                </button>
              </div>

              {/* Icon */}
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-white ${m.color}`}>
                <Link2 className="size-4" />
              </div>

              {/* URL or input */}
              {isEditing ? (
                <>
                  <input
                    autoFocus
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder={m.placeholder}
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-white/40"
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                  />
                  <button type="button" onClick={commitEdit} className="rounded-lg bg-blue-500 p-1.5 text-white hover:bg-blue-600">
                    <Check className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20">
                    <X className="size-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-xs text-white/60">
                    {link.url ? link.url : <span className="italic text-white/30">sem link</span>}
                  </span>
                  <button type="button" onClick={() => startEdit(link)} className="rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20">
                    <Pencil className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => toggleVisible(idx)} disabled={pending}
                    className="rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20 disabled:opacity-40">
                    {link.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
