"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";

export type PerformanceConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

type ConfirmAction = (options: PerformanceConfirmOptions) => Promise<boolean>;

const PerformanceConfirmContext = createContext<ConfirmAction | null>(null);

export function PerformanceConfirmProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [request, setRequest] = useState<PerformanceConfirmOptions | null>(
    null,
  );
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmAction>(
    (options) =>
      new Promise((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setRequest(options);
      }),
    [],
  );

  const finish = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);
  const cancel = useCallback(() => finish(false), [finish]);
  const approve = useCallback(() => finish(true), [finish]);

  useEffect(() => () => resolverRef.current?.(false), []);

  return (
    <PerformanceConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <PerformanceConfirmDialog
          options={request}
          onCancel={cancel}
          onConfirm={approve}
        />
      )}
    </PerformanceConfirmContext.Provider>
  );
}

export function usePerformanceConfirm(): ConfirmAction {
  const confirm = useContext(PerformanceConfirmContext);
  if (!confirm)
    throw new Error(
      "usePerformanceConfirm precisa estar dentro de PerformanceConfirmProvider.",
    );
  return confirm;
}

function PerformanceConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: PerformanceConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const tone = options.tone ?? "danger";

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === cancelRef.current) {
          event.preventDefault();
          confirmRef.current?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === confirmRef.current
        ) {
          event.preventDefault();
          cancelRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel]);

  const Icon = tone === "danger" ? Trash2 : Check;
  const iconClass =
    tone === "danger"
      ? "bg-red-400/10 text-red-300"
      : "bg-blue-400/10 text-blue-300";
  const buttonClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-500"
      : "bg-blue-600 hover:bg-blue-500";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="performance-confirm-title"
        aria-describedby="performance-confirm-description"
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#15191f] p-5 text-white shadow-2xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
          >
          <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                id="performance-confirm-title"
                className="text-lg font-semibold"
              >
                {options.title}
              </h2>
            {tone === "danger" && (
              <AlertTriangle className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
              )}
            </div>
            <p
              id="performance-confirm-description"
              className="mt-2 text-sm leading-6 text-white/55"
            >
              {options.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
          className="min-h-11 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {options.cancelLabel ?? "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
          className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${buttonClass}`}
          >
            {options.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </section>
    </div>
  );
}
