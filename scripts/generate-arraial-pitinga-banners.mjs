import sharp from "sharp";

const srcPano = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/arraial_clean_panoramic_1794350107833.jpg";
const srcCard = "C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/arraial_clean_card_1794350203382.jpg";

const metaP = await sharp(srcPano).metadata();
const targetH = Math.round((metaP.width * 5) / 16);
const topOffset = Math.round((metaP.height - targetH) * 0.47);

const svgPatch = `
<svg width="1920" height="600" viewBox="0 0 1920 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#031822" flood-opacity="0.75" />
    </filter>
  </defs>

  <!-- Fix shield text to crisp RANKFTV -->
  <rect x="676" y="91" width="70" height="17" rx="2" fill="#0E2225" />
  <text x="711" y="104" font-family="'Segoe UI', Arial, sans-serif" font-size="12.5" font-weight="900" fill="#F8FAFC" letter-spacing="0.8" text-anchor="middle">
    RANKFTV
  </text>

  <!-- Golden tag text floating directly over the ocean (like the Itacare reference, no box!) -->
  <text x="1150" y="128" font-family="'Segoe UI', Arial, sans-serif" font-size="18" font-weight="800" fill="#F7C95C" letter-spacing="4" text-anchor="middle" filter="url(#textGlow)">
    #CIRCUITORANKFTV  •  PRAIA DA PITINGA
  </text>
</svg>
`;

const panoBuffer = await sharp(srcPano)
  .extract({ left: 0, top: topOffset, width: metaP.width, height: targetH })
  .resize(1920, 600)
  .composite([{ input: Buffer.from(svgPatch), top: 0, left: 0 }])
  .png({ quality: 95, compressionLevel: 8 })
  .toBuffer();

await sharp(panoBuffer).toFile("public/banners/circuito-rankftv-pitinga.png");
await sharp(panoBuffer).toFile("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/final-clean-panoramic-1920x600.png");

const cardBuffer = await sharp(srcCard)
  .resize(1200, 675)
  .png({ quality: 95, compressionLevel: 8 })
  .toBuffer();

await sharp(cardBuffer).toFile("public/banners/circuito-rankftv-pitinga-card.png");
await sharp(cardBuffer).toFile("C:/Users/SnyX/.gemini/antigravity/brain/85c7a19a-a6b5-498e-b87e-814c299b39a0/final-clean-card-1200x675.png");

console.log("Clean sponsor-free banners updated!");
