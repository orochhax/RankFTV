"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Script from "next/script";

// Handle que o formulário pai usa pra resetar o widget. O token do Turnstile é
// de uso único: depois de uma tentativa de login/cadastro que falha, é preciso
// resetar pra gerar um token novo, senão a próxima tentativa manda um token já
// gasto e o Supabase recusa de novo.
export type TurnstileHandle = { reset: () => void };

type Props = {
  // Recebe o token quando o captcha é resolvido, ou null quando expira/falha.
  onToken: (token: string | null) => void;
};

// Tipagem mínima da API global que o script do Cloudflare injeta em window.
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile(
  { onToken },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Guarda o callback num ref pra que uma nova referência de função vinda do pai
  // não force o widget a ser removido e recriado a cada render.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        onTokenRef.current(null);
      }
    },
  }));

  // Se o script já foi carregado numa navegação anterior (SPA), window.turnstile
  // já existe e o onLoad do <Script> não dispara de novo — então marcamos aqui.
  useEffect(() => {
    if (window.turnstile) setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !SITE_KEY || !containerRef.current || widgetIdRef.current) {
      return;
    }
    widgetIdRef.current = window.turnstile!.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onTokenRef.current(token),
      "error-callback": () => onTokenRef.current(null),
      "expired-callback": () => onTokenRef.current(null),
    });
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready]);

  // Sem site key configurada, não renderiza nada (ex.: ambiente sem captcha).
  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
});

export default Turnstile;
