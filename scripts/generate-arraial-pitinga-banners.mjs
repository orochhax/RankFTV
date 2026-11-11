import sharp from "sharp";

const srcCard = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/arraial_clean_card_1794350203382.jpg";
const srcPano = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/arraial_clean_panoramic_1794350107833.jpg";
const outDir = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0";

// Load srcCard as raw RGBA buffer
const { data: cardRaw, info: cardInfo } = await sharp(srcCard)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const W = cardInfo.width; // 1376
const H = cardInfo.height; // 768
const buf = Buffer.from(cardRaw);

function idx(x, y) {
  const cx = Math.max(0, Math.min(W - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(H - 1, Math.round(y)));
  return (cy * W + cx) * 4;
}

// ============================================================================
// PART 1: EXTRACT TOP LOGO FOREGROUND (RANKFTV OPEN + #CIRCUITORANKFTV)
// ============================================================================
const logoX0 = 570;
const logoY0 = 34;
const logoW = 236;
const logoH = 186;
const logoRgba = Buffer.alloc(logoW * logoH * 4);
// Also create a version with ONLY "RANKFTV OPEN" + arch (without the small subtitle, or with it) for the square card
const logoMainH = 145; // y=34..179 is the arch + RANKFTV OPEN

for (let ly = 0; ly < logoH; ly++) {
  const y = logoY0 + ly;
  let rL = 0, gL = 0, bL = 0;
  for (let x = 545; x < 565; x++) {
    const p = idx(x, y);
    rL += cardRaw[p]; gL += cardRaw[p + 1]; bL += cardRaw[p + 2];
  }
  rL /= 20; gL /= 20; bL /= 20;

  let rR = 0, gR = 0, bR = 0;
  for (let x = 808; x < 820; x++) {
    const p = idx(x, y);
    rR += cardRaw[p]; gR += cardRaw[p + 1]; bR += cardRaw[p + 2];
  }
  rR /= 12; gR /= 12; bR /= 12;

  for (let lx = 0; lx < logoW; lx++) {
    const x = logoX0 + lx;
    const t = lx / (logoW - 1);
    const bgR = rL * (1 - t) + rR * t;
    const bgG = gL * (1 - t) + gR * t;
    const bgB = bL * (1 - t) + bR * t;

    const p = idx(x, y);
    const r = cardRaw[p];
    const g = cardRaw[p + 1];
    const b = cardRaw[p + 2];

    const dst = (ly * logoW + lx) * 4;
    // Remove tiny gibberish inside top arch
    if (x >= 674 && x <= 704 && y >= 59 && y <= 74) {
      logoRgba[dst + 3] = 0;
      continue;
    }
    // Remove ocean wave foam above the stadium arch roof line and beside the arch pillars
    const archRoofY = 6 + Math.abs(lx - 118) * 0.28;
    if (ly < archRoofY || (ly < 56 && (lx < 28 || lx > 208))) {
      logoRgba[dst + 3] = 0;
      continue;
    }

    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const brightDiff = Math.max(dr, (dr + dg + db) / 2.2);

    if (brightDiff > 10) {
      const alpha = Math.max(0, Math.min(1, (brightDiff - 8) / 145));
      const fgR = Math.min(255, Math.max(0, Math.round((r - bgR * (1 - alpha)) / Math.max(0.25, alpha))));
      const fgG = Math.min(255, Math.max(0, Math.round((g - bgG * (1 - alpha)) / Math.max(0.25, alpha))));
      const fgB = Math.min(255, Math.max(0, Math.round((b - bgB * (1 - alpha)) / Math.max(0.25, alpha))));
      logoRgba[dst] = fgR;
      logoRgba[dst + 1] = fgG;
      logoRgba[dst + 2] = fgB;
      logoRgba[dst + 3] = Math.round(Math.pow(alpha, 0.85) * 255);
    } else {
      logoRgba[dst + 3] = 0;
    }
  }
}

// ============================================================================
// PART 2: INPAINT TOP LOGO & BOTTOM TEXT IN `buf`
// ============================================================================
for (let y = 28; y <= 225; y++) {
  let rL = 0, gL = 0, bL = 0;
  for (let x = 548; x < 562; x++) {
    const p = idx(x, y);
    rL += cardRaw[p]; gL += cardRaw[p + 1]; bL += cardRaw[p + 2];
  }
  rL /= 14; gL /= 14; bL /= 14;

  let rR = 0, gR = 0, bR = 0;
  for (let x = 814; x < 826; x++) {
    const p = idx(x, y);
    rR += cardRaw[p]; gR += cardRaw[p + 1]; bR += cardRaw[p + 2];
  }
  rR /= 12; gR /= 12; bR /= 12;

  let rSrcMean = 0, gSrcMean = 0, bSrcMean = 0;
  for (let x = 415; x < 555; x++) {
    const p = idx(x, y);
    rSrcMean += cardRaw[p]; gSrcMean += cardRaw[p + 1]; bSrcMean += cardRaw[p + 2];
  }
  rSrcMean /= 140; gSrcMean /= 140; bSrcMean /= 140;

  for (let x = 562; x <= 814; x++) {
    const t = (x - 562) / (814 - 562);
    const edgeFeather = Math.min(1, (x - 562) / 12, (814 - x) / 12, (y - 28) / 8, (225 - y) / 8);

    const offset = (x - 562) % 260;
    const srcX = offset < 130 ? (555 - offset) : (425 + (offset - 130));
    const pSrc = idx(srcX, y);

    const targetR = rL * (1 - t) + rR * t;
    const targetG = gL * (1 - t) + gR * t;
    const targetB = bL * (1 - t) + bR * t;

    const detailR = (cardRaw[pSrc] - rSrcMean) * 0.65;
    const detailG = (cardRaw[pSrc + 1] - gSrcMean) * 0.65;
    const detailB = (cardRaw[pSrc + 2] - bSrcMean) * 0.65;

    const newR = Math.max(0, Math.min(255, Math.round(targetR + detailR)));
    const newG = Math.max(0, Math.min(255, Math.round(targetG + detailG)));
    const newB = Math.max(0, Math.min(255, Math.round(targetB + detailB)));

    const pDst = idx(x, y);
    buf[pDst] = Math.round(cardRaw[pDst] * (1 - edgeFeather) + newR * edgeFeather);
    buf[pDst + 1] = Math.round(cardRaw[pDst + 1] * (1 - edgeFeather) + newG * edgeFeather);
    buf[pDst + 2] = Math.round(cardRaw[pDst + 2] * (1 - edgeFeather) + newB * edgeFeather);
  }
}

// Inpaint bottom text (x: 245..1135, y: 698..736) using strictly clean pixels ABOVE (<=694) and BELOW (>=738)
const slope = 0.44;
for (let y = 698; y <= 736; y++) {
  const t = (y - 698) / (736 - 698);
  const edgeY = Math.min(1, (y - 698) / 5, (736 - y) / 5);
  // Strictly outside [698..736]:
  const yAbove = 695 - Math.round((y - 698) * 0.35);
  const yBelow = 739 + Math.round((736 - y) * 0.35);
  const dyAbove = y - yAbove;
  const dyBelow = yBelow - y;

  for (let x = 245; x <= 1135; x++) {
    const edgeX = Math.min(1, (x - 245) / 10, (1135 - x) / 10);
    const feather = edgeY * edgeX;

    const pAbove = idx(x - dyAbove * slope, yAbove);
    const pBelow = idx(x + dyBelow * slope, yBelow);

    const wBelow = Math.max(0, Math.min(1, (t - 0.15) / 0.7));
    const r = cardRaw[pAbove] * (1 - wBelow) + cardRaw[pBelow] * wBelow;
    const g = cardRaw[pAbove + 1] * (1 - wBelow) + cardRaw[pBelow + 1] * wBelow;
    const b = cardRaw[pAbove + 2] * (1 - wBelow) + cardRaw[pBelow + 2] * wBelow;

    const pDst = idx(x, y);
    buf[pDst] = Math.round(cardRaw[pDst] * (1 - feather) + r * feather);
    buf[pDst + 1] = Math.round(cardRaw[pDst + 1] * (1 - feather) + g * feather);
    buf[pDst + 2] = Math.round(cardRaw[pDst + 2] * (1 - feather) + b * feather);
  }
}

// Extract bottom text foreground (x: 248..1128, y: 703..730)
const btxtX0 = 248;
const btxtY0 = 703;
const btxtW = 880;
const btxtH = 28;
const btxtRgba = Buffer.alloc(btxtW * btxtH * 4);
const btxtShadow = Buffer.alloc(btxtW * btxtH * 4);

for (let ly = 0; ly < btxtH; ly++) {
  const y = btxtY0 + ly;
  for (let lx = 0; lx < btxtW; lx++) {
    const x = btxtX0 + lx;
    const pOrig = idx(x, y);
    const pInpaint = idx(x, y);
    const origLum = cardRaw[pOrig] * 0.35 + cardRaw[pOrig + 1] * 0.45 + cardRaw[pOrig + 2] * 0.2;
    const bgLum = buf[pInpaint] * 0.35 + buf[pInpaint + 1] * 0.45 + buf[pInpaint + 2] * 0.2;
    const diff = origLum - bgLum;
    const dst = (ly * btxtW + lx) * 4;
    if (diff > 14) {
      const alpha = Math.max(0, Math.min(1, (diff - 12) / Math.max(40, 235 - bgLum)));
      btxtRgba[dst] = 250;
      btxtRgba[dst + 1] = 252;
      btxtRgba[dst + 2] = 252;
      btxtRgba[dst + 3] = Math.round(Math.pow(alpha, 0.8) * 255);

      btxtShadow[dst] = 3;
      btxtShadow[dst + 1] = 28;
      btxtShadow[dst + 2] = 38;
      btxtShadow[dst + 3] = Math.round(Math.pow(alpha, 0.8) * 165);
    }
  }
}

// Scale top logo to 85% (201 x 158)
const scaledLogoW = Math.round(logoW * 0.85);
const scaledLogoH = Math.round(logoH * 0.85);
const scaledLogoPng = await sharp(logoRgba, {
  raw: { width: logoW, height: logoH, channels: 4 },
})
  .resize(scaledLogoW, scaledLogoH)
  .png()
  .toBuffer();

const { data: sLogoRaw } = await sharp(scaledLogoPng).raw().toBuffer({ resolveWithObject: true });
const shadowRaw = Buffer.alloc(scaledLogoW * scaledLogoH * 4);
for (let i = 0; i < sLogoRaw.length; i += 4) {
  shadowRaw[i] = 3;
  shadowRaw[i + 1] = 28;
  shadowRaw[i + 2] = 38;
  shadowRaw[i + 3] = Math.round(sLogoRaw[i + 3] * 0.55);
}
const shadowPng = await sharp(shadowRaw, {
  raw: { width: scaledLogoW, height: scaledLogoH, channels: 4 },
})
  .blur(3.5)
  .png()
  .toBuffer();

// Scale bottom text to 93% (818 x 26) so it fits cleanly to the right of the golden ring
const scaledBtxtW = Math.round(btxtW * 0.93);
const scaledBtxtH = Math.round(btxtH * 0.93);
const btxtPng = await sharp(btxtRgba, { raw: { width: btxtW, height: btxtH, channels: 4 } })
  .resize(scaledBtxtW, scaledBtxtH)
  .png()
  .toBuffer();
const btxtShadowPng = await sharp(btxtShadow, { raw: { width: btxtW, height: btxtH, channels: 4 } })
  .resize(scaledBtxtW, scaledBtxtH)
  .blur(2.5)
  .png()
  .toBuffer();

const newLogoLeft = Math.round(logoX0 + (logoW - scaledLogoW) / 2);
const newLogoTop = 86;
const newBtxtLeft = 295; // Shifted slightly right so it clears the lowest golden ring curve cleanly
const newBtxtTop = 668;

const adjustedCardBase = await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
  .composite([
    { input: shadowPng, left: newLogoLeft, top: newLogoTop + 2 },
    { input: scaledLogoPng, left: newLogoLeft, top: newLogoTop },
    { input: btxtShadowPng, left: newBtxtLeft, top: newBtxtTop + 2 },
    { input: btxtPng, left: newBtxtLeft, top: newBtxtTop },
  ])
  .png()
  .toBuffer();

// Upscale to 1920x1080 with crisp sharpening for both main banner and featured card
const fullHdBanner = await sharp(adjustedCardBase)
  .resize(1920, 1080, { kernel: sharp.kernel.lanczos3 })
  .sharpen({ sigma: 0.7 })
  .png({ quality: 95, compressionLevel: 8 })
  .toBuffer();

await sharp(fullHdBanner).toFile(`${outDir}/preview_adjusted_card.png`);
await sharp(fullHdBanner).toFile("public/banners/circuito-rankftv-arraial.png");
await sharp(fullHdBanner).toFile("public/banners/circuito-rankftv-arraial-card.png");
await sharp(fullHdBanner).toFile("public/banners/circuito-rankftv-pitinga.png");
await sharp(fullHdBanner).toFile("public/banners/circuito-rankftv-pitinga-card.png");

// ============================================================================
// PART 3: BUILD SQUARE CARD (1000 x 800) WITH ONLY "RANKFTV OPEN" LOGO
// ============================================================================
// Use srcPano (1376x768) right side where cliffs/beach are 100% text-free,
// and inpaint the ocean text region (x: 450..1165, y: 205..545) + top banner (x: 350..1030, y: 38..88)
// using the pristine turquoise ocean from y: 550..760!
const { data: panoRaw } = await sharp(srcPano)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const sqW = 860;
const sqH = 676; // 5:4 aspect ratio (matches ChampionshipCard ~235x176)
const cropX0 = 516; // 516..1376 (860px wide: left/center is turquoise ocean, right is Pitinga beach & cliffs)
const cropY0 = 92;  // 92..768 (676px tall: completely below the gold top bar in srcPano!)

const sqOrig = Buffer.alloc(sqW * sqH * 4);
for (let sy = 0; sy < sqH; sy++) {
  const y = cropY0 + sy;
  for (let sx = 0; sx < sqW; sx++) {
    const x = cropX0 + sx;
    const p = idx(x, y);
    const dst = (sy * sqW + sx) * 4;
    sqOrig[dst] = panoRaw[p];
    sqOrig[dst + 1] = panoRaw[p + 1];
    sqOrig[dst + 2] = panoRaw[p + 2];
    sqOrig[dst + 3] = 255;
  }
}
const sqBuf = Buffer.from(sqOrig);

// In `sqOrig`, let's check where the text/glow ring actually is:
// - For sy = 50..172 (y = 142..264): ONLY the glow ring + small badge on the left (sx = 0..170)! The cliffs & palms on the right (sx > 210) have ZERO text!
// - For sy = 172..242 (y = 264..334, "09 A 10 DE NOVEMBRO"): text goes up to sx = 570.
// - For sy = 242..478 (y = 334..570, "ARRAIAL D'AJUDA / BAHIA / ETAPA OFICIAL"): text goes up to sx = 665.
// Precompute mean ocean RGB at sy=90 (clean upper ocean, sx=20..220) and sy=505 (clean lower ocean, sx=40..540)
let rTopMean = 0, gTopMean = 0, bTopMean = 0;
for (let sx = 20; sx < 220; sx++) {
  const p = (90 * sqW + sx) * 4;
  rTopMean += sqOrig[p]; gTopMean += sqOrig[p + 1]; bTopMean += sqOrig[p + 2];
}
rTopMean /= 200; gTopMean /= 200; bTopMean /= 200;

let rBotMean = 0, gBotMean = 0, bBotMean = 0;
for (let sx = 40; sx < 540; sx++) {
  const p = (520 * sqW + sx) * 4;
  rBotMean += sqOrig[p]; gBotMean += sqOrig[p + 1]; bBotMean += sqOrig[p + 2];
}
rBotMean /= 500; gBotMean /= 500; bBotMean /= 500;

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// First, erase the top-left tip of the glow ring (sy=62..165, sx=0..115) using the clean ocean on the SAME scanline (sx=125..240)!
for (let sy = 62; sy <= 165; sy++) {
  const fy = smoothstep(Math.min(1, (sy - 62) / 10, (165 - sy) / 10));
  for (let sx = 0; sx <= 115; sx++) {
    const fx = smoothstep(Math.min(1, (115 - sx) / 20));
    const f = fy * fx;
    const pSrc = (sy * sqW + (230 - sx)) * 4;
    const pDst = (sy * sqW + sx) * 4;
    sqOrig[pDst] = Math.round(sqOrig[pDst] * (1 - f) + sqOrig[pSrc] * f);
    sqOrig[pDst + 1] = Math.round(sqOrig[pDst + 1] * (1 - f) + sqOrig[pSrc + 1] * f);
    sqOrig[pDst + 2] = Math.round(sqOrig[pDst + 2] * (1 - f) + sqOrig[pSrc + 2] * f);
    sqBuf[pDst] = sqOrig[pDst];
    sqBuf[pDst + 1] = sqOrig[pDst + 1];
    sqBuf[pDst + 2] = sqOrig[pDst + 2];
  }
}

// Start main ocean replacement at sy = 105 (well below the horizon!)
for (let sy = 105; sy <= 490; sy++) {
  let maxSx;
  if (sy < 158) {
    // Only the glow ring on the left (sx = 0..145)
    maxSx = 195;
  } else if (sy < 180) {
    const u = smoothstep((sy - 158) / 22);
    maxSx = Math.round(195 * (1 - u) + 595 * u);
  } else if (sy < 245) {
    const u = smoothstep((sy - 180) / 65);
    maxSx = Math.round(595 * (1 - u) + 715 * u);
  } else {
    const u = smoothstep((sy - 245) / 245);
    maxSx = Math.round(715 * (1 - u) + 760 * u);
  }

  const featherY = smoothstep(Math.min(1, (sy - 105) / 36, (490 - sy) / 28));
  const vRatio = smoothstep((sy - 105) / (490 - 105));

  // Target mean ocean color at this scanline `sy` (blending smoothly from upper blue-teal at sy=90 to lower turquoise at sy=490)
  const targetMeanR = rTopMean * (1 - vRatio) + rBotMean * vRatio;
  const targetMeanG = gTopMean * (1 - vRatio) + gBotMean * vRatio;
  const targetMeanB = bTopMean * (1 - vRatio) + bBotMean * vRatio;
  const shiftR = targetMeanR - rBotMean;
  const shiftG = targetMeanG - gBotMean;
  const shiftB = targetMeanB - bBotMean;

  for (let sx = 0; sx <= maxSx; sx++) {
    const featherX = smoothstep(Math.min(1, (maxSx - sx) / 60));
    const feather = featherY * featherX;
    if (feather <= 0) continue;

    // Sample clean ocean texture from the lower ocean (sy_src in 502..668) of immutable `sqOrig`
    const tileY = (sy - 90) % 320;
    const cleanSy = 502 + (tileY < 160 ? tileY : 320 - tileY);
    const tileX = sx % 540;
    const cleanSx = 40 + (tileX < 270 ? tileX : 540 - tileX);

    const pClean = (cleanSy * sqW + cleanSx) * 4;
    const r = Math.max(0, Math.min(255, Math.round(sqOrig[pClean] + shiftR)));
    const g = Math.max(0, Math.min(255, Math.round(sqOrig[pClean + 1] + shiftG)));
    const b = Math.max(0, Math.min(255, Math.round(sqOrig[pClean + 2] + shiftB)));

    const dst = (sy * sqW + sx) * 4;
    sqBuf[dst] = Math.round(sqOrig[dst] * (1 - feather) + r * feather);
    sqBuf[dst + 1] = Math.round(sqOrig[dst + 1] * (1 - feather) + g * feather);
    sqBuf[dst + 2] = Math.round(sqOrig[dst + 2] * (1 - feather) + b * feather);
  }
}

// Upscale the full "RANKFTV OPEN" + "#CIRCUITORANKFTV • PRAIA DA PITINGA" logo lockup to 440px wide
const sqLogoW = 440;
const sqLogoH = Math.round(logoH * (sqLogoW / logoW)); // ~346px
const sqLogoPng = await sharp(logoRgba, {
  raw: { width: logoW, height: logoH, channels: 4 },
})
  .resize(sqLogoW, sqLogoH, { kernel: sharp.kernel.lanczos3 })
  .sharpen({ sigma: 0.8 })
  .png()
  .toBuffer();

const { data: sqLogoRaw } = await sharp(sqLogoPng).raw().toBuffer({ resolveWithObject: true });
const sqShadowRaw = Buffer.alloc(sqLogoW * sqLogoH * 4);
for (let i = 0; i < sqLogoRaw.length; i += 4) {
  sqShadowRaw[i] = 2;
  sqShadowRaw[i + 1] = 22;
  sqShadowRaw[i + 2] = 32;
  sqShadowRaw[i + 3] = Math.round(sqLogoRaw[i + 3] * 0.72);
}
const sqShadowPng = await sharp(sqShadowRaw, {
  raw: { width: sqLogoW, height: sqLogoH, channels: 4 },
})
  .blur(6.5)
  .png()
  .toBuffer();

// Subtle dark-teal ambient glow behind the centered RANKFTV OPEN logo so it pops over the water & beach
const sqOverlaySvg = `
<svg width="1000" height="800" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#032836" stop-opacity="0.48" />
      <stop offset="65%" stop-color="#043545" stop-opacity="0.20" />
      <stop offset="100%" stop-color="#043545" stop-opacity="0" />
    </radialGradient>
  </defs>
  <ellipse cx="490" cy="410" rx="340" ry="250" fill="url(#centerGlow)" />
</svg>
`;

const sqLogoLeft = Math.round((1000 - sqLogoW) / 2) - 5;
const sqLogoTop = Math.round((800 - sqLogoH) / 2) + 8;

const squareCardPng = await sharp(sqBuf, { raw: { width: sqW, height: sqH, channels: 4 } })
  .resize(1000, 800, { kernel: sharp.kernel.lanczos3 })
  .composite([
    { input: Buffer.from(sqOverlaySvg), left: 0, top: 0 },
    { input: sqShadowPng, left: sqLogoLeft, top: sqLogoTop + 4 },
    { input: sqLogoPng, left: sqLogoLeft, top: sqLogoTop },
  ])
  .sharpen({ sigma: 0.6 })
  .png({ quality: 95, compressionLevel: 8 })
  .toBuffer();

await sharp(squareCardPng).toFile(`${outDir}/preview_square_card.png`);
await sharp(squareCardPng).toFile("public/banners/circuito-rankftv-arraial-square.png");
console.log("Saved all production banners and previews!");
