import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Paths
const beachPath = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/.user_uploaded/media_1794346131527_f8d9d61c.jpg";
const refPath = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/.user_uploaded/media_1794345408219_5efc1ec4.jpg";

// First, run python helper to prepare high-quality composited background buffers
const pyScript = `
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import sys

beach = Image.open("${beachPath}").convert("RGBA")
ref = Image.open("${refPath}").convert("RGBA")

# 1. PANORAMIC BASE (1920 x 600)
W_pano, H_pano = 1920, 600
# Crop beach to focus on emerald sea + cliffs
crop_top = int(beach.height * 0.12)
crop_bottom = int(beach.height * 0.88)
beach_pano = beach.crop((0, crop_top, beach.width, crop_bottom)).resize((W_pano, H_pano), Image.Resampling.LANCZOS)

# Enhance saturation and contrast for tropical Bahia vibes
beach_pano = ImageEnhance.Color(beach_pano.convert("RGB")).enhance(1.25).convert("RGBA")
beach_pano = ImageEnhance.Contrast(beach_pano.convert("RGB")).enhance(1.10).convert("RGBA")

# Extract athletes from ref
ref_w, ref_h = ref.size
athletes = ref.crop((0, 0, int(ref_w * 0.32), ref_h))
scale_pano = H_pano / athletes.height
ath_w_pano = int(athletes.width * scale_pano)
athletes_pano = athletes.resize((ath_w_pano, H_pano), Image.Resampling.LANCZOS)

# Feather mask on athletes right side
mask_pano = Image.new("L", (ath_w_pano, H_pano), 255)
draw_mask = ImageDraw.Draw(mask_pano)
start_blend = int(ath_w_pano * 0.60)
for x in range(start_blend, ath_w_pano):
    alpha = int(255 * (1 - (x - start_blend) / (ath_w_pano - start_blend)))
    draw_mask.line([(x, 0), (x, H_pano)], fill=alpha)
athletes_pano.putalpha(mask_pano)

pano_base = Image.new("RGBA", (W_pano, H_pano), (0, 0, 0, 255))
pano_base.paste(beach_pano, (0, 0))
pano_base.paste(athletes_pano, (0, 0), athletes_pano)

# Vignette overlays
vignette = Image.new("RGBA", (W_pano, H_pano), (0, 0, 0, 0))
draw_v = ImageDraw.Draw(vignette)
for y in range(130):
    op = int(140 * (1 - y / 130))
    draw_v.line([(0, y), (W_pano, y)], fill=(3, 10, 20, op))
for y in range(H_pano - 140, H_pano):
    op = int(180 * ((y - (H_pano - 140)) / 140))
    draw_v.line([(0, y), (W_pano, y)], fill=(3, 10, 20, op))
pano_base = Image.alpha_composite(pano_base, vignette)
pano_base.save("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/pano_base.png")

# 2. CARD BASE (1200 x 675, 16:9)
W_card, H_card = 1200, 675
# Center crop beach
beach_card = beach.crop((0, int(beach.height * 0.05), beach.width, int(beach.height * 0.95))).resize((W_card, H_card), Image.Resampling.LANCZOS)
beach_card = ImageEnhance.Color(beach_card.convert("RGB")).enhance(1.25).convert("RGBA")
beach_card = ImageEnhance.Contrast(beach_card.convert("RGB")).enhance(1.10).convert("RGBA")

# Position athletes on the left of card
scale_card = H_card / athletes.height
ath_w_card = int(athletes.width * scale_card)
athletes_card = athletes.resize((ath_w_card, H_card), Image.Resampling.LANCZOS)

mask_card = Image.new("L", (ath_w_card, H_card), 255)
draw_mask_c = ImageDraw.Draw(mask_card)
start_blend_c = int(ath_w_card * 0.55)
for x in range(start_blend_c, ath_w_card):
    alpha = int(255 * (1 - (x - start_blend_c) / (ath_w_card - start_blend_c)))
    draw_mask_c.line([(x, 0), (x, H_card)], fill=alpha)
athletes_card.putalpha(mask_card)

card_base = Image.new("RGBA", (W_card, H_card), (0, 0, 0, 255))
card_base.paste(beach_card, (0, 0))
card_base.paste(athletes_card, (0, 0), athletes_card)

# Dark gradient for card readability
vignette_card = Image.new("RGBA", (W_card, H_card), (0, 0, 0, 0))
draw_vc = ImageDraw.Draw(vignette_card)
for y in range(120):
    op = int(120 * (1 - y / 120))
    draw_vc.line([(0, y), (W_card, y)], fill=(3, 10, 20, op))
for y in range(H_card - 160, H_card):
    op = int(190 * ((y - (H_card - 160)) / 160))
    draw_vc.line([(0, y), (W_card, y)], fill=(3, 10, 20, op))
card_base = Image.alpha_composite(card_base, vignette_card)
card_base.save("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/card_base.png")
print("Bases generated successfully.")
`;

