import { AlertTriangle, ArrowLeft, CheckCircle2, MailWarning, RefreshCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCeoUser, loadOperationalAlertsAdminData } from "@/lib/operational-alerts-admin";
import { resolverAlerta, salvarConfiguracaoAlertas, verificarAlertas } from "./actions";

const ALERT_TOGGLES = [
  ["enabled", "Alertas ativos"],
  ["payment_pending_enabled", "Pagamento pendente"],
  ["webhook_failed_enabled", "Webhook/processamento falho"],
  ["assisted_refund_enabled", "Reembolso assistido"],
  ["payout_rejected_enabled", "Repasse recusado"],
  ["email_queue_enabled", "Fila e falha definitiva de e-mail"],
] as const;

type AlertRow = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  entity_type: string;
  entity_id: string;
  detected_at: string;
};

export default async function OperationalAlertsPage() {
  if (!(await currentCeoUser())) redirect("/");
  const { settings, alerts } = await loadOperationalAlertsAdminData();
  const emailAlerts = alerts.filter((alert) =>
    alert.kind === "email_queue_backlog" || alert.kind === "email_delivery_failed");

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="size-4" />Painel admin
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Alertas operacionais</h1>
        <p className="text-sm text-gray-500">
          Pagamentos parados, falhas financeiras, reembolsos, repasses e filas de e-mail.
        </p>
      </div>

      <form action={salvarConfiguracaoAlertas} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-semibold text-gray-900">Configuração</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {ALERT_TOGGLES.map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name={name} defaultChecked={Boolean(settings?.[name])} />
              {label}
            </label>
          ))}
          <NumberSetting
            label="Minutos para considerar pagamento pendente"
            name="payment_pending_minutes"
            value={settings?.payment_pending_minutes ?? 30}
            min={5}
            max={1440}
          />
          <NumberSetting
            label="Minutos para considerar e-mail atrasado"
            name="email_queue_minutes"
            value={settings?.email_queue_minutes ?? 15}
            min={5}
            max={1440}
          />
          <NumberSetting
            label="Quantidade mínima para alertar fila acumulada"
            name="email_queue_backlog_threshold"
            value={settings?.email_queue_backlog_threshold ?? 10}
            min={1}
            max={500}
          />
        </div>
        <button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          Salvar configuração
        </button>
      </form>

      <EmailContingency count={emailAlerts.length} />

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Abertos ({alerts.length})</h2>
        <form action={verificarAlertas}>
          <button className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
            <RefreshCw className="size-4" />Verificar agora
          </button>
        </form>
      </div>

      <AlertList alerts={alerts as AlertRow[]} />
    </div>
  );
}

function EmailContingency({ count }: { count: number }) {
  const message = count === 0
    ? "Nenhuma fila acumulada ou entrega definitiva falhou."
    : `${count} alerta(s) de e-mail exigem análise. Use o identificador abaixo para localizar a entrega e executar uma retentativa segura.`;
  return (
    <section className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 size-5 text-blue-700" />
        <div>
          <h2 className="font-semibold text-blue-950">Contingência de e-mail</h2>
          <p className="mt-1 text-sm text-blue-800">{message}</p>
        </div>
      </div>
    </section>
  );
}

function AlertList({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) {
    return <p className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-800">Nenhum alerta aberto.</p>;
  }
  return <div className="space-y-3">{alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}</div>;
}

function AlertCard({ alert }: { alert: AlertRow }) {
  const critical = alert.severity === "critical";
  return (
    <article className={`rounded-2xl bg-white p-4 ring-1 ${critical ? "ring-red-200" : "ring-amber-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <AlertTriangle className={`size-4 ${critical ? "text-red-600" : "text-amber-600"}`} />
            {alert.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {alert.entity_type} · {alert.entity_id.slice(0, 24)} · {new Date(alert.detected_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <form action={resolverAlerta}>
          <input type="hidden" name="id" value={alert.id} />
          <button className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" />Resolver
          </button>
        </form>
      </div>
    </article>
  );
}

function NumberSetting({
  label,
  name,
  value,
  min,
  max,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
}) {
  return (
    <label className="text-sm text-gray-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        name={name}
        defaultValue={value}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
      />
    </label>
  );
}
