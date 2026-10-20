export type UploadMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type UploadValidation =
  | { ok: true; mimeType: UploadMime; size: number }
  | { ok: false; reason: "empty" | "too_large" | "unknown_signature" | "mime_mismatch" | "malformed_structure" };

function bytesStart(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function detectMime(bytes: Uint8Array): UploadMime | null {
  if (bytesStart(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesStart(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

function structurallyValid(bytes: Uint8Array, mime: UploadMime): boolean {
  if (mime === "image/png") {
    const tail = bytes.subarray(Math.max(0, bytes.length - 12));
    return bytes.length >= 45 && String.fromCharCode(...tail.subarray(tail.length - 8, tail.length - 4)) === "IEND";
  }
  if (mime === "image/jpeg") return bytes.length >= 12 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (mime === "image/webp") return bytes.length >= 20 && !bytes.subarray(12, 16).every((byte) => byte === 0);
  const pdf = new TextDecoder("latin1").decode(bytes);
  return bytes.length >= 16 && /%%EOF\s*$/.test(pdf);
}

export function validateUploadBytes(bytes: Uint8Array, declaredMime: string, maxBytes: number): UploadValidation {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > maxBytes) return { ok: false, reason: "too_large" };
  const mimeType = detectMime(bytes);
  if (!mimeType) return { ok: false, reason: "unknown_signature" };
  if (mimeType !== declaredMime) return { ok: false, reason: "mime_mismatch" };
  if (!structurallyValid(bytes, mimeType)) return { ok: false, reason: "malformed_structure" };
  return { ok: true, mimeType, size: bytes.byteLength };
}
