interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeading({ eyebrow, title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <span className="inline-block text-[10px] font-semibold tracking-[0.12em] uppercase text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full mb-2">
            {eyebrow}
          </span>
        )}
        <h2 className="text-lg font-semibold text-slate-900 leading-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
