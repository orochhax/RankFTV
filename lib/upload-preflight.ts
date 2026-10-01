export const SAFE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type SafeImageMimeType = (typeof SAFE_IMAGE_MIME_TYPES)[number];
export type SafeImageExtension = "jpg" | "png" | "webp";

type UploadFile = Pick<Blob, "size" | "slice"> & Pick<File, "type">;

const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function detectSafeImageMimeType(bytes: Uint8Array): SafeImageMimeType | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) return "image/webp";

  return null;
}

function extensionFor(mimeType: SafeImageMimeType): SafeImageExtension {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

export async function validateImageUpload(
  file: UploadFile,
  maxBytes = MAX_IMAGE_UPLOAD_BYTES,
): Promise<{ ok: true; mimeType: SafeImageMimeType; extension: SafeImageExtension } | { ok: false; error: string }> {
  if (!SAFE_IMAGE_MIME_TYPES.includes(file.type as SafeImageMimeType)) {
    return { ok: false, error: "Envie uma imagem JPG, PNG ou WebP." };
  }

  if (file.size === 0 || file.size > maxBytes) {
    return { ok: false, error: `A imagem deve ter no máximo ${Math.floor(maxBytes / 1024 / 1024)} MB.` };
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedMimeType = detectSafeImageMimeType(bytes);

  if (!detectedMimeType || detectedMimeType !== file.type) {
    return { ok: false, error: "O conteúdo da imagem não corresponde ao formato informado." };
  }

  return { ok: true, mimeType: detectedMimeType, extension: extensionFor(detectedMimeType) };
}

export async function validatePdfUpload(
  file: UploadFile,
  maxBytes = MAX_PDF_UPLOAD_BYTES,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.type !== "application/pdf") {
    return { ok: false, error: "Envie um arquivo PDF." };
  }

  if (file.size === 0 || file.size > maxBytes) {
    return { ok: false, error: `O PDF deve ter no máximo ${Math.floor(maxBytes / 1024 / 1024)} MB.` };
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (!startsWith(header, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { ok: false, error: "O conteúdo do arquivo não corresponde a um PDF." };
  }

  return { ok: true };
}