writeFileSync("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/generate_bases.py", pyScript);
execSync('python "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/generate_bases.py"', { stdio: "inherit" });

// SVG OVERLAY FOR PANORAMIC BANNER (1920 x 600)
// Safe area vertical: Y=160 to Y=440
const panoSvg = `
<svg width="1920" height="600" viewBox="0 0 1920 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente Dourado Metálico -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="25%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="75%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#92400E" />
    </linearGradient>

    <!-- Gradiente Dourado Horizontal -->
    <linearGradient id="goldH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <!-- Sombra de Texto Profunda -->
    <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.9" />
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.9" />
    </filter>

    <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- ================= TOP HEADER ================= -->
  <!-- Top Center Tag -->
  <text x="1200" y="70" font-family="'Segoe UI', -apple-system, sans-serif" font-size="13" font-weight="800" fill="#FDE047" letter-spacing="4" text-anchor="middle" filter="url(#heroShadow)">
    #CIRCUITORANKFTV  IN  ARRAIAL  D'AJUDA
  </text>

  <!-- Top Right Location Badge -->
  <g transform="translate(1620, 48)" filter="url(#badgeShadow)">
    <rect x="0" y="0" width="240" height="34" rx="17" fill="#0F172A" fill-opacity="0.75" stroke="#F59E0B" stroke-width="1.5" />
    <circle cx="18" cy="17" r="4" fill="#F59E0B" />
    <text x="32" y="22" font-family="'Segoe UI', -apple-system, sans-serif" font-size="11" font-weight="800" fill="#FFFFFF" letter-spacing="2">
      PRAIA DA PITINGA • BA
    </text>
  </g>

  <!-- ================= HERO TEXT (Center-Right: X=1200) ================= -->
  <!-- Date: 09 A 10 DE NOVEMBRO -->
  <g transform="translate(1200, 215)" filter="url(#heroShadow)">
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="10" text-anchor="middle">
      0 9   A   1 0   D E   N O V E M B R O
    </text>
  </g>

  <!-- Main Headline: ARRAIAL D'AJUDA (Widescreen Hero Font) -->
  <g transform="translate(1200, 310)" filter="url(#heroShadow)">
    <!-- Outline/glow effect behind -->
    <text x="0" y="0" font-family="'Arial Black', Impact, sans-serif" font-size="82" font-weight="900" fill="#000000" stroke="#000000" stroke-width="8" letter-spacing="6" text-anchor="middle">
      ARRAIAL D'AJUDA
    </text>
    <text x="0" y="0" font-family="'Arial Black', Impact, sans-serif" font-size="82" font-weight="900" fill="#FFFFFF" letter-spacing="6" text-anchor="middle">
      ARRAIAL D'AJUDA
    </text>
  </g>

  <!-- Sub-Headline: BAHIA in Gold -->
  <g transform="translate(1200, 385)" filter="url(#heroShadow)">
    <!-- Lines beside BAHIA -->
    <line x1="-360" y1="-12" x2="-140" y2="-12" stroke="url(#goldH)" stroke-width="3" />
    <line x1="140" y1="-12" x2="360" y2="-12" stroke="url(#goldH)" stroke-width="3" />

    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="34" font-weight="900" fill="url(#goldGrad)" letter-spacing="20" text-anchor="middle">
      B A H I A
    </text>
  </g>

  <!-- Category & Subtitle -->
  <g transform="translate(1200, 428)" filter="url(#heroShadow)">
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="14" font-weight="800" fill="#FEF08A" letter-spacing="4" text-anchor="middle">
      CIRCUITO RANKFTV OPEN PRO 2026 • 4 CATEGORIAS
    </text>
  </g>

  <!-- ================= BOTTOM SPONSORS & SEALS BAR (Y = 530..570) ================= -->
  <!-- Finals text -->
  <g transform="translate(1200, 520)" filter="url(#heroShadow)">
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="12" font-weight="800" fill="#E2E8F0" letter-spacing="6" text-anchor="middle">
      T H E   F I N A L S   A R R A I A L   D ' A J U D A   2 0 2 6
    </text>
  </g>

  <!-- Sponsor tags / seals -->
  <g transform="translate(1200, 565)" filter="url(#heroShadow)">
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="12" font-weight="800" fill="#CBD5E1" letter-spacing="5" text-anchor="middle">
      ATHLETA   •   7POKER   •   NAREDINHA   •   RANKFTV PRO   •   CBFv OFICIAL
    </text>
  </g>

  <!-- Official Prize Badge (Bottom Right) -->
  <g transform="translate(1620, 525)" filter="url(#badgeShadow)">
    <rect x="0" y="0" width="240" height="42" rx="10" fill="#0F172A" fill-opacity="0.85" stroke="#F59E0B" stroke-width="1.5" />
    <text x="120" y="18" font-family="'Segoe UI', -apple-system, sans-serif" font-size="9" font-weight="800" fill="#FACC15" letter-spacing="2" text-anchor="middle">
      PREMIAÇÃO TOTAL
    </text>
    <text x="120" y="34" font-family="'Segoe UI', -apple-system, sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" letter-spacing="1" text-anchor="middle">
      R$ 30.000,00
    </text>
  </g>
</svg>
`;

