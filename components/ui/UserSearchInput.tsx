"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User } from "lucide-react";

type UserResult = {
  id: string;
  nome: string;
  username: string;
};

type Props = {
  name: string;                       // name do <input> hidden que vai no form
  placeholder?: string;
  label?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  excludeUserId?: string;             // exclui o próprio usuário logado da lista
};

export function UserSearchInput({
  name,
  placeholder = "@username",
  label,
  hint,
  required,
  defaultValue = "",
  excludeUserId,
}: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length === 0) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data: UserResult[] = await res.json();
      const filtered = excludeUserId ? data.filter((u) => u.id !== excludeUserId) : data;
      setResults(filtered);
      setOpen(filtered.length > 0);
    } finally {
      setLoading(false);
    }
  }, [excludeUserId]);

  function handleChange(value: string) {
    const clean = value.replace(/^@/, "");
    setQuery(clean);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(clean), 220);
  }

  function handleSelect(user: UserResult) {
    setSelected(user);
    setQuery(user.username);
    setOpen(false);
    setResults([]);
  }

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          {!required && <span className="ml-1 font-normal text-gray-400">(opcional)</span>}
        </label>
      )}

      {/* Campo visível */}
      <div className={`relative mt-1 flex items-center rounded-lg border bg-white px-3 py-2 ${open ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}>
        <span className="select-none text-sm text-gray-400">@</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder.replace(/^@/, "")}
          autoComplete="off"
          className="ml-0.5 flex-1 bg-transparent text-sm outline-none"
        />
        {loading && (
          <span className="ml-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        )}
      </div>

      {/* Input hidden que vai pro servidor */}
      <input
        type="hidden"
        name={name}
        value={selected ? selected.username : query}
        required={required}
      />

      {/* Dropdown de resultados */}
      {open && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(u); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <User className="size-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{u.nome}</p>
                  <p className="text-xs text-gray-400">@{u.username}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}

      {/* Preview do selecionado */}
      {selected && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-200">
            <User className="size-3 text-blue-600" />
          </div>
          <span className="font-medium text-blue-800">{selected.nome}</span>
          <span className="text-blue-500">@{selected.username}</span>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(""); }}
            className="ml-auto text-xs text-blue-400 hover:text-blue-600"
          >
            remover
          </button>
        </div>
      )}
    </div>
  );
}
