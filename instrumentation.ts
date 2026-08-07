import type { Instrumentation } from "next";
import { reportOperationalEvent } from "@/lib/observability";

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const requestIdValue = request.headers["x-request-id"];
  const requestId = Array.isArray(requestIdValue) ? requestIdValue[0] : requestIdValue;
  await reportOperationalEvent({
    level: "error",
    event: "next.request_error",
    message: "Unhandled server request error",
    requestId,
    error,
    context: {
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
  });
};
