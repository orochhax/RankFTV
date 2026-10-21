import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasInvalidContentLength, readBoundedRequestBody } from "@/lib/bounded-request-body";
import { reportOperationalEvent } from "@/lib/observability";
import { validateUploadBytes } from "@/lib/upload-validation";

export const runtime = "nodejs";

// Keep the complete multipart request below the Vercel Function payload ceiling.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 128 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([supabase.auth.getUser(), getUserRole(supabase)]);
  if (!user || !isCeo(role)) return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  if (hasInvalidContentLength(request, MAX_REQUEST_BYTES)) {
    return NextResponse.json({ ok: false, error: "Anexo muito grande." }, { status: 413 });
  }

  const requestBytes = await readBoundedRequestBody(request, MAX_REQUEST_BYTES);
  if (requestBytes === null) return NextResponse.json({ ok: false, error: "Anexo muito grande." }, { status: 413 });
  if (requestBytes.length === 0) return NextResponse.json({ ok: false, error: "Anexo inválido." }, { status: 400 });

  let form: FormData;
  try {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    const formBody = new ArrayBuffer(requestBytes.byteLength);
    new Uint8Array(formBody).set(requestBytes);
    form = await new Request(request.url, { method: "POST", headers, body: formBody }).formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Anexo inválido." }, { status: 400 });
  }

  const caseId = form.get("caseId");
  const candidate = form.get("file");
  if (typeof caseId !== "string" || !UUID.test(caseId) || !(candidate instanceof File) || !MIME_TYPES.has(candidate.type)) {
    return NextResponse.json({ ok: false, error: "Anexo inválido." }, { status: 400 });
  }

  const bytes = new Uint8Array(await candidate.arrayBuffer());
  const validation = validateUploadBytes(bytes, candidate.type, MAX_FILE_BYTES);
  if (!validation.ok || validation.size !== candidate.size) {
    return NextResponse.json({ ok: false, error: "Anexo inválido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: supportCase, error: caseError } = await admin.from("support_cases").select("id").eq("id", caseId).maybeSingle();
  if (caseError || !supportCase) return NextResponse.json({ ok: false, error: "Caso de suporte inválido." }, { status: 404 });

  const extension = validation.mimeType === "application/pdf" ? "pdf" : validation.mimeType.split("/")[1];
  const path = `${caseId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from("support-attachments").upload(path, bytes, {
    contentType: validation.mimeType,
    upsert: false,
  });
  if (uploadError) {
    await reportOperationalEvent({
      level: "error",
      event: "support_attachment.upload_failed",
      message: "Support attachment could not be stored",
      error: uploadError,
    });
    return NextResponse.json({ ok: false, error: "Não foi possível salvar o anexo." }, { status: 500 });
  }

  const { error: recordError } = await admin.from("support_case_attachments").insert({
    case_id: caseId,
    storage_path: path,
    original_name: candidate.name.slice(0, 180),
    mime_type: validation.mimeType,
    size_bytes: validation.size,
    uploaded_by: user.id,
  });
  if (recordError) {
    await admin.storage.from("support-attachments").remove([path]);
    await reportOperationalEvent({
      level: "error",
      event: "support_attachment.record_failed",
      message: "Support attachment metadata could not be recorded",
      error: recordError,
    });
    return NextResponse.json({ ok: false, error: "Não foi possível registrar o anexo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
