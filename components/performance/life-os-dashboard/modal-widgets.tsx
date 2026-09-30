"use client";

import { PerfilEditor } from "@/components/performance/PerfilEditor";
import { AcademyDashboardWidget, FinanceDashboardWidget, StudyDashboardWidget } from "@/components/performance/DashboardMetricWidgets";
import { LifeOSProps } from "./types";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-white/10 bg-[#15191f] p-5 text-white shadow-2xl [&_.border-gray-100]:!border-white/10 [&_.bg-gray-100]:!bg-white/10 [&_.text-gray-400]:!text-white/35 [&_.text-gray-500]:!text-white/45 [&_.text-gray-600]:!text-white/60 [&_.text-gray-700]:!text-white/70">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-white/45 hover:bg-white/10 hover:text-white"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function LifeOSWidgets(props: LifeOSProps) {
  const academy = props.activities.filter(
    (item) => item.area === "academia" && item.status === "completed",
  );
  const studies = props.activities.filter(
    (item) => item.area === "estudos" && item.status === "completed",
  );
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <AcademyDashboardWidget
        activities={academy}
        today={props.today}
        weights={props.weights}
      />
      <FinanceDashboardWidget
        contributions={props.contributions}
        snapshots={props.snapshots}
        withdrawals={props.withdrawals}
        dataReady={!props.investmentMovementsLoadError}
      />
      <div className="sm:col-span-2">
        <StudyDashboardWidget
          roadmap={props.studyRoadmap}
          items={props.studyItems}
          modules={props.studyModules}
          activities={studies}
          monday={props.monday}
          today={props.today}
        />
      </div>
    </section>
  );
}

export function SettingsView(props: LifeOSProps) {
  return (
    <PerfilEditor
      userId={props.userId}
      nome={props.nome}
      email={props.email}
      telefone={props.telefone}
      dataNascimento={props.dataNascimento}
      fotoUrl={props.fotoUrl}
    />
  );
}
