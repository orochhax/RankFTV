import sharp from "sharp";
import { writeFileSync } from "node:fs";

const width = 1920;
const height = 600;

// Safe Area Vertical: Y=160 até Y=440 (Centro de 280px para aspecto 6:1 sem cortes)
const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente de fundo principal -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050B14" />
      <stop offset="35%" stop-color="#0B172E" />
      <stop offset="70%" stop-color="#0E1E3D" />
      <stop offset="100%" stop-color="#040810" />
    </linearGradient>

    <!-- Foco de luz de estádio azul/dourado -->
    <radialGradient id="stadiumGlow1" cx="20%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#1E40AF" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#050B14" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="stadiumGlow2" cx="85%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#D97706" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#050B14" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#050B14" stop-opacity="0" />
    </radialGradient>

    <!-- Gradiente Dourado Metálico do Título -->
    <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="30%" stop-color="#FACC15" />
      <stop offset="70%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <!-- Gradiente Dourado Secundário -->
    <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <!-- Gradiente do Troféu -->
    <linearGradient id="trophyBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="25%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#EAB308" />
      <stop offset="75%" stop-color="#CA8A04" />
      <stop offset="100%" stop-color="#854D0E" />
    </linearGradient>
    <linearGradient id="trophyBase" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Filtros de Sombra e Brilho -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Fundo -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
  <rect width="${width}" height="${height}" fill="url(#stadiumGlow1)" />
  <rect width="${width}" height="${height}" fill="url(#stadiumGlow2)" />
  <rect width="${width}" height="${height}" fill="url(#centerGlow)" />

  <!-- Linhas decorativas sutis de quadra de areia -->
  <path d="M 0 540 Q 960 480 1920 540" stroke="#F59E0B" stroke-opacity="0.1" stroke-width="2" fill="none" />
  <path d="M 0 570 Q 960 520 1920 570" stroke="#3B82F6" stroke-opacity="0.08" stroke-width="2" fill="none" />
  <path d="M 0 60 Q 960 120 1920 60" stroke="#3B82F6" stroke-opacity="0.08" stroke-width="2" fill="none" />

  <!-- Partículas sutis de areia iluminada -->
  <circle cx="280" cy="220" r="2.5" fill="#FDE047" opacity="0.4" />
  <circle cx="420" cy="380" r="2" fill="#FDE047" opacity="0.3" />
  <circle cx="850" cy="180" r="3" fill="#60A5FA" opacity="0.3" />
  <circle cx="1120" cy="420" r="2.5" fill="#FDE047" opacity="0.4" />
  <circle cx="1480" cy="210" r="3" fill="#FDE047" opacity="0.5" />
  <circle cx="1720" cy="390" r="2" fill="#60A5FA" opacity="0.3" />

  <!-- ======================================================== -->
  <!-- ZONA SEGURA VERTICAL (Y = 175 a Y = 425, total 250px) -->
  <!-- ======================================================== -->

  <!-- 1. BADGE SUPERIOR CENTRALIZADO (Y = 195) -->
  <g transform="translate(180, 185)">
    <rect x="0" y="0" width="380" height="34" rx="17" fill="#1E293B" fill-opacity="0.8" stroke="#F59E0B" stroke-width="1.5" />
    <circle cx="20" cy="17" r="4" fill="#FACC15" />
    <text x="36" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" fill="#FDE047" letter-spacing="2.5">
      ETAPA OFICIAL RANKFTV • 2026
    </text>
  </g>

  <!-- 2. TÍTULO PRINCIPAL (Y = 275) -->
  <!-- Palavra CIRCUITO em tracking aberto -->
  <text x="180" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#93C5FD" letter-spacing="8" filter="url(#dropShadow)">
    CIRCUITO
  </text>
  <!-- RANKFTV OPEN PRO em destaque com efeito dourado -->
  <text x="355" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="url(#goldText)" letter-spacing="3" filter="url(#dropShadow)">
    RANKFTV OPEN PRO
  </text>

  <!-- Faixa decorativa horizontal sob o título -->
  <rect x="180" y="280" width="850" height="4" rx="2" fill="url(#goldAccent)" filter="url(#glow)" />

  <!-- 3. CARDS DE DETALHES INFORMATIVOS NA FAIXA INFERIOR (Y = 310 a 360) -->
  
  <!-- Card 1: Localização -->
  <g transform="translate(180, 310)">
    <rect x="0" y="0" width="280" height="48" rx="12" fill="#0F172A" fill-opacity="0.75" stroke="#334155" stroke-width="1" />
    <circle cx="24" cy="24" r="12" fill="#1E293B" />
    <text x="24" y="29" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#EF4444">📍</text>
    <text x="46" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#94A3B8" letter-spacing="0.5">LOCAL DO EVENTO</text>
    <text x="46" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#F8FAFC">Arena Central • Salvador, BA</text>
  </g>

  <!-- Card 2: Premiação -->
  <g transform="translate(480, 310)">
    <rect x="0" y="0" width="290" height="48" rx="12" fill="#0F172A" fill-opacity="0.75" stroke="#F59E0B" stroke-width="1.2" stroke-opacity="0.6" />
    <circle cx="24" cy="24" r="12" fill="#451A03" />
    <text x="24" y="29" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle" fill="#F59E0B">🏆</text>
    <text x="46" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#FBBF24" letter-spacing="0.5">PREMIAÇÃO TOTAL</text>
    <text x="46" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#FDE047">R$ 30.000,00 em Prêmios</text>
  </g>

  <!-- Card 3: Status / Telão Ao Vivo -->
  <g transform="translate(790, 310)">
    <rect x="0" y="0" width="310" height="48" rx="12" fill="#0F172A" fill-opacity="0.75" stroke="#2563EB" stroke-width="1.2" stroke-opacity="0.6" />
    <circle cx="24" cy="24" r="12" fill="#172554" />
    <circle cx="24" cy="24" r="4" fill="#22C55E" />
    <text x="46" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#60A5FA" letter-spacing="0.5">FASE DECISIVA</text>
    <text x="46" y="38" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#F8FAFC">Semifinais Ao Vivo no Telão</text>
  </g>

  <!-- Linha de Categorias Participantes (Y = 385) -->
  <g transform="translate(180, 385)">
    <text x="0" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#94A3B8" letter-spacing="0.5">
      CATEGORIAS:
    </text>
    <rect x="100" y="0" width="130" height="22" rx="6" fill="#1E3A8A" fill-opacity="0.6" stroke="#3B82F6" stroke-width="0.8" />
    <text x="165" y="15" font-family="system-ui, sans-serif" font-size="11" font-weight="800" fill="#DBEAFE" text-anchor="middle">OPEN PRO MASC</text>

    <rect x="240" y="0" width="105" height="22" rx="6" fill="#1E293B" stroke="#475569" stroke-width="0.8" />
    <text x="292" y="15" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#CBD5E1" text-anchor="middle">CATEGORIA A</text>

    <rect x="355" y="0" width="105" height="22" rx="6" fill="#1E293B" stroke="#475569" stroke-width="0.8" />
    <text x="407" y="15" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#CBD5E1" text-anchor="middle">CATEGORIA B</text>

    <rect x="470" y="0" width="115" height="22" rx="6" fill="#1E293B" stroke="#475569" stroke-width="0.8" />
    <text x="527" y="15" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#CBD5E1" text-anchor="middle">MISTO INICIANTE</text>

    <text x="610" y="14" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#64748B">
      • 64 Duplas Confirmadas
    </text>
  </g>

  <!-- ======================================================== -->
  <!-- ELEMENTO VISUAL À DIREITA: TROFÉU DE OURO 3D (Y = 175..425) -->
  <!-- ======================================================== -->
  <g transform="translate(1500, 180)" filter="url(#dropShadow)">
    <!-- Aura de luz atrás do troféu -->
    <circle cx="150" cy="120" r="100" fill="#F59E0B" opacity="0.25" filter="url(#glow)" />
    
    <!-- Bola de Futevôlei Estilizada Flutuando Atrás/Acima -->
    <circle cx="210" cy="70" r="32" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
    <circle cx="210" cy="70" r="32" fill="none" stroke="#2563EB" stroke-width="6" stroke-dasharray="14 10" />

    <!-- Corpo do Troféu -->
    <!-- Base -->
    <rect x="90" y="200" width="120" height="24" rx="5" fill="url(#trophyBase)" stroke="#475569" stroke-width="1.5" />
    <rect x="105" y="185" width="90" height="18" rx="3" fill="#D97706" />
    <rect x="110" y="187" width="80" height="14" rx="2" fill="url(#trophyBody)" />
    <!-- Haste Central -->
    <path d="M 135 185 L 142 145 L 158 145 L 165 185 Z" fill="url(#trophyBody)" stroke="#92400E" stroke-width="1" />
    <!-- Taça / Cálice -->
    <path d="M 100 80 Q 100 145 150 145 Q 200 145 200 80 Z" fill="url(#trophyBody)" stroke="#92400E" stroke-width="1.5" />
    <ellipse cx="150" cy="80" rx="50" ry="12" fill="#FEF08A" stroke="#CA8A04" stroke-width="1.5" />
    <ellipse cx="150" cy="80" rx="42" ry="8" fill="#F59E0B" />
    <!-- Alças Laterais -->
    <path d="M 100 90 C 65 90 65 130 115 132 C 110 126 80 125 85 96 C 88 92 95 91 100 90 Z" fill="url(#trophyBody)" stroke="#92400E" stroke-width="1" />
    <path d="M 200 90 C 235 90 235 130 185 132 C 190 126 220 125 215 96 C 212 92 205 91 200 90 Z" fill="url(#trophyBody)" stroke="#92400E" stroke-width="1" />
    <!-- Estrela no Centro da Taça -->
    <polygon points="150,96 153,105 162,105 155,111 157,120 150,114 143,120 145,111 138,105 147,105" fill="#FEF08A" />

    <!-- Estrelas de Brilho em volta -->
    <text x="60" y="60" font-size="20" fill="#FEF08A" opacity="0.8">✦</text>
    <text x="250" y="140" font-size="16" fill="#FDE047" opacity="0.7">✦</text>
    <text x="80" y="170" font-size="14" fill="#FEF08A" opacity="0.6">✦</text>
  </g>

</svg>
`;

async function run() {
  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toBuffer();

  writeFileSync("public/banners/circuito-rankftv-open.png", pngBuffer);
  writeFileSync("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/circuito-rankftv-open.png", pngBuffer);
  console.log("Banner panorâmico gerado com sucesso (1920x600, safe area vertical Y=175..425)!");
}

run().catch(console.error);
