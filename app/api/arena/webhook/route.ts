// Legacy endpoint kept for existing Asaas configuration. Both webhook URLs
// execute the same validated, idempotent ledger and domain handler.
export { POST } from "@/app/api/webhooks/asaas/route";
