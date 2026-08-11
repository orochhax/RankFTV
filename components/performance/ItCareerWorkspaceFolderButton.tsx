"use client";

import { useState } from "react";
import { FolderDown, Loader2 } from "lucide-react";

type DirectoryHandle = {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<DirectoryHandle>;
  getFileHandle(name: string, options: { create: boolean }): Promise<{
    createWritable(): Promise<{ write(value: string): Promise<void>; close(): Promise<void> }>;
  }>;
};

type WorkspaceResponse = {
  rootFolder: string;
  files: Array<{ path: string; content: string }>;
  error?: string;
};

async function availableFolderName(root: DirectoryHandle, requested: string): Promise<string> {
  for (let index = 0; index < 1_000; index += 1) {
    const candidate = index === 0 ? requested : `${requested}-${index + 1}`;
    try {
      await root.getDirectoryHandle(candidate, { create: false });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") return candidate;
      // O nome também pode estar ocupado por um arquivo. Nesse caso, tente o
      // próximo sufixo em vez de falhar ou sobrescrever algo do usuário.
      if (error instanceof DOMException && error.name === "TypeMismatchError") continue;
      throw error;
    }
  }
  throw new Error("Não foi possível escolher um nome seguro para a nova pasta.");
}

async function writeWorkspace(root: DirectoryHandle, payload: WorkspaceResponse): Promise<string> {
  const folderName = await availableFolderName(root, payload.rootFolder);
  const workspace = await root.getDirectoryHandle(folderName, { create: true });
  for (const file of payload.files) {
    const parts = file.path.split("/").filter(Boolean);
    const filename = parts.pop();
    if (!filename || parts.some((part) => part === "." || part === "..")) throw new Error("Caminho de arquivo inválido.");
    let directory = workspace;
    for (const part of parts) directory = await directory.getDirectoryHandle(part, { create: true });
    const handle = await directory.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file.content);
    await writable.close();
  }
  return folderName;
}

export function ItCareerWorkspaceFolderButton({ url, children, compact = false }: { url: string; children: React.ReactNode; compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setMessage(null);
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<DirectoryHandle> }).showDirectoryPicker;
    if (!picker) {
      setMessage("Seu navegador não permite salvar pastas. Use Chrome ou Edge no computador.");
      return;
    }
    setPending(true);
    try {
      const target = await picker.call(window);
      const response = await fetch(`${url}&format=files`, { cache: "no-store" });
      const payload = await response.json() as WorkspaceResponse;
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível preparar os arquivos.");
      const folderName = await writeWorkspace(target, payload);
      setMessage(`Pasta “${folderName}” criada com sucesso.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a pasta.");
    } finally {
      setPending(false);
    }
  };

  return <span className="inline-flex max-w-full flex-col items-end gap-1">
    <button type="button" onClick={save} disabled={pending} aria-label={compact ? String(children) : undefined} title={compact ? String(children) : undefined} className={`inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-white/55 hover:bg-white/[0.06] hover:text-white disabled:cursor-wait disabled:opacity-60 ${compact ? "size-8" : "border border-white/10 bg-white/[0.04] px-2.5 py-1.5"}`}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <FolderDown className="size-3.5" />}{!compact && children}
    </button>
    {message && <span role="status" className="max-w-80 text-right text-[10px] leading-4 text-white/45">{message}</span>}
  </span>;
}
