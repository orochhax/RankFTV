import assert from "node:assert/strict";
import test from "node:test";
import { hasInvalidContentLength, readBoundedRequestBody } from "./bounded-request-body";

test("reads bodies up to the exact byte limit", async () => {
  const request = new Request("https://rankftv.test/webhook", { method: "POST", body: "1234" });
  const bytes = await readBoundedRequestBody(request, 4);
  assert.equal(new TextDecoder().decode(bytes!), "1234");
});

test("rejects streamed bodies after crossing the byte limit", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("123"));
      controller.enqueue(new TextEncoder().encode("45"));
      controller.close();
    },
  });
  const request = new Request("https://rankftv.test/webhook", {
    method: "POST",
    body: stream,
    // Required by Node for a streaming request body; browsers do not expose it.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  assert.equal(await readBoundedRequestBody(request, 4), null);
});

test("accepts chunked requests and rejects invalid declared lengths", () => {
  assert.equal(hasInvalidContentLength(new Request("https://rankftv.test"), 10), false);
  assert.equal(hasInvalidContentLength(new Request("https://rankftv.test", { headers: { "content-length": "10" } }), 10), false);
  assert.equal(hasInvalidContentLength(new Request("https://rankftv.test", { headers: { "content-length": "11" } }), 10), true);
  assert.equal(hasInvalidContentLength(new Request("https://rankftv.test", { headers: { "content-length": "invalid" } }), 10), true);
});
