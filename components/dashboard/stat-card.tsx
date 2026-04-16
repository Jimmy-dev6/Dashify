export function StatCard({
  title,
  value,
  icon,
  iconClassName,
  hint,
  trend,
}: {
  title: string;
  value: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  hint?: string;
  trend?: { label: string; positive?: boolean };
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white">
            {value}
          </p>
        </div>
        {icon && (
          <div
            className={
              iconClassName ??
              "rounded-lg bg-teal-500/10 p-2 text-teal-400 ring-1 ring-teal-500/20"
            }
            aria-hidden
          >
            {icon}
          </div>
        )}
      </div>
      {(hint || trend) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span
              className={
                trend.positive !== false
                  ? "font-medium text-emerald-400"
                  : "font-medium text-amber-400"
              }
            >
              {trend.label}
            </span>
          )}
          {hint && (
            <span className="text-gray-400">{hint}</span>
          )}
        </div>
      )}
    </div>
  );
}
