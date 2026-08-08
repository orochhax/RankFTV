import { ArrowRight, Database, Map, RefreshCw } from "lucide-react";
import {
  primaryButtonClass,
  secondaryButtonClass,
  Surface,
} from "@/components/performance/investments/ui";

export function InvestmentRouteSetupState({
  schemaReady,
  hasSnapshot,
  onCreatePlan,
  onCheckin,
}: {
  schemaReady: boolean;
  hasSnapshot: boolean;
  onCreatePlan: () => void;
  onCheckin: () => void;
}) {
  if (!schemaReady)
    return (
      <Surface className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-200">
            <Database className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Estrutura ainda não instalada</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              A estrutura da Carteira em Rota ainda não foi instalada neste
              ambiente. Seus check-ins e movimentações existentes continuam
              disponíveis abaixo.
            </p>
          </div>
        </div>
      </Surface>
    );

  return (
    <Surface className="relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="relative flex max-w-3xl items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-blue-300/15 bg-blue-300/[0.08] text-blue-200">
          <Map className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300/70">
            Próximo passo
          </p>
          <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
            {hasSnapshot
              ? "Transforme seu histórico em uma rota"
              : "Defina seu destino e ponto de partida"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            {hasSnapshot
              ? "Você já acompanha sua carteira. Agora defina um destino para saber se seu ritmo está levando você até lá."
              : "O wizard pede o valor atual e salva o primeiro check-in junto com o plano, sem confundir aportes com patrimônio."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCreatePlan}
            className={primaryButtonClass}
          >
            Criar meu plano
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          {!hasSnapshot && (
            <button
              type="button"
              onClick={onCheckin}
              className={secondaryButtonClass}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Fazer check-in separadamente
            </button>
          )}
          </div>
        </div>
      </div>
    </Surface>
  );
}
