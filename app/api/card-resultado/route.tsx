import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Gerador do "card de resultado" — PNG TRANSPARENTE no formato story (1080x1920)
// pra sobrepor numa foto (estilo Strava). O meio fica vazado; topo e rodapé têm
// um degradê escuro (scrim) pra o texto branco ler bem sobre qualquer foto.
//
// Parâmetros (query string), todos opcionais (têm exemplo padrão pra preview):
//   titulo  — nome do campeonato + local (linha de cima)
//   campea  — nomes da dupla campeã
//   vice    — nomes da dupla vice
//   sets    — placar por set: "18-16,18-15" (cada par = campeã-vice)
//   marca   — marca/circuito no rodapé esquerdo (direito é sempre RANKFTV)

const W = 1080;
const H = 1920;

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const titulo = sp.get("titulo") || "TAFC 54 - Bahia - Porto Seguro";
    const campea = (sp.get("campea") || "Carlos e Gustavo").toUpperCase();
    const vice   = (sp.get("vice") || "Maicon e Lucas").toUpperCase();
    const marca  = (sp.get("marca") || "TAFC").toUpperCase();
    const setsRaw = sp.get("sets") || "18-16,18-15";

    // "18-16,18-15" → campea [18,18], vice [16,15]
    const pares = setsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split("-").map((n) => n.trim()));
    const campeaSets = pares.map((p) => p[0] ?? "");
    const viceSets   = pares.map((p) => p[1] ?? "");

    const [bold, black] = await Promise.all([
      readFile(join(process.cwd(), "assets/fonts/Archivo-700.ttf")),
      readFile(join(process.cwd(), "assets/fonts/Archivo-900.ttf")),
    ]);

    // Colunas de número mais estreitas quando há mais sets, pra caber 3 sets
    // mesmo com nomes longos.
    const nSets = Math.max(campeaSets.length, viceSets.length, 1);
    const CELL = nSets >= 3 ? 68 : 110;  // largura de cada coluna de número
    const NUM_FS = nSets >= 3 ? 42 : 72; // tamanho da fonte dos números
    const NAME_FS = 54;                   // nome sempre no mesmo tamanho
    const WHITE = "#ffffff";

    // Coluna de números reutilizada nas duas linhas de placar
    const Numeros = (valores: string[]) => (
      <div style={{ display: "flex" }}>
        {valores.map((v, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: CELL,
              alignItems: "center",
              justifyContent: "center",
              fontSize: NUM_FS,
              fontFamily: "Archivo Black",
              color: WHITE,
            }}
          >
            {v}
          </div>
        ))}
      </div>
    );

    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            width: W,
            height: H,
            display: "flex",
            flexDirection: "column",
            // SEM background → PNG transparente no miolo
          }}
        >
          {/* Scrim de cima (degradê escuro pra ler o título) */}
          {/* Padding top 300px = seguro abaixo do avatar+@ do Instagram */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 720,
              display: "flex",
              flexDirection: "column",
              padding: "300px 70px 0px",
              backgroundImage:
                "linear-gradient(180deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0) 100%)",
            }}
          >
            <div
              style={{
                fontFamily: "Archivo Black",
                fontSize: 76,
                lineHeight: 1.04,
                color: WHITE,
                maxWidth: 900,
              }}
            >
              {titulo}
            </div>
          </div>

          {/* Scrim de baixo (degradê escuro pra ler o placar) */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              padding: "0 70px 280px 70px",
              paddingTop: 260,
              backgroundImage:
                "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0) 100%)",
            }}
          >
            {/* Linha 1 — dupla campeã */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  minWidth: 0,
                  paddingRight: 20,
                  fontFamily: "Archivo Black",
                  fontSize: NAME_FS,
                  color: WHITE,
                }}
              >
                {campea}
              </div>
              {Numeros(campeaSets)}
            </div>

            {/* Divisória: barras (vencedor) + tracejado */}
            <div style={{ display: "flex", alignItems: "center", padding: "18px 0" }}>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  overflow: "hidden",
                  fontFamily: "Archivo Black",
                  fontSize: 40,
                  color: WHITE,
                  letterSpacing: -4,
                }}
              >
                {"//////////////////////////"}
              </div>
              <div
                style={{
                  display: "flex",
                  width: CELL * campeaSets.length,
                  justifyContent: "center",
                  fontFamily: "Archivo",
                  fontSize: 40,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: 2,
                }}
              >
                ----------------
              </div>
            </div>

            {/* Linha 2 — dupla vice */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  minWidth: 0,
                  paddingRight: 20,
                  fontFamily: "Archivo Black",
                  fontSize: NAME_FS,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {vice}
              </div>
              {Numeros(viceSets)}
            </div>

            {/* Rodapé — marca / RANKFTV */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 70,
              }}
            >
              <div style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 44, color: WHITE }}>
                {marca}
              </div>
              <div style={{ display: "flex", fontFamily: "Archivo Black", fontSize: 44, color: WHITE }}>
                RANKFTV
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        fonts: [
          { name: "Archivo",       data: bold,  weight: 700, style: "normal" },
          { name: "Archivo Black", data: black, weight: 900, style: "normal" },
        ],
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    return new Response(`Falha ao gerar o card: ${msg}`, { status: 500 });
  }
}
