"use client";

import { useRef } from "react";
import { X } from "lucide-react";

type LegalDocumentDialogProps = {
  document: "terms" | "privacy";
};

const DOCUMENTS = {
  terms: {
    label: "Termos de Uso",
    title: "Termos de Uso da RankFTV",
    href: "/termos",
  },
  privacy: {
    label: "Política de Privacidade",
    title: "Política de Privacidade da RankFTV",
    href: "/privacidade",
  },
} as const;

export function LegalDocumentDialog({ document }: LegalDocumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const content = DOCUMENTS[document];

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-md font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {content.label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`legal-dialog-${document}-title`}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto h-[min(90dvh,760px)] w-[min(calc(100%-2rem),720px)] overflow-hidden rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-gray-950/70"
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">RankFTV</p>
              <h2 id={`legal-dialog-${document}-title`} className="truncate text-base font-semibold text-gray-950 sm:text-lg">
                {content.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={`Fechar ${content.label}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <iframe
            src={content.href}
            title={content.title}
            className="min-h-0 flex-1 border-0 bg-white"
          />
        </div>
      </dialog>
    </>
  );
}
