import { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="
        relative overflow-hidden rounded-2xl border border-pulse-cyan-500/25 bg-nebula-800/85 p-5 shadow-md backdrop-blur-sm
        before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-pulse-cyan-500/5 before:via-transparent before:to-stellar-purple-500/5
        [&_.border-slate-200]:border-nebula-500/80
        [&_.border-slate-300]:border-nebula-400/80
        [&_.bg-slate-100]:bg-nebula-900/80
        [&_.bg-white]:bg-nebula-900/70
        [&_.text-slate-900]:text-tech-white
        [&_.text-slate-800]:text-tech-white
        [&_.text-slate-700]:text-slate-200
        [&_.text-slate-600]:text-slate-300
        [&_.text-slate-500]:text-slate-400
        [&_input]:border-nebula-400/80 [&_input]:bg-nebula-900/80 [&_input]:text-tech-white
        [&_input]:placeholder:text-slate-400 [&_textarea]:border-nebula-400/80 [&_textarea]:bg-nebula-900/80
        [&_textarea]:text-tech-white [&_textarea]:placeholder:text-slate-400 [&_select]:border-nebula-400/80
        [&_select]:bg-nebula-900/80 [&_select]:text-tech-white
      "
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-tech-white">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}