// SVG OVERLAY FOR CARD BANNER (1200 x 675, 16:9)
// Safe Area: Top-left has "NOV 9", top-right has "AO VIVO", bottom-left has "Inscrição aberta"
const cardSvg = `
<svg width="1200" height="675" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradC" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="30%" stop-color="#FDE047" />
      <stop offset="70%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <linearGradient id="goldHC" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <filter id="heroShadowC" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000000" flood-opacity="0.9" />
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.9" />
    </filter>
  </defs>

  <!-- Tag top center -->
  <text x="750" y="80" font-family="'Segoe UI', -apple-system, sans-serif" font-size="12" font-weight="800" fill="#FDE047" letter-spacing="3" text-anchor="middle" filter="url(#heroShadowC)">
    CIRCUITO RANKFTV OPEN PRO
  </text>

  <!-- Date -->
  <text x="750" y="240" font-family="'Segoe UI', -apple-system, sans-serif" font-size="16" font-weight="900" fill="#FFFFFF" letter-spacing="7" text-anchor="middle" filter="url(#heroShadowC)">
    0 9   A   1 0   D E   N O V E M B R O
  </text>

  <!-- Main Headline: ARRAIAL D'AJUDA -->
  <g transform="translate(750, 335)" filter="url(#heroShadowC)">
    <text x="0" y="0" font-family="'Arial Black', Impact, sans-serif" font-size="64" font-weight="900" fill="#000000" stroke="#000000" stroke-width="7" letter-spacing="4" text-anchor="middle">
      ARRAIAL D'AJUDA
    </text>
    <text x="0" y="0" font-family="'Arial Black', Impact, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="4" text-anchor="middle">
      ARRAIAL D'AJUDA
    </text>
  </g>

  <!-- Subtitle: BAHIA in gold -->
  <g transform="translate(750, 405)" filter="url(#heroShadowC)">
    <line x1="-280" y1="-10" x2="-110" y2="-10" stroke="url(#goldHC)" stroke-width="2.5" />
    <line x1="110" y1="-10" x2="280" y2="-10" stroke="url(#goldHC)" stroke-width="2.5" />
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="28" font-weight="900" fill="url(#goldGradC)" letter-spacing="16" text-anchor="middle">
      B A H I A
    </text>
  </g>

  <!-- Location & Prize in safe bottom-right -->
  <g transform="translate(750, 455)" filter="url(#heroShadowC)">
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="14" font-weight="800" fill="#F1F5F9" letter-spacing="3" text-anchor="middle">
      PRAIA DA PITINGA • 4 CATEGORIAS • R$ 30.000 EM PRÊMIOS
    </text>
  </g>

  <!-- Bottom Seals -->
  <g transform="translate(750, 615)" filter="url(#heroShadowC)">
    <text x="0" y="0" font-family="'Segoe UI', -apple-system, sans-serif" font-size="11" font-weight="800" fill="#CBD5E1" letter-spacing="4" text-anchor="middle">
      ATHLETA  •  7POKER  •  NAREDINHA  •  CBFv
    </text>
  </g>
</svg>
`;

// Composite with Sharp
console.log("Compositing Panoramic Banner (1920x600)...");
const panoBaseBuf = readFileSync("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/pano_base.png");
await sharp(panoBaseBuf)
  .composite([{ input: Buffer.from(panoSvg), top: 0, left: 0 }])
  .png({ quality: 95, compressionLevel: 8 })
  .toFile("public/banners/circuito-rankftv-pitinga.png");

console.log("Compositing Card Banner (1200x675)...");
const cardBaseBuf = readFileSync("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/card_base.png");
await sharp(cardBaseBuf)
  .composite([{ input: Buffer.from(cardSvg), top: 0, left: 0 }])
  .png({ quality: 95, compressionLevel: 8 })
  .toFile("public/banners/circuito-rankftv-pitinga-card.png");

// Also copy to brain artifacts for easy inspection
await sharp("public/banners/circuito-rankftv-pitinga.png")
  .toFile("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/circuito-rankftv-pitinga.png");
await sharp("public/banners/circuito-rankftv-pitinga-card.png")
  .toFile("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/circuito-rankftv-pitinga-card.png");

console.log("All banners generated and saved to public/banners/ successfully!");
