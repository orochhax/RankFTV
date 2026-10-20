/** Reads request bytes with a hard cap, including chunked requests without Content-Length. */
export async function readBoundedRequestBody(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/** Rejects malformed/oversized declared lengths without requiring the header. */
export function hasInvalidContentLength(request: Request, maxBytes: number): boolean {
  const declared = request.headers.get("content-length");
  if (declared === null) return false;
  const parsed = Number(declared);
  return !Number.isSafeInteger(parsed) || parsed < 0 || parsed > maxBytes;
}
