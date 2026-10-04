import { cn } from "@/lib/utils";

/** The title + description + optional action bar every /app list page opens with. */
export function PageHeader({
  title,
  description,
  action,
  dataTour,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  dataTour?: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4" data-tour={dataTour}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** The "nothing here" state shared by every list page. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border px-6 py-16 text-center", className)}>
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
