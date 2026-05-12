type CalloutType = "info" | "tip" | "warning" | "danger";

const STYLES: Record<CalloutType, { container: string; label: string }> = {
  info: {
    container: "border-blue-200 bg-blue-50",
    label: "text-blue-900",
  },
  tip: {
    container: "border-teal-200 bg-teal-50",
    label: "text-teal-900",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    label: "text-amber-900",
  },
  danger: {
    container: "border-red-200 bg-red-50",
    label: "text-red-900",
  },
};

const LABELS: Record<CalloutType, string> = {
  info: "Info",
  tip: "Astuce",
  warning: "Attention",
  danger: "Important",
};

type Props = {
  type?: CalloutType;
  children: React.ReactNode;
};

export function Callout({ type = "tip", children }: Props) {
  const styles = STYLES[type];
  return (
    <div className={`my-6 rounded-lg border p-4 ${styles.container}`}>
      <p
        className={`mb-2 text-xs font-semibold uppercase tracking-wider ${styles.label}`}
      >
        {LABELS[type]}
      </p>
      <div className="text-sm text-zinc-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}