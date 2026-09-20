import { cn } from "@/lib/utils";

/**
 * Plain presentational states. They live apart from meta.tsx because that module reads the
 * dictionary (server-only), and client components render these too.
 */

export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={cn("border-border bg-muted border-l-4 px-4 py-3", className)}>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-muted-foreground mt-1">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="border-destructive bg-muted border-l-4 px-4 py-3">
      <p className="text-fall font-semibold">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
