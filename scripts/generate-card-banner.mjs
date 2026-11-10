import sharp from "sharp";

async function generateCardBanner() {
  const width = 1200;
  const height = 675;

  // Safe area calibrada com precisão:
  // Canto superior esquerdo (X: 0..210, Y: 0..210): reservado para tag [NOV 9]
  // Canto inferior direito (X: 880..1200, Y: 560..675): reservado para tag [Inscrição aberta]
  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Gradientes de Fundo -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#050811" />
        <stop offset="40%" stop-color="#0b101c" />
        <stop offset="70%" stop-color="#181310" />
        <stop offset="100%" stop-color="#241407" />
      </linearGradient>

      <!-- Glow Laranja na direita (troféu) -->
      <radialGradient id="orangeGlow" cx="80%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.45" />
        <stop offset="50%" stop-color="#ea580c" stop-opacity="0.20" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <!-- Glow Azul no topo -->
      <radialGradient id="blueGlow" cx="45%" cy="20%" r="45%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>

      <!-- Gradiente do Título Dourado -->
      <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fff7ed" />
        <stop offset="25%" stop-color="#fed7aa" />
        <stop offset="55%" stop-color="#fb923c" />
        <stop offset="85%" stop-color="#ea580c" />
        <stop offset="100%" stop-color="#9a3412" />
      </linearGradient>

      <!-- Gradiente do Troféu Dourado 3D -->
      <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef9c3" />
        <stop offset="30%" stop-color="#facc15" />
        <stop offset="70%" stop-color="#eab308" />
        <stop offset="100%" stop-color="#ca8a04" />
      </linearGradient>

      <linearGradient id="trophyDarkGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ca8a04" />
        <stop offset="100%" stop-color="#713f12" />
      </linearGradient>

      <!-- Sombra do texto -->
      <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#ea580c" flood-opacity="0.55"/>
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.9"/>
      </filter>

      <filter id="trophyGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.7"/>
        <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#f59e0b" flood-opacity="0.4"/>
      </filter>
    </defs>

    <!-- Fundo Base -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <rect width="${width}" height="${height}" fill="url(#orangeGlow)" />
    <rect width="${width}" height="${height}" fill="url(#blueGlow)" />

    <!-- Textura esportiva de fundo -->
    <g opacity="0.06" stroke="#ffffff" stroke-width="2">
      <line x1="0" y1="560" x2="1200" y2="560" stroke-dasharray="16 12" />
      <circle cx="950" cy="320" r="260" fill="none" stroke-width="1.5" stroke-dasharray="8 8" />
    </g>

    <!-- Pílulas superiores (X: 240..650, Y: 46) — à direita da data [NOV 9] -->
    <g transform="translate(240, 46)">
      <!-- Badge Tour Oficial -->
      <rect x="0" y="0" width="180" height="32" rx="16" fill="#1e293b" fill-opacity="0.9" stroke="#38bdf8" stroke-width="1.5" />
      <circle cx="16" cy="16" r="4.5" fill="#38bdf8" />
      <text x="28" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#f8fafc" letter-spacing="1">RANKFTV TOUR</text>

      <!-- Badge Ao Vivo -->
      <g transform="translate(195, 0)">
        <rect x="0" y="0" width="150" height="32" rx="16" fill="#450a0a" fill-opacity="0.9" stroke="#ef4444" stroke-width="1.5" />
        <circle cx="16" cy="16" r="4.5" fill="#ef4444" />
        <text x="28" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" fill="#fecaca" letter-spacing="1">AO VIVO AGORA</text>
      </g>
    </g>

    <!-- Bloco de Conteúdo (X: 130..760) -->
    <g transform="translate(130, 160)">
      <!-- Eyebrow -->
      <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#38bdf8" letter-spacing="3">
        ETAPA ESPECIAL DE DEMONSTRAÇÃO
      </text>

      <!-- Títulos em Destaque -->
      <g filter="url(#textGlow)">
        <text x="0" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-style="italic" font-weight="1000" fill="#ffffff" letter-spacing="-1">
          CIRCUITO
        </text>
        <text x="0" y="116" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-style="italic" font-weight="1000" fill="url(#goldText)" letter-spacing="-1">
          RANKFTV OPEN PRO
        </text>
      </g>

      <!-- Subtítulo / Metadados -->
      <g transform="translate(0, 150)">
        <rect x="0" y="0" width="460" height="38" rx="10" fill="#0f172a" fill-opacity="0.8" stroke="#334155" stroke-width="1" />
        <circle cx="18" cy="19" r="4.5" fill="#ef4444" />
        <text x="30" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#e2e8f0">
          Arena Central · Salvador, BA
        </text>
        <text x="260" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#94a3b8">
          ⚡ 16 Duplas de Elite
        </text>
      </g>

      <!-- Card de Premiação R$ 30.000 -->
      <g transform="translate(0, 206)">
        <rect x="0" y="0" width="310" height="52" rx="14" fill="#18181b" fill-opacity="0.92" stroke="#f59e0b" stroke-width="2" />
        <circle cx="28" cy="26" r="14" fill="#fbbf24" fill-opacity="0.2" />
        <text x="21" y="32" font-size="16">💰</text>
        <text x="52" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#fbbf24" letter-spacing="1.5">
          PREMIAÇÃO TOTAL
        </text>
        <text x="52" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="1000" fill="#ffffff" letter-spacing="0.5">
          R$ 30.000,00
        </text>
      </g>
    </g>

    <!-- Troféu Dourado 3D à Direita (X: 800..1080, Y: 120..480) — acima do status badge -->
    <g transform="translate(800, 110)" filter="url(#trophyGlow)">
      <!-- Halo de Brilho -->
      <circle cx="140" cy="170" r="150" fill="#fbbf24" fill-opacity="0.22" />

      <!-- Alças -->
      <path d="M 50 110 C -5 110, -5 200, 65 220" fill="none" stroke="url(#trophyGold)" stroke-width="20" stroke-linecap="round" />
      <path d="M 230 110 C 285 110, 285 200, 215 220" fill="none" stroke="url(#trophyGold)" stroke-width="20" stroke-linecap="round" />

      <!-- Corpo da Taça -->
      <path d="M 60 90 L 220 90 C 220 200, 175 260, 140 270 C 105 260, 60 200, 60 90 Z" fill="url(#trophyGold)" />
      <!-- Borda Superior -->
      <ellipse cx="140" cy="90" rx="80" ry="20" fill="url(#trophyDarkGold)" />
      <ellipse cx="140" cy="85" rx="76" ry="16" fill="url(#trophyGold)" />

      <!-- Haste -->
      <path d="M 125 270 L 155 270 L 158 315 L 122 315 Z" fill="url(#trophyDarkGold)" />

      <!-- Base da Taça -->
      <polygon points="98,315 182,315 194,338 86,338" fill="url(#trophyGold)" />
      <rect x="74" y="338" width="132" height="40" rx="7" fill="#3b0764" stroke="#6b21a8" stroke-width="2" />
      <rect x="90" y="347" width="100" height="22" rx="3" fill="url(#trophyGold)" />
      <text x="104" y="362" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#451a03" letter-spacing="0.5">RANKFTV</text>

      <!-- Estrela Brilhante -->
      <polygon points="140,135 144,148 158,148 146,157 151,170 140,161 129,170 134,157 122,148 136,148" fill="#ffffff" fill-opacity="0.95" />
    </g>
  </svg>
  `;

  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile("public/banners/circuito-rankftv-card.png");

  console.log("Card banner 1200x675 gerado em public/banners/circuito-rankftv-card.png");
}

generateCardBanner().catch(console.error);
