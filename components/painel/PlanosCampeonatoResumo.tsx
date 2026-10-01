import { Check, Crown, CreditCard, QrCode, Trophy, Wallet } from "lucide-react";

const BENEFICIOS_PADRAO = [
  { icon: CreditCard, label: "Inscrições online com Pix e cartão no checkout hospedado" },
  { icon: Trophy, label: "Chaveamento e resultados ao vivo para o público" },
  { icon: QrCode, label: "Credencial e check-in por QR Code" },
  { icon: Wallet, label: "Financeiro, comunicação com inscritos e gestão de camisas" },
];

export function PlanosCampeonatoResumo({ elite }: { elite: boolean }) {
  return (
    <section aria-labelledby="planos-do-evento" className="space-y-3 pt-2">
      <div>
        <h2 id="planos-do-evento" className="text-base font-bold text-ink">Planos do evento</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Você escolheu o plano {elite ? "Elite" : "Padrão"}. A publicação continua sendo o próximo passo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card-lg bg-surface p-4 ring-1 ring-border">
          <p className="text-sm font-bold text-ink">Padrão</p>
          <p className="mt-1 text-xs text-ink-muted">R$ 0 para criar o evento.</p>
          <ul className="mt-3 space-y-2">
            {BENEFICIOS_PADRAO.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-2 text-xs text-ink-muted">
                <Icon className="mt-0.5 size-3.5 shrink-0 text-blue-600" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`rounded-card-lg p-4 ring-1 ${elite ? "bg-amber-50 ring-amber-300" : "bg-surface ring-border"}`}>
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-amber-600" />
            <p className="text-sm font-bold text-ink">Elite</p>
            {elite && <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Selecionado</span>}
          </div>
          <p className="mt-1 text-xs text-ink-muted">Ativação de R$ 178 abatida das vendas do evento.</p>
          <ul className="mt-3 space-y-2 text-xs text-ink-muted">
            <li className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-amber-600" /><span>Tudo do plano Padrão.</span></li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-amber-600" /><span>Taxa de serviço menor para o comprador: 7% no Pix e 9% no cartão (Padrão: 8% e 10%).</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
